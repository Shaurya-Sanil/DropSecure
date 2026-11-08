# Architecture & Engineering Decision Records (ADR)

## ADR 001: CloudFront for HTTPS and Edge Termination
- **Status:** Proposed / Recommended
- **Context:** Delivering HTTPS for a portfolio demonstration without requiring the user to purchase an external custom domain and Route 53 hosted zone ($0.50/mo per zone).
- **Decision:** Place an Amazon CloudFront distribution in front of the EC2 public origin.
- **Consequences:** 
  - Free automated SSL certificate via CloudFront default domain (`d123456.cloudfront.net`).
  - Origin traffic forwarded securely to EC2.
  - Global edge caching for frontend static assets (`/assets/*`).
  - No domain renewal or DNS management overhead.

## ADR 002: VPC Interface Endpoint for SNS (Zero-NAT Gateway)
- **Status:** Accepted
- **Context:** AWS Lambda sweep worker runs in private VPC subnets to query RDS PostgreSQL. To send reminder notifications, Lambda must talk to AWS SNS / SES. A standard AWS NAT Gateway costs ~$32.85/month plus data transfer, which violates student Free Tier budgets.
- **Decision:** Use an AWS PrivateLink VPC Interface Endpoint for SNS (`com.amazonaws.ap-south-1.sns`) provisioned in the private subnets.
- **Consequences:**
  - Complete private network isolation without any internet egress required from the private database subnets.
  - Drastic cost reduction from ~$33/mo down to fractions of a cent during active testing.
  - Zero risk of open internet access from the database tier.

## ADR 003: AWS Systems Manager (SSM) Session Manager over SSH (Port 22)
- **Status:** Accepted
- **Context:** Managing EC2 instances via SSH requires opening port 22 to the public internet or managing static IP allowlists and SSH key pairs, creating security vulnerability and maintenance burden.
- **Decision:** Attach `AmazonSSMManagedInstanceCore` to the EC2 IAM Instance Profile. Keep port 22 completely closed in the EC2 security group.
- **Consequences:**
  - Direct shell access via `aws ssm start-session --target <instance-id>`.
  - Audited session logging in CloudWatch / CloudTrail.
  - Zero open inbound management ports on the internet.

## ADR 004: GitHub Actions OIDC Authentication for Deployments
- **Status:** Accepted
- **Context:** Storing long-lived `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub repository secrets presents credential leakage risks.
- **Decision:** Configure IAM OpenID Connect (OIDC) identity provider with an IAM role scoped exclusively to the GitHub repository and branch.
- **Consequences:**
  - Short-lived, temporary STS tokens generated on each GitHub Actions workflow run.
  - Zero persistent AWS secrets stored in third-party CI/CD systems.

## ADR 005: Multi-Tenant Campus Isolation Schema
- **Status:** Accepted
- **Context:** Campus logistics requires distinct isolation across physical college campuses while allowing centralized administration.
- **Decision:** Introduce a `campuses` table and associate a `campus_id` foreign key on `users`, `parcels`, and `audit_logs`.
- **Consequences:**
  - Multi-tenant data segregation with indexed queries (`WHERE campus_id = $1`).
  - Kiosk and student portals scope requests automatically to their assigned campus location.
  - Admin dashboard supports both single-campus filtering and multi-campus federated views.

