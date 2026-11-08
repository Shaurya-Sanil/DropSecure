resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.project_name}/db/password"
  description = "Database master password for DropSecure RDS PostgreSQL"
  type        = "SecureString"
  value       = var.db_password
  overwrite   = true

  tags = {
    Name = "${var.project_name}-param-db-password"
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/jwt/secret"
  description = "JWT authentication secret key for DropSecure API"
  type        = "SecureString"
  value       = var.jwt_secret
  overwrite   = true

  tags = {
    Name = "${var.project_name}-param-jwt-secret"
  }
}
