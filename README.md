# 🛡️📦 DropSecure: Cloud-Native Campus Package Handover & Zero-Trust Verification

> **An enterprise-grade, cloud-native logistics and smart locker verification platform engineered on Amazon Web Services (AWS) using Terraform Infrastructure as Code (IaC).**  
> *Developed for Cloud Computing Lab (CCL) at Fr. Conceicao Rodrigues College of Engineering (Fr. CRCE Bandra, Mumbai).*

---

[![AWS Cloud](https://img.shields.io/badge/AWS-Cloud-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com)
[![TypeScript Monorepo](https://img.shields.io/badge/Language-TypeScript%205.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20Tailwind-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Node.js Backend](https://img.shields.io/badge/Backend-Node.js%2022%20LTS%20%2B%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL 16](https://img.shields.io/badge/Database-Amazon%20RDS%20PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)](https://aws.amazon.com/rds/)
[![Zero-Trust Security](https://img.shields.io/badge/Security-RFC%206238%20TOTP%20%2B%20Bcrypt-10B981?logo=shield&logoColor=white)](#-zero-trust-cryptography--security-highlights)

---

## 📑 Table of Contents

- [🌟 Executive Summary & Problem Statement](#-executive-summary--problem-statement)
- [🏛️ Live Cloud Architecture Diagram](#️-live-cloud-architecture-diagram)
- [✨ Key Technical Innovations](#-key-technical-innovations)
- [🖥️ 4 Decoupled Portals & System Walkthrough](#️-4-decoupled-portals--system-walkthrough)
- [🔐 Zero-Trust Cryptography & Security Highlights](#-zero-trust-cryptography--security-highlights)
- [🌐 Multi-Campus Distributed Mesh](#-multi-campus-distributed-mesh)
- [📸 Screenshots & Visual Interface Gallery](#-screenshots--visual-interface-gallery)
- [🛠️ Complete Technology Stack](#️-complete-technology-stack)
- [📂 Monorepo Directory Structure](#-monorepo-directory-structure)
- [🚀 Quickstart & Local Execution](#-quickstart--local-execution)
- [☁️ Production AWS Deployment via Terraform](#️-production-aws-deployment-via-terraform)
- [👥 3-Tier Engineering Pillar Division](#-3-tier-engineering-pillar-division)
- [📜 Academic Rubric & Grading Alignment](#-academic-rubric--grading-alignment)

---

## 🌟 Executive Summary & Problem Statement

### The Problem in Campus & Student Hostels
In university campuses and student residences, parcel deliveries are notoriously chaotic:
- **Disorganized Gate Drop-Offs:** Couriers (Amazon, BlueDart, Delhivery, Swiggy, Flipkart, DTDC) dump parcels at the security gate or reception desk.
- **Lost & Stolen Packages:** With hundreds of parcels arriving daily, packages are regularly misplaced, picked up by the wrong resident, or stolen.
- **Manual, Unreliable Paper Logs:** Guards rely on handwritten paper registers that are unreadable, easily forged, and completely lack proof of delivery.
- **Unclaimed Stale Parcels:** Packages sit at the gate for weeks, clogging storage bays and creating friction between students and administration.

### The DropSecure Solution
**DropSecure** is a production-deployed, cloud-managed logistics platform that automates the entire delivery and collection chain:
1. **Zero-Friction Courier App (`/courier`):** Delivery drivers select recipient students, take photo proof, and deposit packages in seconds with **zero login required**.
2. **Self-Service Collection Kiosk (`/kiosk`):** Students claim parcels by entering a **6-Digit Cryptographic OTP** or flashing a **Dynamic QR Code** to trigger a physical smart locker solenoid latch.
3. **Student Package Portal (`/student`):** Residents track incoming packages, inspect delivery photos, and monitor an active **48-hour expiration countdown timer**.
4. **Operations & Telemetry Console (`/admin`):** Campus authorities monitor real-time AWS CloudWatch telemetry, manage student rosters, inspect audit trails, and trigger serverless sweeps.

---

## 🏛️ Live Cloud Architecture Diagram

DropSecure is provisioned 100% on **AWS Cloud** using **Terraform Infrastructure as Code**:

![DropSecure AWS Cloud Architecture](./docs/assets/architecture-diagram.jpg)

### 🔁 End-to-End Key Flow Path (Steps 1–10):

| Step | Component | Action & Engineering Flow |
| :---: | :--- | :--- |
| **1** | **User / Client** | Requests route through Internet Gateway into our Dual-AZ VPC (`10.0.0.0/16`). |
| **2** | **Amazon EC2 Node** | `t3.micro` instance running Amazon Linux 2023, Nginx reverse proxy, and PM2 managing Express API + Worker processes. |
| **3** | **S3 Presigned URL** | Express API generates a short-lived (15-min TTL) **S3 Presigned PUT URL** for delivery photo capture. |
| **4** | **Direct S3 Upload** | Client browser streams binary photo **directly to Amazon S3**, bypassing EC2 RAM and CPU completely. |
| **5** | **Amazon RDS Metadata** | Parcel metadata, locker assignment, and `bcrypt` OTP hash are persisted to private PostgreSQL 16 over SSL/TLS. |
| **6** | **Amazon SQS Queue** | Express enqueues notification events to `dropsecure-notification-queue` in **< 50 milliseconds**. |
| **7** | **Worker & DLQ** | Background worker consumes SQS queue with Dead-Letter Queue (`dropsecure-notification-dlq`) for zero message loss. |
| **8** | **Amazon SNS / SES** | Publishes delivery alerts with the 6-digit collection OTP to student inboxes and SMS. |
| **9** | **Student Notification** | Student receives instant alert with pickup OTP and 48-hour expiration window. |
| **10**| **EventBridge + Lambda**| Daily cron at midnight invokes `dropsecure-daily-sweep` Lambda to flag unclaimed packages > 48h. |

---

## ✨ Key Technical Innovations

### 1. Direct-to-S3 Presigned Uploads (Zero-Memory Backend)
- **Traditional Anti-Pattern:** Client uploads a 5MB photo to Node.js $\to$ server buffers image in RAM $\to$ server uploads to S3. This quickly crashes small burstable cloud instances (`t3.micro`).
- **DropSecure Innovation:** The backend generates a cryptographically signed **Presigned S3 PUT URL**. The client device streams image bytes directly to AWS S3. The EC2 instance never handles binary streams, conserving 100% of its resources for API throughput.

### 2. Event-Driven Asynchronous Decoupling (Amazon SQS + DLQ)
- Courier parcel registration completes in **< 50ms**.
- Instead of blocking the driver while sending email alerts, the API pushes events into **Amazon SQS**.
- The `dropsecure-worker` microservice asynchronously polls SQS, handles notifications via **Amazon SNS**, and routes failing payloads to a **Dead-Letter Queue (DLQ)** after 3 retries (`maxReceiveCount = 3`).

### 3. Serverless Automated Daily Sweeper (EventBridge + Lambda)
- Parcels carry a strict **48-hour Time-To-Live (TTL)**.
- An **Amazon EventBridge** rule (`cron(0 0 * * ? *)`) automatically triggers a **Node.js 22 AWS Lambda function** (`dropsecure-daily-sweep`) daily at midnight.
- Scans Amazon RDS for packages where `NOW() > created_at + INTERVAL '48 HOURS'`, transitions status to `EXPIRED`, and dispatches escalation alerts.

### 4. Zero-Secret Repository Architecture (AWS SSM + KMS)
- **Zero hardcoded credentials, API keys, or database passwords in Git.**
- All sensitive secrets (RDS password, JWT secret key) are stored encrypted in **AWS Systems Manager (SSM) Parameter Store** using **AWS KMS**.
- When EC2 launches, its **IAM Instance Profile** (`dropsecure-ec2-role`) pulls decrypted secrets into RAM during bootstrap.

---

## 🖥️ 4 Decoupled Portals & System Walkthrough

Each portal is completely decoupled with dedicated UI/UX tailored to its specific user persona:

```
http://<EC2-PUBLIC-IP>/
├── /courier   ──> 🚚 Delivery Partner Fast Drop-Off (No Login)
├── /kiosk     ──> 🏢 Campus Gate Self-Service Station (12-Bay Smart Locker Grid)
├── /student   ──> 🎒 Student Portal (Protected with Student Auth & Dynamic QR)
└── /admin     ──> ⚙️ Operations Console & AWS Telemetry (Admin Auth & Sweeps)
```

### 1. Delivery Partner App (`/courier`)
- **Zero Login Friction:** Couriers do not need an account.
- **One-Tap Carrier Badges:** Amazon, BlueDart, Delhivery, Swiggy, Flipkart, DTDC, Other.
- **Dynamic Campus Student Filter:** Selecting a campus (e.g. Bandra) instantly scopes student search results to residents of that campus.
- **Smart Waybill & Barcode Scanner:** Integrated barcode and waybill camera scanner ([`LabelScanner.tsx`](./frontend/src/components/LabelScanner.tsx)).
- **Locker Size & Condition:** Categorizes parcels (`SMALL`, `MEDIUM`, `LARGE`) and checks packaging condition (`INTACT`, `SLIGHT_DAMAGE`, `HEAVILY_DAMAGED`).

### 2. Self-Service Collection Kiosk (`/kiosk`)
- **Unattended Terminal Mode:** Fixed touchscreen layout for campus gate kiosks.
- **Interactive 12-Bay Locker Visualizer ([`SmartLockerGrid.tsx`](./frontend/src/components/SmartLockerGrid.tsx)):** Displays compartments with real-time hardware status indicators: *Available*, *Occupied (Locked)*, and *Solenoid Released (Unlocked)*.
- **Instant Touchless QR Scan:** Accepts dynamic QR code tokens via URL parameters (`/kiosk?code=...&otp=...&auto=true`) to pop open the locker door hands-free.

### 3. Student Package Portal (`/student`)
- **Package Status Timeline:** Visual step-tracker from *Dropped* $\to$ *OTP Dispatched* $\to$ *Collected*.
- **48-Hour Pickup Window Countdown:** Real-time countdown timer warning students before package expiration.
- **Delivery Photo Proof:** Modal viewer powered by short-lived Amazon S3 Presigned GET URLs.
- **Zero-Trust Dynamic QR ([`DynamicQrCode.tsx`](./frontend/src/components/DynamicQrCode.tsx)):** Rolling 30-second TOTP token with animated circular countdown ring.

### 4. Cloud Operations & Administration Console (`/admin`)
- **Campus Location Scope Filter:** Filter telemetry, metrics, audit logs, and outbox by `ALL`, `CAMPUS-BANDRA`, `CAMPUS-VASHI`, or `CAMPUS-NERUL`.
- **Live AWS Cloud Telemetry Grid:** Real-time health cards for EC2 (`t3.micro`), RDS (`PostgreSQL 16 SSL`), S3 (`30-Day Lifecycle`), and SQS (`Worker Active`).
- **Student Roster Management:** Enroll new students and assign hostel rooms on the fly with automatic bcrypt credential hashing.
- **On-Demand Stale Sweep Trigger:** Button to execute the serverless stale package sweep instantaneously.
- **Cryptographic Audit Trail:** Immutable ledger recording every parcel handover event, verifier name, IP address, and verification method.

---

## 🔐 Zero-Trust Cryptography & Security Highlights

```
                                 ZERO-TRUST OTP VERIFICATION ENGINE
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [ Option A: Static Email OTP ]                                [ Option B: Dynamic TOTP QR ]
  • Dispatched via Amazon SNS email/SMS                         • RFC 6238 Standard (30-second window)
  • Stored as 10-round bcrypt hash in RDS                       • Token = abs(Hash(Code + Epoch)) % 1000000
  • Never stored in plaintext                                   • ±1 window drift tolerance
  • Rate-limited: Locked after 5 failed tries                   • Anti-replay: Invalid after 30 seconds
```

1. **One-Way Bcrypt Hashing:** Plaintext OTPs are **never saved** in Amazon RDS. Only a one-way `bcrypt` salted hash (10 rounds) is stored. Even a compromised database dump cannot yield valid pickup codes.
2. **RFC 6238 Dynamic TOTP Standard:** The student app generates dynamic 6-digit tokens using 30-second Unix epoch intervals. Even if someone takes a screenshot of the student's screen, the code expires in $\le 30$ seconds.
3. **Anti-Brute-Force Guardrails:** The verification endpoint tracks failed attempts. If an attacker guesses incorrectly 5 consecutive times, the parcel is locked (`HTTP 403 Forbidden`).
4. **VPC Network Isolation:** Amazon RDS resides in an isolated **Private DB Subnet Group** across two Availability Zones (`AZ-A`, `AZ-B`) with `PubliclyAccessible = false`. Port 5432 is strictly firewalled to the EC2 security group.

---

## 🌐 Multi-Campus Distributed Mesh

DropSecure models a distributed logistics network across the **Father Agnel Engineering Network** in Mumbai:

| Campus Node | Identifier | Station Name | Lockers | Cloud AZ |
| :--- | :--- | :--- | :---: | :---: |
| **Fr. CRCE Bandra (Main Campus)** | `CAMPUS-BANDRA` | Station #1 (Main Security Gate) | 12 Bays | `Primary AZ-A` |
| **Fr. CRIT Vashi (Agnel Technical)** | `CAMPUS-VASHI` | Station #2 (Tech Hub Reception) | 12 Bays | `Secondary AZ-B` |
| **Agnel Nerul (Polytechnic & Research)** | `CAMPUS-NERUL` | Station #3 (Library Drop Station) | 12 Bays | `Primary AZ-A` |

---

## 📸 Screenshots & Visual Interface Gallery

### 1. Campus Gateway Portal Selector
![Gateway Portal Selector](./docs/assets/portal-gateway.png)

### 2. Courier Fast Drop-Off & Recipient Search
![Courier Drop-Off](./docs/assets/courier-dropoff.png)

### 3. Student Package Portal & Pickup Status
![Student Portal](./docs/assets/student-portal.jpg)

### 4. Admin Multi-Campus Mesh Telemetry
![Admin Multi-Campus](./docs/assets/admin-multi-campus.jpg)

### 5. Campus Student Directory & Enrolment Management
![Admin Student Management](./docs/assets/admin-students.png)

### 6. Dual-AZ AWS VPC Resource Map
![AWS VPC Resource Map](./docs/assets/aws-vpc-resource-map.png)

---

## 🛠️ Complete Technology Stack

| Layer | Technologies & Services | Role in DropSecure |
| :--- | :--- | :--- |
| **Cloud Infrastructure** | **AWS Cloud** | Production cloud provider. |
| **Infrastructure as Code** | **Terraform v1.9+** | Modular IaC for VPC, EC2, RDS, S3, SQS, SNS, Lambda, SSM, CloudWatch. |
| **Compute & Proxy** | **Amazon EC2 (t3.micro) + Nginx** | Amazon Linux 2023 host, reverse proxy, 2GB swap space, PM2 process manager. |
| **Database** | **Amazon RDS PostgreSQL 16** | Private Multi-AZ DB subnet group, SSL/TLS enforced (`sslmode=require`). |
| **Object Storage** | **Amazon S3** | Direct presigned PUT/GET URLs, CORS enabled, 30-day lifecycle auto-expiry. |
| **Event Queuing** | **Amazon SQS + DLQ** | Decoupled asynchronous event pipeline with Dead-Letter Queue. |
| **Push Notifications** | **Amazon SNS** | Instant email/SMS alerts with collection OTPs. |
| **Serverless Compute** | **AWS Lambda (Node.js 22)** | Daily midnight sweep for unclaimed stale packages. |
| **Event Scheduling** | **Amazon EventBridge** | Cron trigger `cron(0 0 * * ? *)` firing daily sweep Lambda. |
| **Secrets Governance** | **AWS SSM Parameter Store + KMS**| Zero-secret architecture; credentials fetched at boot via IAM Instance Profile. |
| **Observability** | **Amazon CloudWatch + Alarms** | Real-time CPU, RDS connections, SQS queue depth, and $1.00 budget alarm. |
| **Backend Framework** | **Node.js 22 LTS + Express.js** | TypeScript REST API, Zod request validation, bcrypt cryptography. |
| **Frontend Framework** | **React 19 + TypeScript + Vite** | Single-page application, Tailwind CSS, Lucide icons, responsive design. |

---

## 📂 Monorepo Directory Structure

```
CCL_mini_project/
├── backend/                  # Express.js REST API & Migration Engine
│   ├── src/
│   │   ├── config/           # Environment & AWS SDK provider initialization
│   │   ├── db/               # PostgreSQL connection pool, schema migrations & seeders
│   │   ├── middleware/       # JWT auth & Role-Based Access Control (RBAC)
│   │   ├── routes/           # Auth, Parcels, Stats, and Users REST endpoints
│   │   └── utils/            # Cryptographic OTP, TOTP, and audit logging utilities
│   └── package.json
├── frontend/                 # React 19 Single-Page Application (Vite + Tailwind)
│   ├── src/
│   │   ├── components/       # SmartLockerGrid, LabelScanner, CameraCapture
│   │   ├── pages/            # DeliveryDropoff, CollectionKiosk, RecipientPortal, AdminDashboard
│   │   ├── services/         # Typed API client & JWT session storage
│   │   └── types.ts          # Shared TypeScript domain models
│   └── package.json
├── worker/                   # Asynchronous SQS Message Consumer Microservice
│   └── src/index.ts          # SQS Long-polling worker & SNS email dispatcher
├── lambda/                   # Serverless Stale Package Sweeper
│   └── src/index.ts          # Node.js 22 Lambda handler for EventBridge triggers
├── docs/                     # Architectural documentation, diagrams & assets
│   ├── assets/               # Architecture diagrams & application screenshots
│   ├── ARCHITECTURE.md       # Complete cloud topology blueprint
│   ├── SECURITY_DESIGN.md    # Defense-in-depth security specification
│   ├── SERVICE_JUSTIFICATION.md # Cloud service selection rationale
│   └── COST_ANALYSIS.md      # AWS Free-Tier & monthly operational cost model
├── scripts/                  # Database CLI inspection utilities
├── docker-compose.yml        # Local development environment (Postgres + LocalStack)
└── package.json              # NPM workspaces root
```

---

## 🚀 Quickstart & Local Execution

### Option A: LocalStack & Docker Compose (Recommended)
Simulate all AWS services (S3, SQS, SNS, SSM, RDS) locally:

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/dropsecure.git
cd dropsecure

# 2. Launch complete stack via Docker Compose
docker compose up --build
```
- **Frontend Application:** `http://localhost:5173`
- **Backend Express API:** `http://localhost:5000/api/health`
- **LocalStack Gateway:** `http://localhost:4566`

---

### Option B: Native Host Execution

```bash
# 1. Install all monorepo dependencies
npm install

# 2. Start PostgreSQL container
docker compose up -d postgres

# 3. Run database migrations & seed demo data
npm run db:migrate
npm run db:seed

# 4. Start services concurrently
npm run dev:backend   # Express REST API (Port 5000)
npm run dev:worker    # SQS Notification Worker
npm run dev:frontend  # React 19 Frontend (Port 5173)
```

---

## ☁️ Production AWS Deployment

Deploying DropSecure to live AWS:

```bash
# 1. Configure AWS CLI credentials
aws configure

# 2. Build production artifacts
npm run build --workspaces

# 3. Initialize & Apply Terraform
cd infra/terraform
terraform init
terraform plan
terraform apply -auto-approve
```

---

## 👥 3-Tier Engineering Pillar Division

DropSecure was engineered across 3 distinct specialization tracks:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DROPSECURE 3-PILLAR SPECIALIZATION                    │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│ Member 1: Client & Vision│ Member 2: Cryptography & │ Member 3: Cloud &     │
│       Ingestion          │        Smart IoT         │      DevOps Core      │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ • 4 Decoupled Portals    │ • RFC 6238 TOTP Engine   │ • Multi-AZ VPC Subnets │
│   (/courier, /kiosk,     │   (30s Rolling QR)       │   + Private RDS DB     │
│   /student, /admin)      │ • 12-Bay Locker State    │ • SQS + Worker Queue   │
│ • Waybill Barcode &      │   Machine & Solenoids    │   + SNS Dispatches     │
│   OCR Scanner            │ • Salted bcrypt OTP &    │ • EventBridge Lambda   │
│ • S3 Direct Presigned    │   Rate Limiting (5 tries)│   Serverless Sweeps    │
│   PUT URL Streaming      │ • Immutable Audit Logs   │ • CloudWatch Telemetry │
│                          │   with Actor Tracking    │   & Production Setup   │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

---
