variable "project_name" {
  description = "Project identifier for naming resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "ID of the VPC where ALB and target groups reside"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs across multiple AZs for the ALB"
  type        = list(string)
}

variable "ec2_instance_id" {
  description = "ID of the primary EC2 instance to register as a target"
  type        = string
}

variable "ec2_security_group_id" {
  description = "ID of the EC2 security group to allow ingress from ALB"
  type        = string
}

variable "health_check_path" {
  description = "Path for ALB health checks against targets"
  type        = string
  default     = "/health"
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN for HTTPS listener on port 443"
  type        = string
  default     = ""
}

