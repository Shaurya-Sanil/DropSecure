output "instance_id" {
  value = aws_instance.app.id
}

output "public_ip" {
  value = aws_eip.app_eip.public_ip
}

output "public_dns" {
  value = aws_instance.app.public_dns
}

output "eip_allocation_id" {
  value = aws_eip.app_eip.id
}
