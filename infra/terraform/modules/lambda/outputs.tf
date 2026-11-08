output "lambda_arn" {
  value = aws_lambda_function.daily_sweep.arn
}

output "lambda_function_name" {
  value = aws_lambda_function.daily_sweep.function_name
}
