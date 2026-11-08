output "ec2_public_ip" {
  description = "Public IP address of the DropSecure EC2 application server"
  value       = module.ec2.public_ip
}

output "application_url" {
  description = "URL to access DropSecure in browser"
  value       = "http://${module.ec2.public_ip}"
}

output "rds_endpoint" {
  description = "Private RDS PostgreSQL endpoint (no public access)"
  value       = module.rds.endpoint
}

output "s3_bucket" {
  description = "Private S3 Bucket for parcel photo proofs"
  value       = module.s3.bucket_name
}

output "sqs_queue_url" {
  description = "Amazon SQS notification queue URL"
  value       = module.sqs.queue_url
}

output "sqs_dlq_url" {
  description = "Amazon SQS dead-letter queue URL"
  value       = module.sqs.dlq_url
}

output "sns_topic_arn" {
  description = "Amazon SNS notification topic ARN"
  value       = module.sns.topic_arn
}

output "cloudwatch_dashboard_url" {
  description = "AWS CloudWatch Operations Dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${module.cloudwatch.dashboard_name}"
}

output "cloudfront_domain_name" {
  description = "CloudFront Distribution Domain Name (HTTPS)"
  value       = var.enable_cloudfront ? module.cloudfront[0].cloudfront_domain_name : null
}

output "https_application_url" {
  description = "Secure HTTPS application URL via CloudFront edge distribution"
  value       = var.enable_cloudfront ? "https://${module.cloudfront[0].cloudfront_domain_name}" : null
}

output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = var.enable_alb ? module.alb[0].alb_dns_name : null
}

output "alb_url" {
  description = "Direct HTTP access URL via Application Load Balancer"
  value       = var.enable_alb ? "http://${module.alb[0].alb_dns_name}" : null
}
