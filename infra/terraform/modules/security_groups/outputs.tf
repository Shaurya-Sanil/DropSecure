output "ec2_security_group_id" {
  value = aws_security_group.ec2.id
}

output "rds_security_group_id" {
  value = aws_security_group.rds.id
}

output "lambda_security_group_id" {
  value = aws_security_group.lambda.id
}

output "vpc_endpoint_security_group_id" {
  value = aws_security_group.vpc_endpoint.id
}
