variable "project_name" {
  type    = string
  default = "dropsecure"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "ec2_instance_id" {
  type = string
}

variable "queue_name" {
  type = string
}

variable "dlq_name" {
  type = string
}

variable "lambda_function_name" {
  type = string
}
