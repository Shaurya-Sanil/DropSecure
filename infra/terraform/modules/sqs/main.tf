# 1. Dead-Letter Queue (DLQ)
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-notification-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.project_name}-notification-dlq"
  }
}

# 2. Main SQS Queue with Redrive Policy
resource "aws_sqs_queue" "main" {
  name                      = "${var.project_name}-notification-queue"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600 # 4 days
  receive_wait_time_seconds  = 20     # Enable SQS Long Polling by default

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.project_name}-notification-queue"
  }
}
