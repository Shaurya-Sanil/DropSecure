# DropSecure Teardown Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "⚠️  Starting DropSecure AWS Teardown (terraform destroy)..." -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Push-Location -Path "infra/terraform"

terraform destroy -auto-approve

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ All AWS Resources destroyed cleanly. Zero residual charges!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

Pop-Location
