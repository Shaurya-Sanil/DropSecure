output "db_password_param_name" {
  value = aws_ssm_parameter.db_password.name
}

output "jwt_secret_param_name" {
  value = aws_ssm_parameter.jwt_secret.name
}
