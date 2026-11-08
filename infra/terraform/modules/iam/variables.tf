variable "project_name" {
  type    = string
  default = "dropsecure"
}

variable "s3_bucket_arn" {
  type        = string
  description = "S3 bucket ARN"
}

variable "sqs_queue_arn" {
  type        = string
  description = "SQS queue ARN"
}

variable "sns_topic_arn" {
  type        = string
  description = "SNS topic ARN"
}
