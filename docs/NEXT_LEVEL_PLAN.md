# DropSecure: Portfolio-Grade Engineering Roadmap & Execution Plan

## 1. Current State & Audit (Step 1)
- **Active AWS Resources (in `ap-south-1`):**
  - **EC2 Instance (`i-0372236ae7e369b5c` / `dropsecure-app-server`):** Currently `stopped`. IAM profile includes `AmazonSSMManagedInstanceCore` for agentless management without port 22.
  - **RDS PostgreSQL 16 (`dropsecure-postgres`):** Currently `stopped` in private DB subnet group (`10.0.11.0/24`, `10.0.12.0/24`).
  - **EventBridge Rule (`dropsecure-daily-sweep-rule`):** Currently `DISABLED`.
  - **Elastic IP:** None allocated (re-associates on startup or needs dedicated EIP).
  - **Security Group (`sg-0abc7c9168c4da2ed`):** Ports 80 & 443 open. Port 22 SSH is already conditionally disabled (`var.admin_ip_cidr = ""` default).
  - **Terraform State:** Local state in `infra/terraform/terraform.tfstate`. All AWS resources (VPC, Subnets, S3, SQS, SNS, SSM, RDS, EC2, Lambda) are recorded.
  - **Source Code & Git:** All test suites pass (Vitest: 13/13 passing, Frontend: clean TypeScript Vite production build).
- **Previous Session Disables:** EC2 stopped, RDS stopped, EventBridge rule disabled to prevent billing.

---

## 2. Decision Log & Questions for User
Before making changes that involve external DNS or AWS domains:
1. **HTTPS / Domain Strategy (Phase A):**
   - *Option A:* CloudFront Distribution in front of the EC2 origin using CloudFront's free default SSL certificate (`*.cloudfront.net`). Zero DNS domain required, global CDN edge caching, and free SSL.
   - *Option B:* User-provided custom domain via Route 53 + AWS Certificate Manager (ACM).
   *(Decision requested from user; default planned: CloudFront).*

2. **SES Verification (Phase A):**
   - SES sandbox requires verified sender & recipient email addresses. We will support verified email delivery in SES with fallback to SNS and Dev Outbox inspector.

3. **Lambda VPC & Outbound Notification (Phase A):**
   - VPC-attached Lambda needs to talk to RDS (in private subnets) AND send notifications.
   - *Architecture decision:* Instead of an expensive NAT Gateway ($32+/mo), Lambda connects directly to RDS in the private VPC, updates stale package status, and publishes reminder events via the existing VPC Interface Endpoint for SNS (or decouples notification publishing). We maintain zero-NAT gateway design.

---

## 3. Step-by-Step Implementation Strategy

### Phase A: Fix Known Weak Spots
- [ ] Add CloudFront distribution or ACM module in Terraform for HTTPS.
- [ ] Add Elastic IP resource (`aws_eip`) attached to EC2 instance in Terraform.
- [ ] Ensure Security Groups completely block port 22 and port 5000 from public ingress; confirm SSM Session Manager is primary admin pathway.
- [ ] Implement Amazon SES email provider in backend & worker with verified email handling + graceful fallback to SNS / Dev Outbox.
- [ ] Review Lambda sweep function: ensure RDS private connectivity + low-cost endpoint/decoupled notification dispatch.

### Phase B: CI/CD and Infrastructure as Code
- [ ] GitHub Actions workflow `.github/workflows/ci.yml`:
  - Lint, typecheck, Vitest unit/integration tests, Terraform `fmt -check`, `validate`.
- [ ] GitHub Actions deploy workflow `.github/workflows/deploy.yml`:
  - AWS OIDC authentication (`aws-actions/configure-aws-credentials`).
  - Automated deployment to EC2 via AWS SSM Run Command.
- [ ] Terraform modularization polish: add variables, typed outputs, S3 backend configuration template with DynamoDB state locking.
- [ ] Create `infra/README.md` with clear architecture, deployment, and teardown guides.
- [ ] Update `.gitignore` to track `infra/` while strictly ignoring `.tfstate*`, `.tfvars`, and `.terraform/`.

### Phase C: Multi-Campus (Multi-Tenant) Support
- [ ] Database migration: `campuses` table, add `campus_id` foreign key to `users`, `parcels`, and `audit_logs`.
- [ ] Update backend SQL queries and routes to filter by `campus_id` (JWT-scoped for kiosks and campus admins; multi-campus view for super-admins).
- [ ] Seed script (`backend/src/db/seed.ts`) updated with at least two real campus nodes:
  - `Fr. CRCE Bandra` (`CAMPUS-BANDRA`)
  - `Fr. CRIT Vashi` (`CAMPUS-VASHI`)
- [ ] Frontend campus context & switcher for multi-tenant simulation.

### Phase D: Quality and Observability
- [ ] Additional unit and integration tests:
  - OTP generation, `bcrypt` salt verification, 5-attempt rate-limit lockout.
  - 48-hour package expiration window logic.
  - Parcel deposit to pickup API integration test.
- [ ] Production `/health` endpoint returning detailed dependency status (database connectivity, storage provider, queue).
- [ ] Structured JSON logging middleware (timestamp, requestId, campusId, method, latency, status).
- [ ] CloudWatch metric alarms (DLQ depth > 0, EC2 CPU > 80%, RDS connections > 80).
- [ ] Standalone npm script: `npm run seed`.

### Phase E: UI/UX Redesign (Applying Design Principles)
- [ ] **Kiosk (`/kiosk`):**
  - Massive, optical OTP input pad with tabular mono font.
  - Distinct attempts-remaining counter (5 attempts warning).
  - Micro-animated solenoid latch unlock feedback.
- [ ] **Student Portal (`/student`):**
  - Specific, context-rich headings ("3 Packages Ready for Collection").
  - High-contrast, vibrant accent button for pickup CTA.
  - Real-time countdown timer with tabular numerals (`font-variant-numeric: tabular-nums`).
  - Skeleton loading states.
- [ ] **Courier App (`/courier`):**
  - Mobile-first, ergonomic 48px+ tap targets.
  - Single primary action button per screen.
  - Real-time S3 upload progress bar.
- [ ] **Admin Console (`/admin`):**
  - Real multi-campus telemetry and audit data.
  - WCAG AA compliant text contrast.
  - Clean layout: strip gratuitous gradients, badges, and redundant borders. Grouping via whitespace and mathematical radius formula (`inner = outer - padding`).

### Phase F: Documentation, Transparency & Repository Hygiene
- [ ] Comprehensive, honest `README.md` (no false "enterprise-grade" claims; single-instance architecture explained with clear scale path to ALB + Auto Scaling + Multi-AZ RDS).
- [ ] Create `docs/DECISIONS.md` documenting all engineering trade-offs (Free Tier preservation, VPC endpoints vs NAT, OIDC vs static keys).
- [ ] Add standard MIT `LICENSE` and `CONTRIBUTING.md` / Quickstart.
- [ ] Secret & privacy audit: scan all files for private keys, AWS secrets, hardcoded personal emails, or internal IP addresses.

