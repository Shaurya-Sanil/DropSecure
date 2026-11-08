# DropSecure Terraform Infrastructure as Code (IaC)

This directory contains modular Terraform definitions for deploying DropSecure on Amazon Web Services (`ap-south-1`).

---

## Architecture Specification (Target AWS)

```
infra/terraform/
├── main.tf                    # Root composition & module bindings
├── variables.tf               # Region, IP CIDRs, instance sizing
├── outputs.tf                 # EC2 Public IP, S3 Bucket, SNS Topic ARN, RDS Endpoint
├── terraform.tfvars.example   # Example deployment configuration
└── modules/
    ├── vpc/                   # Custom VPC, 2 Public & 2 Private Subnets, IGW, Route tables
    ├── security_groups/       # Isolated security groups for EC2, RDS, and Lambda
    ├── rds/                   # Amazon RDS PostgreSQL (db.t3.micro), private subnet group
    ├── ec2/                   # EC2 Instance (t3.micro), user-data bootstrap script, systemd services
    ├── s3/                    # S3 bucket, block public access, AES256 SSE, 30-day lifecycle rule
    ├── sqs/                   # notification-queue and notification-dlq with redrive policy
    ├── sns/                   # parcel-notifications topic with email subscriptions
    ├── lambda/                # Daily sweep function in private subnet with EventBridge cron
    ├── ssm/                   # SecureString parameters for DB password and JWT secret
    ├── cloudwatch/            # Log groups, custom metrics, dashboard, and CloudWatch alarms
    └── budget/                # AWS Budget alert at $1.00 threshold
```

---

## VPC Interface Endpoint (PrivateLink) for SNS
As documented in `/docs/COST_ANALYSIS.md`, DropSecure provisions an AWS PrivateLink VPC Interface Endpoint (`com.amazonaws.ap-south-1.sns`) for the private Lambda function instead of a costly NAT Gateway ($32.85/month), saving over 75% on infrastructure expenses and safeguarding student credit balances.

---

## Deployment Notice
> [!IMPORTANT]
> Infrastructure will be fully provisioned during **Phase 2** when requested.
