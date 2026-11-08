variable "project_name" {
  type    = string
  default = "dropsecure"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "public_subnet_id" {
  type = string
}

variable "ec2_security_group_id" {
  type = string
}

variable "ec2_instance_profile_name" {
  type = string
}

variable "key_name" {
  type    = string
  default = ""
}

variable "git_repo_url" {
  type    = string
  default = ""
}

variable "db_user" {
  type = string
}

variable "db_endpoint" {
  type = string
}

variable "db_name" {
  type = string
}

variable "s3_bucket_name" {
  type = string
}

variable "sqs_queue_url" {
  type = string
}

variable "sqs_dlq_url" {
  type = string
}

variable "sns_topic_arn" {
  type = string
}
