variable "project_name" {
  type        = string
  description = "Project identifier"
  default     = "dropsecure"
}

variable "environment" {
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Dual AZs in the target region (e.g. ap-south-1a, ap-south-1b)"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}
