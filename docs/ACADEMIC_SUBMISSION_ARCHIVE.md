# Academic Submission Archive (College Grading & Rubric)

*This material was moved from the operational application UI to this documentation archive to ensure clean production separation.*

## 3-Person Project Architecture & Rubric Alignment
- **Member 1 (Client & Ingestion):** 4 Decoupled Portals (`/courier`, `/kiosk`, `/student`, `/admin`), waybill OCR scanner, direct S3 presigned upload.
- **Member 2 (Cryptography & Hardware):** RFC 6238 TOTP engine, simulated 12-bay locker state machine, salted bcrypt OTP verification, 5-attempt lockout.
- **Member 3 (Cloud & DevOps):** Dual-AZ VPC subnets, private RDS PostgreSQL 16, SQS worker queue, EventBridge Lambda daily cleanup, CloudWatch metrics & alarms.

## Evaluation Criteria (CCL Rubric Alignment)
- **R1: Problem Definition & Planning:** Resolving gate parcel congestion and theft in student residences.
- **R2: Cloud Service Selection:** Architecture combining VPC, EC2, RDS, S3, SQS, SNS, Lambda, SSM, CloudWatch.
- **R3: Implementation & Execution:** Deployed live on AWS with simulated hardware locker integration.
- **R4: Security Handling:** Zero-secret SSM architecture, private DB subnets, presigned S3 URLs, SSM agentless access.
- **R5: Documentation & Report:** Architectural blueprints, cost models, and decision logs.

