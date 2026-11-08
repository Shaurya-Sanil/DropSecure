variable "project_name" {
  type    = string
  default = "dropsecure"
}

variable "vpc_id" {
  type        = string
  description = "Target VPC ID"
}

variable "admin_ip_cidr" {
  type        = string
  default     = ""
  description = "CIDR block for administrator SSH access (e.g. 203.0.113.50/32)"
}
