# Query latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  ami                  = data.aws_ami.amazon_linux_2023.id
  instance_type        = var.instance_type
  subnet_id            = var.public_subnet_id
  vpc_security_group_ids = [var.ec2_security_group_id]
  iam_instance_profile = var.ec2_instance_profile_name
  key_name             = var.key_name != "" ? var.key_name : null

  associate_public_ip_address = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.root}/../scripts/bootstrap-ec2.sh", {
    GIT_REPO_URL   = var.git_repo_url
    AWS_REGION     = var.aws_region
    DB_USER        = var.db_user
    DB_ENDPOINT    = var.db_endpoint
    DB_NAME        = var.db_name
    S3_BUCKET_NAME = var.s3_bucket_name
    SQS_QUEUE_URL  = var.sqs_queue_url
    SQS_DLQ_URL    = var.sqs_dlq_url
    SNS_TOPIC_ARN  = var.sns_topic_arn
  })

  tags = {
    Name        = "${var.project_name}-app-server"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [
      ami,
      user_data,
    ]
  }
}

# Static Elastic IP associated with EC2 instance
resource "aws_eip" "app_eip" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = {
    Name        = "${var.project_name}-eip"
    Project     = var.project_name
    Environment = var.environment
  }
}
