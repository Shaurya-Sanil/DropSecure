# DropSecure Automated AWS Deployment Script (PowerShell)
param (
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting DropSecure AWS Deployment (Phase 2)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify AWS Identity
Write-Host "Checking AWS CLI Credentials..." -ForegroundColor Yellow
try {
    $Identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "Authenticated as AWS Account: $($Identity.Account) ($($Identity.Arn))" -ForegroundColor Green
} catch {
    Write-Host "Error: AWS credentials not configured or expired!" -ForegroundColor Red
    Write-Host "Please run 'aws configure' or set your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY." -ForegroundColor Red
    exit 1
}

# 2. Package Lambda Sweep Function
Write-Host "Building and bundling Lambda sweep function (Node.js 22)..." -ForegroundColor Yellow
Push-Location -Path "lambda"
npm run build
Pop-Location

# 3. Build Backend, Worker & Frontend
Write-Host "Compiling Backend TypeScript..." -ForegroundColor Yellow
npm --workspace=backend run build

Write-Host "Compiling Worker TypeScript..." -ForegroundColor Yellow
npm --workspace=worker run build

Write-Host "Building React 19 Frontend Single Page App..." -ForegroundColor Yellow
npm --workspace=frontend run build

# 4. Create App Bundle for EC2 Bootstrap
Write-Host "Packaging application bundle for EC2 bootstrap..." -ForegroundColor Yellow
if (Test-Path "dropsecure-app.tar.gz") {
    Remove-Item "dropsecure-app.tar.gz" -Force
}
tar -czf dropsecure-app.tar.gz --exclude=node_modules --exclude=.git --exclude=.terraform backend frontend worker lambda package.json package-lock.json

# 5. Terraform Plan & Apply
Write-Host "Initializing & Applying Terraform in $Region..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Push-Location -Path "infra/terraform"

terraform init
terraform apply -auto-approve

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ DropSecure AWS Deployment Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

terraform output

Pop-Location
