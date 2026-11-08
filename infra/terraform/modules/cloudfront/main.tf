resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} CloudFront distribution with free TLS termination"
  price_class         = "PriceClass_100" # Use only US, Canada, Europe, & Asia (Free tier friendly)

  origin {
    domain_name = var.origin_dns_name
    origin_id   = "EC2-${var.project_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # EC2 Nginx serves on port 80; CloudFront provides edge HTTPS
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "EC2-${var.project_name}"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]

    # Forward headers and cookies for dynamic API sessions and JWT authentication
    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "Accept", "Content-Type", "Origin", "Referer"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 300
    compress    = true
  }

  # Optimized caching for static frontend assets
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = "EC2-${var.project_name}"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      headers      = ["Origin"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 3600
    default_ttl = 86400
    max_ttl     = 604800
    compress    = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-cloudfront"
    Project     = var.project_name
    Environment = var.environment
  }
}
