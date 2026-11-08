variable "project_name" {
  type    = string
  default = "dropsecure"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for RDS placement"
}

variable "rds_security_group_id" {
  type        = string
  description = "Security group ID restricting inbound 5432 to EC2 and Lambda"
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
  type      = string
  sensitive = true
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}
