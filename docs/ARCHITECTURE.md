# DropSecure Architecture & Technical Blueprint

DropSecure is a cloud-native, zero-trust parcel handover and verification system engineered for high accountability, security, and low operational cost on Amazon Web Services (AWS).

---

## 1. High-Level AWS Architecture

```mermaid
graph TB
    subgraph Client Tier
        DP[Delivery Partner Mobile]
        REC[Student / Recipient Mobile & Web]
        GRD[Security Guard Terminal]
    end

    subgraph AWS Cloud - Region: ap-south-1
        subgraph Public Subnets
            ALB[Internet Gateway / Nginx Reverse Proxy]
            EC2[EC2 Instance: Express REST API + SQS Background Worker]
        end

        subgraph AWS Managed Services
            S3[(Amazon S3: Encrypted Parcel Photos<br/>30-day Lifecycle Expiry)]
            SQS[[Amazon SQS: notification-queue<br/>+ Dead-Letter Queue]]
            SNS((Amazon SNS: parcel-notifications<br/>Filter Policy: recipientId))
            SSM[AWS SSM Parameter Store<br/>SecureString Secrets]
            CW[CloudWatch Metrics, Alarms & Logs]
            EB[EventBridge Daily Cron Rule<br/>8:00 AM IST]
        end

        subgraph Private Subnets - Dual AZ
            RDS[(Amazon RDS PostgreSQL<br/>Multi-AZ Ready, No Public IP)]
            LAMBDA[AWS Lambda: Daily Sweep Function<br/>Queries Stale Parcels > 24h]
        end
    end

    DP -- 1. Request Presigned PUT --> EC2
    EC2 -- Return Presigned PUT URL --> DP
    DP -- 2. Direct Upload Photo --> S3
    DP -- 3. Create Parcel Record --> EC2
    EC2 -- Enqueue {parcelId} --> SQS
    EC2 -- Fetch DB Secrets --> SSM

    SQS -- Long Polling (Worker) --> EC2
    EC2 -- Store Bcrypt OTP Hash --> RDS
    EC2 -- Publish OTP Notification --> SNS
    SNS -- Filtered Email / SMS --> REC

    GRD -- 4. Verify OTP --> EC2
    EC2 -- Compare Hash & Log Audit --> RDS

    EB -- Trigger Daily (02:30 UTC / 08:00 IST) --> LAMBDA
    LAMBDA -- Query Pending > 24h --> RDS
    LAMBDA -- Publish Stale Reminders --> SNS
    EC2 -. Custom Metrics & Logs .-> CW
    LAMBDA -. Execution Logs .-> CW
```

---

## 2. VPC Network Topology & Security Boundaries

```mermaid
graph TD
    subgraph Custom VPC [10.0.0.0/16]
        IGW[Internet Gateway]

        subgraph Public Subnets [10.0.1.0/24 & 10.0.2.0/24]
            EC2_SRV[EC2 Instance: DropSecure API & SQS Worker<br/>SG: Allow Inbound 80/443; SSH only from Admin IP]
        end

        subgraph Private DB Subnets [10.0.11.0/24 & 10.0.12.0/24]
            RDS_DB[(Amazon RDS PostgreSQL<br/>SG: Inbound 5432 ONLY from EC2-SG and Lambda-SG)]
        end

        subgraph Private Compute Subnet [10.0.21.0/24]
            LAMBDA_FN[AWS Lambda Function: Daily Sweep]
        end

        subgraph AWS VPC Endpoints / Network Routing
            VPC_ENDPOINT_SNS[VPC Interface Endpoint: com.amazonaws.ap-south-1.sns]
            VPC_ENDPOINT_SSM[VPC Interface Endpoint: com.amazonaws.ap-south-1.ssm]
        end
    end

    IGW <--> EC2_SRV
    EC2_SRV -->|TCP 5432| RDS_DB
    LAMBDA_FN -->|TCP 5432| RDS_DB
    LAMBDA_FN -->|Private AWS Backbone| VPC_ENDPOINT_SNS
    EC2_SRV -->|HTTPS 443| VPC_ENDPOINT_SSM
```

---

## 3. Detailed Sequence Diagrams

### Flow 1: Drop-off & Direct S3 Photo Upload

```mermaid
sequenceDiagram
    autonumber
    actor D as Delivery Partner
    participant FE as DropSecure Web (Mobile)
    participant API as Express API (EC2)
    participant S3 as Amazon S3 Bucket
    participant RDS as PostgreSQL DB
    participant SQS as Amazon SQS Queue

    D->>FE: Select recipient & capture photo
    FE->>API: POST /api/parcels/upload-url (fileName, mimeType)
    API->>API: Validate JWT & file extension
    API->>API: Generate unique object key (uuid + timestamp)
    API->>S3: getSignedUrlPromise('putObject', key, 900s)
    S3-->>API: Presigned PUT URL
    API-->>FE: { uploadUrl, key }
    FE->>S3: PUT /parcels/{key} [Direct binary upload]
    S3-->>FE: 200 OK (ETag returned)
    FE->>API: POST /api/parcels { recipientId, imageKey, notes }
    API->>RDS: INSERT INTO parcels (status='PENDING', ...)
    RDS-->>API: Parcel Record { id, trackingCode }
    API->>SQS: SendMessage { parcelId: id }
    SQS-->>API: MessageId
    API->>RDS: INSERT INTO audit_log (action='PARCEL_DROPPED')
    API-->>FE: 201 Created { trackingCode, status: 'PENDING' }
    FE-->>D: Display Confirmation Badge & Receipt
```

### Flow 2: Worker Notification & OTP Generation

```mermaid
sequenceDiagram
    autonumber
    participant SQS as SQS Queue (notification-queue)
    participant W as Worker Process (Node.js)
    participant RDS as PostgreSQL DB
    participant SNS as Amazon SNS Topic
    participant DLQ as Dead-Letter Queue (DLQ)
    actor R as Recipient (Student)

    loop Long Polling (WaitTime: 20s)
        W->>SQS: ReceiveMessage(Max=10, WaitTimeSeconds=20)
        SQS-->>W: [Message: { parcelId }]
    end

    W->>RDS: SELECT parcel & recipient details
    W->>W: Generate 6-digit cryptographic OTP (crypto.randomInt)
    W->>W: Hash OTP with bcrypt (10 rounds)
    W->>RDS: UPDATE parcels SET otp_hash=hash, otp_expires_at=NOW()+48h
    W->>SNS: Publish Message { subject, body } with MessageAttribute: recipientId = R.id
    SNS->>R: Deliver Email (Filtered by subscription attribute)
    
    alt Success
        W->>SQS: DeleteMessage(ReceiptHandle)
        W->>RDS: INSERT INTO audit_log (action='OTP_DISPATCHED')
    else Processing Failure (3 Attempts)
        W-->>SQS: Message visibility timeout expires
        SQS->>DLQ: Route to notification-dlq (maxReceiveCount=3)
    end
```

### Flow 3: Gate Collection & OTP Verification

```mermaid
sequenceDiagram
    autonumber
    actor G as Security Guard / Verifier
    actor R as Recipient (Student)
    participant FE as Guard Interface
    participant API as Express API
    participant RDS as PostgreSQL DB

    R->>G: Presents Tracking Code & 6-digit OTP
    G->>FE: Enters Tracking Code & OTP
    FE->>API: POST /api/parcels/verify-otp { parcelId, otp }
    API->>RDS: SELECT * FROM parcels WHERE id = parcelId
    API->>API: Check parcel status == 'PENDING'
    API->>API: Check NOW() < otp_expires_at
    API->>API: Check otp_attempts < 5
    
    alt Invalid OTP
        API->>RDS: UPDATE parcels SET otp_attempts = otp_attempts + 1
        API->>RDS: INSERT INTO audit_log (action='OTP_VERIFY_FAILED')
        API-->>FE: 400 Bad Request ("Invalid OTP. 3 attempts remaining")
    else Valid OTP (bcrypt.compare succeeds)
        API->>RDS: UPDATE parcels SET status='COLLECTED', collected_at=NOW(), verified_by=guardId
        API->>RDS: INSERT INTO audit_log (action='PARCEL_COLLECTED')
        API-->>FE: 200 OK ("Parcel verified and collected successfully")
        FE-->>G: Green success badge, student details, and release confirmation
    end
```

### Flow 4: Daily Sweep via EventBridge & Lambda (>24h Stale Parcels)

```mermaid
sequenceDiagram
    autonumber
    participant EB as Amazon EventBridge (Cron: 08:00 AM IST)
    participant L as AWS Lambda (sweepHandler)
    participant RDS as PostgreSQL DB
    participant SNS as Amazon SNS Topic
    actor R as Recipient (Student)

    EB->>L: Scheduled Event (cron: 30 2 * * ? *)
    L->>RDS: SELECT id, recipient_id, tracking_code, created_at<br/>FROM parcels WHERE status = 'PENDING'<br/>AND created_at < NOW() - INTERVAL '24 HOURS'<br/>AND (last_reminded_at IS NULL OR last_reminded_at < NOW() - INTERVAL '24 HOURS')
    RDS-->>L: Stale Parcels List
    
    loop For each stale parcel
        L->>SNS: Publish Reminder Message with MessageAttribute recipientId
        SNS->>R: Email: "Reminder: Your parcel has been at the gate for >24 hours!"
        L->>RDS: UPDATE parcels SET reminder_count = reminder_count + 1, last_reminded_at = NOW()
        L->>RDS: INSERT INTO audit_log (action='REMINDER_SENT')
    end
    
    L-->>EB: 200 Execution Completed { remindedCount }
```
