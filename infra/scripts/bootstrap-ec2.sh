#!/bin/bash
set -e

echo "=== Starting DropSecure EC2 Bootstrap Setup ==="

# 0. Add 2GB swap space for t3.micro memory safety
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=128M count=16
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
fi

# 1. Update system packages
dnf update -y || apt-get update -y
dnf install -y git nginx tar gzip || apt-get install -y git nginx tar gzip

# 2. Install Node.js 22 (LTS)
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - || curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
dnf install -y nodejs || apt-get install -y nodejs

# 3. Install PM2 process manager
npm install -g pm2

# 4. Clone or extract DropSecure codebase
mkdir -p /var/www/dropsecure
cd /var/www/dropsecure

if [ -n "${GIT_REPO_URL}" ]; then
  git clone "${GIT_REPO_URL}" .
else
  echo "Downloading application bundle from S3..."
  for i in {1..30}; do
    if aws s3 cp "s3://${S3_BUCKET_NAME}/deploy/dropsecure-app.tar.gz" /tmp/dropsecure-app.tar.gz --region "${AWS_REGION}"; then
      echo "Successfully fetched bundle from S3!"
      break
    fi
    echo "Waiting for application bundle in S3... retry $${i}"
    sleep 5
  done
  tar -xzf /tmp/dropsecure-app.tar.gz -C /var/www/dropsecure/
fi

# 5. Fetch Public IP via IMDSv2
IMDS_TOKEN=$(curl -s -S -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300" 2>/dev/null || true)
if [ -n "$${IMDS_TOKEN}" ]; then
  PUBLIC_IP=$(curl -s -S -H "X-aws-ec2-metadata-token: $${IMDS_TOKEN}" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
else
  PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
fi

# 6. Fetch Secrets from AWS SSM Parameter Store using IAM Instance Profile
export AWS_DEFAULT_REGION="${AWS_REGION}"
DB_PASSWORD=$(aws ssm get-parameter --name "/dropsecure/db/password" --with-decryption --query "Parameter.Value" --output text)
JWT_SECRET=$(aws ssm get-parameter --name "/dropsecure/jwt/secret" --with-decryption --query "Parameter.Value" --output text)

# 7. Generate Production .env File (Zero disk secrets in repo!)
cat <<EOF > /var/www/dropsecure/.env
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://$${PUBLIC_IP}
PROVIDER_MODE=aws

DATABASE_URL=postgresql://${DB_USER}:$${DB_PASSWORD}@${DB_ENDPOINT}/${DB_NAME}
DB_HOST=${DB_ENDPOINT}
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=$${DB_PASSWORD}

JWT_SECRET=$${JWT_SECRET}
JWT_EXPIRES_IN=7d

AWS_REGION=${AWS_REGION}
S3_BUCKET_NAME=${S3_BUCKET_NAME}
S3_PRESIGNED_URL_EXPIRES=900
SQS_QUEUE_URL=${SQS_QUEUE_URL}
SQS_DLQ_URL=${SQS_DLQ_URL}
SNS_TOPIC_ARN=${SNS_TOPIC_ARN}
EOF

# 8. Install Dependencies and Build Projects
cd /var/www/dropsecure
npm install
npm --workspace=backend run build || true
npm --workspace=worker run build || true
npm --workspace=frontend run build || true

# 9. Wait for RDS PostgreSQL and Run Migrations
echo "Waiting for RDS PostgreSQL to accept connections..."
for i in {1..30}; do
  if timeout 3 bash -c "</dev/tcp/${DB_ENDPOINT}/5432" 2>/dev/null; then
    echo "RDS is accepting connections!"
    break
  fi
  echo "Waiting for RDS port 5432... attempt $${i}"
  sleep 4
done

npm run db:migrate || true
npm run db:seed || true

# 10. Configure Nginx Reverse Proxy
cat <<EOF > /etc/nginx/conf.d/dropsecure.conf
server {
    listen 80;
    server_name _;

    # Frontend React 19 Single Page App
    location / {
        root /var/www/dropsecure/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend Express REST API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000/health;
    }
}
EOF

# Test and restart Nginx
nginx -t
systemctl enable nginx
systemctl restart nginx

# 11. Start Application via PM2
cd /var/www/dropsecure
pm2 start backend/dist/index.js --name "dropsecure-api"
pm2 start worker/dist/index.js --name "dropsecure-worker"
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "=== DropSecure Bootstrap Completed Successfully! ==="
