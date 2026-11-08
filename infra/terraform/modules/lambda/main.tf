# ==============================================================================
# COST-AWARE ARCHITECTURE: AWS PrivateLink (VPC Interface Endpoint) for SNS
# As documented in /docs/COST_ANALYSIS.md:
# NAT Gateway costs ~$32.85/month ($0.045/hr) which rapidly depletes student credit.
# A VPC Interface Endpoint for SNS costs ~$0.01/hr and only cents during live demo hours,
# keeping the entire Lambda -> SNS pipeline private and within a student budget!
# ==============================================================================
resource "aws_vpc_endpoint" "sns" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.sns"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [var.vpc_endpoint_security_group_id]
  private_dns_enabled = true

  tags = {
    Name = "${var.project_name}-vpce-sns"
  }
}

# Zip packaging of Lambda sweep function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../../lambda/dist"
  output_path = "${path.module}/lambda_sweep.zip"
}

# Lambda Function in Private Subnets (Direct connection to RDS PostgreSQL)
resource "aws_lambda_function" "daily_sweep" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-daily-sweep"
  role             = var.lambda_role_arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  timeout          = 30
  memory_size      = 128
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      NODE_ENV       = "production"
      PROVIDER_MODE  = "aws"
      DATABASE_URL   = "postgresql://${var.db_user}:${var.db_password}@${var.db_endpoint}/${var.db_name}"
      SNS_TOPIC_ARN  = var.sns_topic_arn
    }
  }

  tags = {
    Name        = "${var.project_name}-daily-sweep"
    Environment = var.environment
  }
}

# CloudWatch Log Group for Lambda (7-day minimal retention for free-tier safety)
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.daily_sweep.function_name}"
  retention_in_days = 7
}

# Amazon EventBridge Daily Scheduled Rule (08:00 AM IST = 02:30 UTC)
# cron(30 2 * * ? *)
resource "aws_cloudwatch_event_rule" "daily_sweep_schedule" {
  name                = "${var.project_name}-daily-sweep-rule"
  description         = "Triggers DropSecure Daily Stale Parcel Sweep at 08:00 AM IST"
  schedule_expression = "cron(30 2 * * ? *)"

  tags = {
    Name = "${var.project_name}-daily-sweep-rule"
  }
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_sweep_schedule.name
  target_id = "DropSecureDailySweepLambda"
  arn       = aws_lambda_function.daily_sweep.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_sweep.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_sweep_schedule.arn
}
