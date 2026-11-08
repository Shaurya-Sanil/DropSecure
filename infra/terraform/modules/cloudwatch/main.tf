# Log Groups with 7-day retention
resource "aws_cloudwatch_log_group" "api" {
  name              = "/${var.project_name}/api"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-api-logs"
  }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/${var.project_name}/worker"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-worker-logs"
  }
}

# ==========================================
# CloudWatch Alarms
# ==========================================

# 1. EC2 High CPU (>80%)
resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "${var.project_name}-ec2-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alarm when DropSecure EC2 CPU exceeds 80%"

  dimensions = {
    InstanceId = var.ec2_instance_id
  }
}

# 2. SQS Dead-Letter Queue Depth > 0 (Message processing failure alert!)
resource "aws_cloudwatch_metric_alarm" "sqs_dlq" {
  alarm_name          = "${var.project_name}-sqs-dlq-not-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Alarm when SQS notification-dlq has messages (OTP processing failure)"

  dimensions = {
    QueueName = var.dlq_name
  }
}

# 3. Lambda Errors Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alarm when DropSecure Daily Sweep Lambda function errors"

  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

# ==========================================
# CloudWatch Metrics Dashboard
# ==========================================
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-operations-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["DropSecure/Parcels", "parcels_dropped", { label = "Parcels Dropped", color = "#2ca02c" }],
            [".", "otp_verified", { label = "OTP Verified (Collected)", color = "#1f77b4" }],
            [".", "otp_failed", { label = "OTP Failed Attempts", color = "#d62728" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Package Verification Lifecycle Activity"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", var.queue_name, { label = "SQS Queue Backlog", color = "#ff7f0e" }],
            [".", "ApproximateNumberOfMessagesVisible", "QueueName", var.dlq_name, { label = "DLQ Depth", color = "#d62728" }]
          ]
          period = 60
          stat   = "Maximum"
          region = var.aws_region
          title  = "SQS Notification Pipeline Depth & DLQ"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", var.ec2_instance_id, { label = "EC2 CPU Utilization %", color = "#9467bd" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EC2 API & Worker Instance CPU"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name, { label = "Daily Sweep Invocations", stat = "Sum" }],
            [".", "Errors", "FunctionName", var.lambda_function_name, { label = "Sweep Errors", stat = "Sum", color = "#d62728" }]
          ]
          period = 300
          region = var.aws_region
          title  = "Daily Sweep Lambda Execution Health"
        }
      }
    ]
  })
}
