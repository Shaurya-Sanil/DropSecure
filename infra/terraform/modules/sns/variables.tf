variable "project_name" {
  type    = string
  default = "dropsecure"
}

variable "notification_email" {
  type        = string
  default     = ""
  description = "Evaluator or recipient email for SNS parcel notifications"
}
