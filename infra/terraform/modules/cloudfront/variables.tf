variable "project_name" {
  description = "Project name prefix"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "origin_dns_name" {
  description = "Public DNS or IP of the origin EC2 instance"
  type        = string
}
