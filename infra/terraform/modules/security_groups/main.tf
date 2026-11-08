# 1. EC2 Security Group (Public facing web + API via Nginx only)
# Zero public SSH (port 22) or backend port 5000: administration is handled exclusively
# via AWS Systems Manager (SSM) Session Manager and Run Command with IAM least privilege.
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Security group for DropSecure EC2 instances"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP Inbound"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS Inbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

# 2. Lambda Security Group (VPC-attached sweep worker)
resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-lambda-sg"
  description = "Security group for DropSecure Lambda sweep function"
  vpc_id      = var.vpc_id

  egress {
    description = "Outbound HTTPS to VPC Endpoints"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-lambda-sg"
  }
}

# 3. RDS PostgreSQL Security Group (Strict zero-trust database isolation)
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for DropSecure RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from EC2 API instance"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  ingress {
    description     = "PostgreSQL from Lambda Daily Sweep function"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# Allow Lambda to send to RDS
resource "aws_security_group_rule" "lambda_to_rds" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.lambda.id
  source_security_group_id = aws_security_group.rds.id
  description              = "Allow Lambda to connect to RDS PostgreSQL"
}

# 4. VPC Endpoint Security Group (PrivateLink for SNS)
resource "aws_security_group" "vpc_endpoint" {
  name        = "${var.project_name}-vpce-sg"
  description = "Security group for VPC Interface Endpoints"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS from Lambda"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id, aws_security_group.ec2.id]
  }

  tags = {
    Name = "${var.project_name}-vpce-sg"
  }
}
