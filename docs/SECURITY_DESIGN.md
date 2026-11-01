# DropSecure Security Architecture & Zero-Trust Design

Security in DropSecure is built around modern cloud security standards: Principle of Least Privilege, Zero-Trust Storage, Network Segmentation, and Secure Credential Management.

---

## 1. Network Isolation & Security Groups

The AWS infrastructure follows a tiered architecture separating untrusted client traffic from sensitive persistence layers.

### Security Group Ingress / Egress Matrix

| Security Group | Inbound Rules | Outbound Rules | Purpose |
| :--- | :--- | :--- | :--- |
| **`sg_ec2_api`** | - Port 80 (HTTP) from `0.0.0.0/0`<br/>- Port 443 (HTTPS) from `0.0.0.0/0`<br/>- Port 22 (SSH) from `Admin-IP/32` ONLY | - Outbound 443 to `0.0.0.0/0` (AWS APIs)<br/>- Port 5432 to `sg_rds`<br/>- Port 80 to `0.0.0.0/0` (Package updates) | Shields the application server; eliminates wide-open SSH brute force vectors. |
| **`sg_rds_postgres`** | - Port 5432 from `sg_ec2_api`<br/>- Port 5432 from `sg_lambda_sweep`<br/>- **No public internet ingress (0.0.0.0/0 blocked)** | - None required | Isolates relational database in private subnets; prevents direct internet probing. |
| **`sg_lambda_sweep`** | - No inbound rules | - Port 5432 to `sg_rds`<br/>- Port 443 to VPC Endpoints / AWS APIs | Allows Lambda inside VPC to connect to RDS and invoke SNS. |

---

## 2. Secrets Management & Zero-Disk Credentials

- **No Secrets in Repositories or Filesystems**: Passwords and secrets are never committed to git or stored in plaintext `.env` files on production instances.
- **AWS Systems Manager (SSM) Parameter Store**:
  - Parameters: `/dropsecure/db/password` and `/dropsecure/jwt/secret` are encrypted using AWS Key Management Service (`alias/aws/ssm`).
  - Retrieval: EC2 bootstrap scripts and the Node.js application query the SSM API directly during service boot using IAM instance profile credentials.
  - Secret values reside solely in process memory and are zeroed out if the process terminates.

---

## 3. IAM Least Privilege Policies

Neither developer accounts nor server instances hold root or administrator privileges. Temporary credentials are provided dynamically via AWS Security Token Service (STS).

### EC2 Instance Role Permissions (`DropSecureEC2Role`)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3PresignedURLAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::dropsecure-parcel-photos/*"
    },
    {
      "Sid": "SQSWorkerAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:ap-south-1:*:notification-queue"
    },
    {
      "Sid": "SNSPublishAccess",
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:Subscribe"
      ],
      "Resource": "arn:aws:sns:ap-south-1:*:parcel-notifications"
    },
    {
      "Sid": "SSMParameterRead",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:ap-south-1:*:parameter/dropsecure/*"
    },
    {
      "Sid": "CloudWatchMetricsAndLogs",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Lambda Execution Role (`DropSecureLambdaRole`)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VPCAccessExecution",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SNSPublishReminder",
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:ap-south-1:*:parcel-notifications"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-south-1:*:log-group:/aws/lambda/dropsecure-daily-sweep:*"
    }
  ]
}
```

---

## 4. Cryptographic OTP Generation & Zero-Knowledge Verification

Package handover security relies on a rigorous verification lifecycle:

```
[crypto.randomInt(100000, 999999)] 
           │
           ├─► Plaintext sent ONLY via SNS to Recipient
           │
           └─► bcrypt.hash(otp, saltRounds=10) 
                     │
                     ▼
             Stored in RDS (otp_hash)
```

1. **Cryptographically Secure Random Numbers**: OTPs are generated using Node.js `crypto.randomInt`, preventing pseudo-random predictability.
2. **One-Way Hash Storage**: The raw OTP is **never persisted** in plaintext, database columns, or server log files. Only a `bcrypt` hash is saved.
3. **Attempt Limiting (Anti-Brute-Force)**:
   - Each parcel record tracks `otp_attempts` (default: 0).
   - If an incorrect OTP is supplied, `otp_attempts` increments atomically.
   - Upon reaching 5 failed attempts, the OTP is invalidated and locked, requiring admin intervention or security supervisor override.
4. **Time-To-Live (TTL)**: OTPs carry an explicit expiration timestamp (`NOW() + INTERVAL '48 HOURS'`). Submissions after expiration are rejected immediately.
5. **Immutable Audit Logging**: Every verification event (`OTP_VERIFY_SUCCESS`, `OTP_VERIFY_FAILED`, `PARCEL_DROPPED`, `REMINDER_SENT`) writes an immutable entry into `audit_log` with actor ID, timestamp, and client IP address.

---

## 5. Amazon S3 Direct Upload Security

- **Block Public Access**: S3 Bucket blocks all public read/write requests (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets` set to `true`).
- **Short-Lived Presigned PUT URLs**:
  - Valid for only 15 minutes (900 seconds).
  - Scope is strictly bounded to a single unique UUID object key.
  - Client uploads binary photo directly to S3 without proxying megabytes through the EC2 API server, preventing memory exhaustion attacks (DoS).
- **Server-Side Encryption (SSE-S3)**: All objects are encrypted at rest using AES-256 (`aws:kms` or `AES256`).
- **Automated Lifecycle Policy**: Objects transition to expiration and permanent deletion after 30 days, minimizing storage costs and fulfilling privacy data retention policies.
