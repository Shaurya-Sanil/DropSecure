# DropSecure Cost Optimization & Network Tradeoff Analysis

This document provides a breakdown of cloud infrastructure costs, free-tier utilization guidelines, and a detailed engineering comparison of **NAT Gateway vs VPC Interface Endpoints**.

---

## 1. The NAT Gateway vs VPC Interface Endpoint Tradeoff

### The Problem
The **Daily Sweep Lambda** runs inside the custom VPC's private subnet so it can establish direct TCP connections to Amazon RDS PostgreSQL (which has no public IP and cannot be reached from the public internet). However, once the Lambda queries the database, it must publish reminder messages to **Amazon SNS**, an AWS managed public service.

Resources in private subnets cannot reach public AWS endpoints without an egress path.

### Comparison Table

| Dimension | AWS NAT Gateway | AWS VPC Interface Endpoint (PrivateLink) |
| :--- | :--- | :--- |
| **Pricing Model** | $0.045 / hour + $0.045 / GB processed | $0.01 / AZ / hour + $0.01 / GB processed |
| **Monthly Cost (Single AZ)** | **~$32.85 / month** | **~$7.30 / month** |
| **Monthly Cost (Dual AZ)** | **~$65.70 / month** | **~$14.60 / month** |
| **Setup Scope** | Provides internet egress to *all* external services. | Provides targeted private access specifically to SNS (`com.amazonaws.ap-south-1.sns`). |
| **Security Posture** | Outbound traffic traverses internet gateway; requires public IP routing. | **Zero Internet Traversal**. Traffic stays entirely within the private AWS global network backbone. |
| **Student Budget Impact** | **Catastrophic**: Depletes a $100 student credit voucher in ~45 days with zero traffic. | **Minimal**: Incurs ~$0.05 for a 4-hour live evaluation session. |

### Architectural Decision for DropSecure
**We implement the VPC Interface Endpoint (PrivateLink) for Amazon SNS (`com.amazonaws.ap-south-1.sns`)** instead of a NAT Gateway.
- **Why**: It is **78% cheaper** than a NAT Gateway, completely eliminates internet traversal (enhancing Zero-Trust compliance), and can be provisioned and destroyed dynamically via Terraform.
- **Demo Efficiency**: Provisioned 15 minutes before the college project demo and torn down afterwards with `terraform destroy`, the total AWS spend is **less than $0.08**.

---

## 2. Comprehensive Monthly Cost Breakdown

All sizing is tailored for the AWS Free Tier (first 12 months) and low ongoing cost:

| Service | Sizing / Configuration | Free Tier Allowance | Est. Monthly Cost (Free Tier) | Est. Cost (Post Free Tier) |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon EC2** | `t3.micro` (1 vCPU, 1 GB RAM) | 750 hours/month | $0.00 | ~$7.60 |
| **Amazon RDS** | `db.t3.micro` Single-AZ (PostgreSQL) | 750 hours/month (db.t3/t2.micro) + 20 GB storage | $0.00 | ~$14.50 |
| **Amazon S3** | Standard Storage (< 1 GB parcel photos) | 5 GB storage + 20,000 GET + 2,000 PUT | $0.00 | ~$0.05 |
| **Amazon SQS** | Standard Queue (`notification-queue`) | 1,000,000 requests/month | $0.00 | $0.00 |
| **Amazon SNS** | 1 Topic + Email Subscriptions | 100,000 HTTP/Email notifications | $0.00 | $0.00 |
| **AWS Lambda** | 128 MB RAM, 1 execution/day | 1,000,000 invocations + 3.2M sec compute | $0.00 | $0.00 |
| **Amazon EventBridge** | 1 Rule (Scheduled cron) | Unlimited custom rule evaluations | $0.00 | $0.00 |
| **SSM Parameter Store** | Standard Parameters (Encrypted) | Standard parameters are free | $0.00 | $0.00 |
| **CloudWatch** | 3 Log Groups, 4 Custom Metrics, 1 Dashboard | 10 Metrics + 3 Alarms + 5 GB Logs | $0.00 | ~$1.50 |
| **VPC Endpoint (SNS)** | 1 Interface Endpoint (Demo hours only) | None | ~$0.15 (during demos) | ~$7.30 (if kept 24/7) |
| **AWS Budgets** | 1 Budget with Email Alert ($1.00 threshold) | 2 Action-enabled Budgets are free | $0.00 | $0.00 |
| **TOTAL** | — | — | **$0.00 - $0.20** | **~$30.95** |

---

## 3. Cost-Safety Checklist for Project Evaluators

1. **AWS Budget Guardrail**: Configured via Terraform to alert when monthly forecasted charges exceed **$1.00 USD**.
2. **S3 Lifecycle Rules**: Photos automatically transition to permanent deletion after 30 days to prevent bucket storage accrual.
3. **CloudWatch Log Retention**: All log groups have explicit retention set to **7 days** (preventing multi-gigabyte log accumulation).
4. **Teardown Protocol**:
   ```bash
   cd infra/terraform
   terraform destroy -auto-approve
   ```
   Executing teardown cleanly de-provisions the VPC Endpoint, EC2 instance, and RDS instance, guaranteeing zero residual costs.
