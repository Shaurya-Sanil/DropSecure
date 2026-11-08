variable "aws_region" {
  type        = string
  description = "Target AWS region (e.g. ap-south-1 Mumbai)"
  default     = "ap-south-1"
}

variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "dropsecure"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "admin_ip_cidr" {
  type        = string
  default     = ""
  description = "Your IP address with /32 mask for SSH access (optional, leave blank to use SSM Session Manager)"
}

variable "ec2_instance_type" {
  type        = string
  default     = "t3.micro"
  description = "Free-tier eligible EC2 instance type (t3.micro or t2.micro)"
}

variable "ec2_key_name" {
  type        = string
  default     = ""
  description = "Optional EC2 SSH Key Pair name in target region"
}

variable "git_repo_url" {
  type        = string
  default     = ""
  description = "Git repository URL for EC2 bootstrap cloning"
}

variable "db_name" {
  type    = string
  default = "dropsecure_db"
}

variable "db_user" {
  type    = string
  default = "dropsecure_user"
}

variable "db_password" {
  type        = string
  description = "Master password for RDS PostgreSQL (min 8 chars)"
  sensitive   = true
  default     = "DropSecureRDS2026!"
}

variable "jwt_secret" {
  type        = string
  description = "JWT Signing secret key"
  sensitive   = true
  default     = "super-secure-dropsecure-jwt-production-secret-key-32chars"
}

variable "notification_email" {
  type        = string
  default     = ""
  description = "Student / Evaluator email address for SNS pickup OTPs and $1.00 Budget alerts"
}

variable "enable_alb" {
  type        = bool
  description = "Whether to provision an AWS Application Load Balancer across multi-AZ public subnets"
  default     = true
}

variable "enable_cloudfront" {
  type        = bool
  description = "Whether to deploy CloudFront distribution (requires AWS account verification if new account)"
  default     = false
}
