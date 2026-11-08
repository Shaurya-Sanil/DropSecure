# Contributing & Local Quickstart Guide

Thank you for exploring DropSecure! This document guides you through setting up, running tests, and developing DropSecure locally.

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: v22 LTS or newer (`node -v`)
- **Docker & Docker Compose**: For local PostgreSQL and LocalStack (AWS mock)
- **Git**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/Shaurya-Sanil/DropSecure.git
cd DropSecure

# Install all npm workspaces (backend, frontend, worker, lambda)
npm install
```

### 3. Start Local Infrastructure
Run PostgreSQL and LocalStack using Docker Compose:
```bash
docker compose up -d
```

### 4. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Default local variables work out-of-the-box with `PROVIDER_MODE=local`.

### 5. Run Migrations & Seed Data
```bash
npm run db:migrate
npm run seed
```

### 6. Start Development Servers
Run the full stack concurrently:
```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Background SQS Worker
npm run dev:worker

# Terminal 3: Vite React Frontend
npm run dev:frontend
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

Run unit and integration tests across the workspace:
```bash
# Run backend test suite (Vitest)
npm run test:backend

# Build & typecheck frontend
npm run build:all
```

---

## ☁️ Deploying to AWS via Terraform

To deploy your own cloud instance:
1. Ensure your AWS credentials are configured: `aws configure`
2. Navigate to Terraform directory: `cd infra/terraform`
3. Copy variables: `cp terraform.tfvars.example terraform.tfvars`
4. Deploy:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

