terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. Custom VPC (Public & Private Subnets across Dual AZs)
module "vpc" {
  source             = "./modules/vpc"
  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
}

# 2. Security Groups (EC2, RDS, Lambda, VPC Interface Endpoints)
module "security_groups" {
  source        = "./modules/security_groups"
  project_name  = var.project_name
  vpc_id        = module.vpc.vpc_id
  admin_ip_cidr = var.admin_ip_cidr
}

# 3. S3 Bucket (Private Photos with 30-day lifecycle)
module "s3" {
  source       = "./modules/s3"
  project_name = var.project_name
  environment  = var.environment
}

# 4. SQS Queue & Dead-Letter Queue
module "sqs" {
  source       = "./modules/sqs"
  project_name = var.project_name
}

# 5. SNS Topic & Student Email Subscription
module "sns" {
  source             = "./modules/sns"
  project_name       = var.project_name
  notification_email = var.notification_email
}

# 6. SSM Parameter Store (SecureString Secrets)
module "ssm" {
  source       = "./modules/ssm"
  project_name = var.project_name
  db_password  = var.db_password
  jwt_secret   = var.jwt_secret
}

# 7. IAM Roles (EC2 Instance Profile & Lambda Execution Role)
module "iam" {
  source        = "./modules/iam"
  project_name  = var.project_name
  s3_bucket_arn = module.s3.bucket_arn
  sqs_queue_arn = module.sqs.queue_arn
  sns_topic_arn = module.sns.topic_arn
}

# 8. RDS PostgreSQL (Isolated in Private Subnets, No Public IP)
module "rds" {
  source                = "./modules/rds"
  project_name          = var.project_name
  environment           = var.environment
  private_subnet_ids    = module.vpc.private_subnet_ids
  rds_security_group_id = module.security_groups.rds_security_group_id
  db_name               = var.db_name
  db_user               = var.db_user
  db_password           = var.db_password
}

# 9. Lambda Daily Sweep & EventBridge Schedule (Cost-aware PrivateLink for SNS)
module "lambda" {
  source                         = "./modules/lambda"
  project_name                   = var.project_name
  environment                    = var.environment
  aws_region                     = var.aws_region
  vpc_id                         = module.vpc.vpc_id
  private_subnet_ids             = module.vpc.private_subnet_ids
  lambda_security_group_id       = module.security_groups.lambda_security_group_id
  vpc_endpoint_security_group_id = module.security_groups.vpc_endpoint_security_group_id
  lambda_role_arn                = module.iam.lambda_role_arn
  db_endpoint                    = module.rds.address
  db_name                        = var.db_name
  db_user                        = var.db_user
  db_password                    = var.db_password
  sns_topic_arn                  = module.sns.topic_arn
}

# Upload local application bundle to S3 for zero-git EC2 bootstrap
resource "aws_s3_object" "app_bundle" {
  bucket = module.s3.bucket_name
  key    = "deploy/dropsecure-app.tar.gz"
  source = "${path.root}/../../dropsecure-app.tar.gz"
  etag   = filemd5("${path.root}/../../dropsecure-app.tar.gz")
}

# 10. EC2 Instance (Runs Express API & SQS Worker under PM2, with Nginx reverse proxy)
module "ec2" {
  source                    = "./modules/ec2"
  project_name              = var.project_name
  environment               = var.environment
  aws_region                = var.aws_region
  instance_type             = var.ec2_instance_type
  public_subnet_id          = module.vpc.public_subnet_ids[0]
  ec2_security_group_id     = module.security_groups.ec2_security_group_id
  ec2_instance_profile_name = module.iam.ec2_instance_profile_name
  key_name                  = var.ec2_key_name
  git_repo_url              = var.git_repo_url
  db_user                   = var.db_user
  db_endpoint               = module.rds.address
  db_name                   = var.db_name
  s3_bucket_name            = module.s3.bucket_name
  sqs_queue_url             = module.sqs.queue_url
  sqs_dlq_url               = module.sqs.dlq_url
  sns_topic_arn             = module.sns.topic_arn

  depends_on = [
    module.rds,
    module.ssm,
    aws_s3_object.app_bundle
  ]
}

# 11. CloudWatch Log Groups, Custom Metrics Dashboard, and Alarms
module "cloudwatch" {
  source               = "./modules/cloudwatch"
  project_name         = var.project_name
  aws_region           = var.aws_region
  ec2_instance_id      = module.ec2.instance_id
  queue_name           = "${var.project_name}-notification-queue"
  dlq_name             = "${var.project_name}-notification-dlq"
  lambda_function_name = module.lambda.lambda_function_name
}

# 12. AWS Budget ($1.00 USD Student Cost Guardrail)
module "budget" {
  source       = "./modules/budget"
  project_name = var.project_name
  alert_email  = var.notification_email
}

# 13. CloudFront Distribution (Edge TLS / HTTPS & Global CDN Caching)
module "cloudfront" {
  source          = "./modules/cloudfront"
  project_name    = var.project_name
  environment     = var.environment
  origin_dns_name = module.ec2.public_dns

  depends_on = [module.ec2]
}
