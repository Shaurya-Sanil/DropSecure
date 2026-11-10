# DropSecure: Zero-Trust Campus Smart Locker & Logistics System
## Complete Engineering Archive, System Architecture & Operational Guide

---

## 1. Executive Summary

**DropSecure** is an enterprise-grade, cloud-native smart locker and logistics management system designed for university campuses and residential institutions. It replaces vulnerable manual package handling at campus gates with an automated, zero-trust delivery network. 

Traditional campus logistics suffer from severe vulnerabilities: couriers dump parcels in open guardrooms, packages are stolen or misplaced, and security guards spend hours manually verifying students. DropSecure solves this by pairing physical smart locker simulation with cryptographic verification, end-to-end cloud infrastructure, and real-time student notifications.

### Key Engineering Highlights:
- **Cloud-Native Dual-AZ Architecture**: Production deployment on AWS utilizing an Application Load Balancer across multi-AZ public and private subnets.
- **Hardware-Coupled Smart Locker Management**: 12-bay intelligent solenoid terminal simulator with visual compartment status (Vacant, Locked, Open) and strict single-occupancy concurrency control.
- **Zero-Trust Verification Pipeline**: Cryptographically hashed 6-digit pickup OTPs (Bcrypt, 10 salt rounds) and dynamic rolling TOTP QR codes (RFC 6238, 30-second rotation) ensuring no raw codes are stored or exposed.
- **Asynchronous Cloud Decoupling**: Background processing worker powered by Amazon SQS and Dead Letter Queues (DLQ), streaming alerts via Amazon SNS and SES.
- **Zero-SSH Automated Deployment**: Fully orchestrated via AWS Systems Manager (SSM) Run Command and S3-backed artifact bundles.
- **100% Infrastructure as Code (IaC)**: Modular Terraform configurations covering VPC, Subnets, Routing, Security Groups, EC2, RDS, S3, SQS, SNS, Lambda, and CloudWatch.

---

## 2. System Architecture & AWS Infrastructure

```
                                  [ Internet / Users ]
                                           │
                                           ▼
                      [ AWS Application Load Balancer (ALB) ]
                         (Multi-AZ: ap-south-1a & ap-south-1b)
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                                           ▼
          [ Public Subnet ap-south-1a ]               [ Public Subnet ap-south-1b ]
          ┌───────────────────────────┐               ┌───────────────────────────┐
          │   Amazon EC2 (t3.micro)   │               │   (Auto-Scaling Ready)    │
          │  - Nginx Reverse Proxy    │               └───────────────────────────┘
          │  - React 18 SPA (Vite)    │
          │  - Node.js Express REST   │
          │  - PM2 Process Manager    │
          │  - Background Worker      │
          └─────────────┬─────────────┘
                        │
      ┌─────────────────┼─────────────────────────┐
      │                 │                         │
      ▼                 ▼                         ▼
[ Amazon S3 ]     [ Amazon SQS ]            [ Private Subnets ]
- Delivery Photos - Async OTP Queue         ┌───────────────────────────────┐
- AES-256 / SSE   - Dead Letter Queue (DLQ) │ Amazon RDS (PostgreSQL 16)    │
- 30-day Expiry         │                   │ - Isolated in Private Subnets │
                        ▼                   │ - Zero Public Exposure        │
                 [ Background Worker ]      │ - Encrypted Storage (gp3)     │
                        │                   └───────────────────────────────┘
              ┌─────────┴─────────┐
              ▼                   ▼
       [ Amazon SNS ]       [ Amazon SES ]
       - SMS / Email Alerts - Rich HTML Notices
              │
              ▼
   [ EventBridge + Lambda ]
   - 24-hr Stale Parcel Sweep Cron
```

### Infrastructure Specifications

| AWS Service | Resource Identifier / Role | Configuration Details |
| :--- | :--- | :--- |
| **Application Load Balancer** | `dropsecure-alb` | Dual-AZ public ingress (`ap-south-1a`, `ap-south-1b`), HTTP:80 forwarder, `/health` target group health check. |
| **Amazon EC2** | `dropsecure-app-server` (`t3.micro`) | Amazon Linux 2023, PM2 process management (`dropsecure-api` & `dropsecure-worker`), Nginx reverse proxy. |
| **Elastic IP** | `dropsecure-eip` (`3.7.56.245`) | Static IPv4 allocation bound to EC2 for deterministic ingress. |
| **Amazon RDS** | `dropsecure-postgres` (`db.t3.micro`) | PostgreSQL 16, private DB subnet group across dual AZs, non-public, gp3 storage, bcrypt credential storage. |
| **Amazon S3** | `dropsecure-photos-bae18f4a` | AES-256 encryption, strict public access block, 48-hour presigned PUT/GET URLs, 30-day lifecycle auto-expiry. |
| **Amazon SQS** | `dropsecure-notification-queue` | Standard SQS queue with Dead Letter Queue (`dropsecure-dlq`) with max receive count = 3. |
| **Amazon SNS** | `dropsecure-parcel-notifications` | Multi-subscriber notification topic with recipient attribute message filtering. |
| **Amazon SES** | Direct Email Pipeline | Verified identity transactional notification service with fallback to SNS topic. |
| **AWS Lambda** | `dropsecure-daily-sweep` | Node.js 20 runtime, EventBridge rate rule (`cron(0 2 * * ? *)`) sweeping stale packages older than 24h. |
| **AWS SSM** | Parameter Store & Run Command | Secure storage of DB credentials and JWT secrets; zero-SSH remote deploy pipeline. |
| **Amazon CloudWatch** | `DropSecure-Operations` | High-CPU alarms (>80%), SQS DLQ backlog alarms, Lambda invocation error metrics. |

---

## 3. Core Software Modules & Features

### 3.1. Interactive 12-Bay Locker Simulator (`L-01` to `L-12`)
- **Visual Hardware Bays**: Realistic 12-compartment grid visualizer mirroring an industrial automated locker terminal.
- **Color-Coded Solenoid State**:
  - **Red Glow**: Occupied & Locked (displays assigned tracking code and locker size).
  - **Green Glow**: Latch Released / Door Open (momentary solenoid actuation upon OTP verification).
  - **Gray Dark**: Vacant / Ready for deposit.
- **Dynamic Sizing**: Compartments categorized into Small (`L-01`–`L-04`), Medium (`L-05`–`L-08`), and Large (`L-09`–`L-12`).
- **Single-Occupancy Concurrency Lock**: Backend atomic SQL constraints verify that no locker compartment can be assigned to multiple pending parcels. Overwrite and collision bugs are completely eliminated.

### 3.2. Courier Deposit Workflow
1. Courier authenticates via JWT session (`delivery@express.com`).
2. Selects campus station (`CAMPUS-BANDRA`, `CAMPUS-VASHI`, `CAMPUS-NERUL`).
3. Selects student recipient and attaches parcel notes & carrier name (BlueDart, Amazon, Delhivery).
4. Selects a vacant locker compartment directly from the visual hardware matrix or allows automatic allocation.
5. Captures or uploads delivery photo proof (uploaded directly to S3 via presigned PUT URL).
6. Atomically secures the parcel in RDS and dispatches an asynchronous event to Amazon SQS.

### 3.3. Student Dual-Factor Pickup System
- **Static Pickup OTP**:
  - 6-digit cryptographically secure pseudo-random number generated by the background worker.
  - Stored in RDS strictly as a **Bcrypt hash** with 10 salt rounds. Raw OTPs are never stored in plaintext.
  - Automatically expires after 48 hours; maximum of 5 failed attempts before lockout.
- **Dynamic Rotating TOTP QR Code**:
  - RFC 6238 Time-based One-Time Password algorithm.
  - Refreshes automatically every 30 seconds with animated countdown ring.
  - Cannot be screenshotted or forwarded to prevent unauthorized parcel collection.

### 3.4. Collection Center Kiosk
- Physical kiosk touch terminal interface (`/kiosk`).
- Supports two modes of verification:
  1. Manual keypad input of tracking code and 6-digit collection OTP.
  2. Camera-based optical scanning of dynamic QR codes.
- Upon successful match, actuates the digital solenoid:
  - Locker door changes state to Open (Green).
  - Emits real-time sound/visual feedback.
  - Marks parcel status as `COLLECTED` in RDS.
  - Automatically records actor ID, IP address, and timestamp in the immutable `audit_log` table.

### 3.5. Clean Notification Worker Pipeline
- Refactored notification worker delivers concise, privacy-focused emails:
  - Standardized greeting: `Hello Student Alice (ID: STU-A0187D),`
  - Explicit locker compartment assignment (`Assigned Compartment: L-04`).
  - Clear 3-step walk-up instructions without raw tokenized links.
  - Mirroring to Dev Outbox (`/api/stats/outbox`) for operational auditing.

---

## 4. Database Schema (PostgreSQL 16)

```sql
-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'GUARD', 'DELIVERY', 'RECIPIENT')),
    phone VARCHAR(50),
    room_number VARCHAR(100),
    campus_id VARCHAR(100) DEFAULT 'CAMPUS-BANDRA',
    email_confirmed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Parcels Table (With Smart Locker Enforcements)
CREATE TABLE parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(100) UNIQUE NOT NULL,
    recipient_id UUID NOT NULL REFERENCES users(id),
    dropped_by_id UUID NOT NULL REFERENCES users(id),
    verified_by_id UUID REFERENCES users(id),
    image_key VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'COLLECTED', 'EXPIRED', 'RETURNED')),
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    otp_attempts INTEGER DEFAULT 0,
    reminder_count INTEGER DEFAULT 0,
    last_reminded_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    carrier VARCHAR(100),
    campus_id VARCHAR(100) DEFAULT 'CAMPUS-BANDRA',
    locker_number VARCHAR(20) DEFAULT 'L-01',
    locker_size VARCHAR(20) DEFAULT 'MEDIUM',
    package_condition VARCHAR(50) DEFAULT 'INTACT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Audit Log (Immutable Event Ledger)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID REFERENCES parcels(id),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notification Outbox Mirror
CREATE TABLE outbox_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES users(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Security & Zero-Trust Design

1. **Zero Raw OTP Exposure**:
   - OTPs are hashed using bcrypt before insertion into PostgreSQL.
   - The API response never contains `otp_hash` or `rawOtp`.
   - The collection endpoint checks `bcrypt.compare(enteredOtp, parcel.otp_hash)`.
2. **Time-Limited Rolling Credentials**:
   - Static OTPs expire strictly after 48 hours.
   - Dynamic QR codes expire every 30 seconds using HMAC-SHA1.
   - Brute-force protection: Accounts/parcels lock out after 5 consecutive incorrect attempts.
3. **Private Network Isolation**:
   - PostgreSQL RDS is hosted exclusively within private subnets with no public IPv4 address or route to the Internet Gateway.
   - Security groups restrict database port 5432 ingress solely to the EC2 security group.
4. **Least-Privilege IAM Roles**:
   - The EC2 instance uses an attached IAM Instance Profile with scoped permissions:
     - `s3:PutObject`, `s3:GetObject` on `arn:aws:s3:::dropsecure-photos-*/*`
     - `sqs:ReceiveMessage`, `sqs:DeleteMessage` on `dropsecure-notification-queue`
     - `sns:Publish` on `dropsecure-parcel-notifications`
     - `ssm:GetParameter` on `/dropsecure/prod/*`
5. **Direct S3 Presigned URLs**:
   - No image binary data passes through the application server; image uploads stream directly from the client browser to Amazon S3.

---

## 6. How to Run Locally (Zero Cloud Cost)

DropSecure is built with provider abstractions (`local` vs `aws`), meaning the entire stack can be run 100% locally with Docker Compose and LocalStack without incurring any AWS charges.

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or Dockerized PostgreSQL)

### Local Startup Steps
```bash
# 1. Clone the repository
git clone https://github.com/Shaurya-Sanil/DropSecure.git
cd DropSecure

# 2. Install all workspace dependencies
npm install

# 3. Start local Postgres and LocalStack services
docker compose -f infra/docker-compose.local.yml up -d

# 4. Initialize database schema & seed demo users
npm --workspace=backend run migrate
npm --workspace=backend run seed

# 5. Start development servers concurrently
npm run dev
```

### Default Local Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@dropsecure.edu` | `Admin@123` |
| **Security Guard** | `guard@dropsecure.edu` | `Guard@123` |
| **Courier / Delivery** | `delivery@express.com` | `Delivery@123` |
| **Student (Bandra)** | `alice@student.dropsecure.edu` | `Student@123` |
| **Student (Vashi)** | `bob@student.dropsecure.edu` | `Student@123` |
| **Student (Nerul)** | `charlie@student.dropsecure.edu` | `Student@123` |

---

## 7. Operational Audit & Infrastructure Decommissioning

When operational demonstrations or academic evaluations conclude, all cloud resources can be safely destroyed to guarantee **$0.00 ongoing costs**.

### Teardown Commands Executed
```bash
# 1. Empty the S3 storage bucket
aws s3 rm s3://dropsecure-photos-bae18f4a --recursive

# 2. Execute automated Terraform destroy
cd infra/terraform
terraform destroy -auto-approve

# 3. Verify zero billable resources remain
aws ec2 describe-instances --region ap-south-1
aws rds describe-db-instances --region ap-south-1
aws elbv2 describe-load-balancers --region ap-south-1
aws ec2 describe-addresses --region ap-south-1
```

---

## 8. Conclusion

DropSecure demonstrates that robust, campus-scale logistics can be achieved with modern zero-trust security practices, cloud decoupling, and intuitive physical terminal simulations. By leveraging Infrastructure as Code, automated CI/CD deployments, and cryptographic verification, the project stands as an enterprise-grade blueprint for secure physical-digital systems.
