# DropSecure Infrastructure as Code (IaC)

This directory contains modular Terraform configuration that provisions the entire cloud architecture for DropSecure on Amazon Web Services (AWS).

---

## 🏛️ Architecture Overview

The infrastructure creates an isolated, cost-optimized environment:
- **VPC & Networking:** Custom VPC (`10.0.0.0/16`) spanning 2 Availability Zones (`ap-south-1a`, `ap-south-1b`) with isolated public and private subnets.
- **Compute (EC2):** Single `t3.micro` Amazon Linux 2023 instance hosting Node.js 22 LTS, Express REST API, background worker microservice under PM2, and Nginx reverse proxy.
- **Database (RDS):** PostgreSQL 16 `db.t3.micro` instance in private database subnets with `PubliclyAccessible = false` and enforced SSL/TLS.
- **Zero-Trust Management (SSM):** Inbound port 22 (SSH) is completely closed. Deployment and server shell management operate exclusively through AWS Systems Manager (SSM) Session Manager and SSM Run Command.
- **Edge HTTPS & CDN (CloudFront):** CloudFront distribution terminates TLS with a free SSL certificate (`*.cloudfront.net`) and caches frontend static assets (`/assets/*`).
- **Storage (S3):** Encrypted private photo bucket with 30-day lifecycle expiration and S3 Presigned URL direct uploads.
- **Messaging (SQS & SNS):** Asynchronous decoupling via Amazon SQS with Dead-Letter Queue (DLQ) retry semantics and Amazon SNS topic for multi-subscriber delivery alerts.
- **Email Delivery (SES):** Direct verified email notification dispatch via Amazon SES with automated fallback to SNS and developer outbox.
- **Serverless Automation (Lambda):** EventBridge midnight cron trigger invoking a VPC-attached Node.js 22 sweeper function to flag stale uncollected parcels.
- **Budget Guardrails:** AWS Budget configured with a $1.00 USD monthly limit to alert against unexpected cloud billing.

---

## 📂 Directory Layout

```
infra/
├── scripts/
│   ├── bootstrap-ec2.sh      # EC2 user-data initialization script
│   ├── deploy-aws.ps1        # Application packaging & deployment script
│   ├── localstack-init.sh    # LocalStack mock AWS setup script
│   └── teardown-aws.ps1      # Infrastructure destruction helper
└── terraform/
    ├── main.tf               # Root Terraform orchestration
    ├── variables.tf          # Parameter declarations
    ├── outputs.tf            # Exported infrastructure endpoints
    └── modules/              # Reusable infrastructure blocks
        ├── vpc/              # Dual-AZ subnets & route tables
        ├── security_groups/  # Nginx-only ingress, private RDS & VPC endpoint rules
        ├── ec2/              # App server with Elastic IP & SSM instance profile
        ├── rds/              # Private PostgreSQL 16 database instance
        ├── s3/               # Encrypted photo storage with lifecycle policy
        ├── sqs/              # Notification queue + Dead Letter Queue
        ├── sns/              # Push notification topic & subscriptions
        ├── ssm/              # Secure parameter store secrets
        ├── lambda/           # Serverless daily sweep & EventBridge cron
        ├── cloudfront/       # Edge CDN and free HTTPS termination
        ├── cloudwatch/       # Custom dashboard and CloudWatch alarms
        └── budget/           # $1.00 monthly cost guardrail
```

---

## 🚀 Deployment Instructions

### Prerequisites
1. [AWS CLI v2](https://aws.amazon.com/cli/) configured (`aws configure`).
2. [Terraform v1.5+](https://www.terraform.io/downloads.html).

### Steps
1. Navigate to the terraform directory:
   ```bash
   cd infra/terraform
   ```
2. Copy sample variables:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
3. Initialize Terraform providers and modules:
   ```bash
   terraform init
   ```
4. Preview planned infrastructure:
   ```bash
   terraform plan
   ```
5. Apply and provision:
   ```bash
   terraform apply
   ```

---

## 🔒 Security Practices
- **No Long-Lived Secrets:** Applications retrieve credentials at runtime using IAM Instance Profiles and AWS Systems Manager Parameter Store.
- **Network Isolation:** The database and Lambda sweeper reside entirely within private subnets with no public IP addresses.
- **State File Hygiene:** Local state files (`*.tfstate`) and variable files (`*.tfvars`) are strictly ignored by `.gitignore`.

