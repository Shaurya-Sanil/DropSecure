resource "aws_sns_topic" "notifications" {
  name = "${var.project_name}-parcel-notifications"

  tags = {
    Name = "${var.project_name}-parcel-notifications"
  }
}

# Optional student/evaluator email subscription
resource "aws_sns_topic_subscription" "email_sub" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}
