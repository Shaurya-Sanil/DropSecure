variable "project_name" {
  type    = string
  default = "dropsecure"
}

variable "alert_email" {
  type        = string
  default     = ""
  description = "Email address for $1.00 USD threshold budget alerts"
}

variable "limit_amount" {
  type    = string
  default = "1.0"
}
