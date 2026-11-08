# 1. Private DB Subnet Group
resource "aws_db_subnet_group" "rds" {
  name        = "${var.project_name}-private-db-subnet-group"
  description = "Private database subnet group for DropSecure PostgreSQL"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# 2. RDS PostgreSQL Instance (db.t3.micro, Strictly Isolated)
resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.instance_class
  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_user
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false

  backup_retention_period   = 0
  skip_final_snapshot       = true
  deletion_protection       = false
  auto_minor_version_upgrade = true

  tags = {
    Name        = "${var.project_name}-rds-postgres"
    Environment = var.environment
  }
}
