#!/bin/bash
set -e

echo "=== Initializing LocalStack Resources for DropSecure ==="

export AWS_DEFAULT_REGION=ap-south-1

# 1. S3 Bucket
echo "Creating S3 bucket: dropsecure-parcel-photos"
awslocal s3 mb s3://dropsecure-parcel-photos || true

# 2. SQS Queues
echo "Creating SQS DLQ: notification-dlq"
DLQ_URL=$(awslocal sqs create-queue --queue-name notification-dlq --output text --query 'QueueUrl')
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn --output text --query 'Attributes.QueueArn')
echo "DLQ ARN: $DLQ_ARN"

echo "Creating SQS main queue: notification-queue"
REDRIVE_POLICY="{\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"3\"}"
awslocal sqs create-queue --queue-name notification-queue --attributes "{\"RedrivePolicy\":\"$(echo $REDRIVE_POLICY | sed 's/"/\\"/g')\"}" || true

# 3. SNS Topic
echo "Creating SNS topic: parcel-notifications"
SNS_TOPIC_ARN=$(awslocal sns create-topic --name parcel-notifications --output text --query 'TopicArn')
echo "SNS Topic ARN: $SNS_TOPIC_ARN"

# 4. SSM Parameters
echo "Populating SSM Parameters"
awslocal ssm put-parameter --name "/dropsecure/db/password" --value "dropsecure_password" --type "SecureString" --overwrite || true
awslocal ssm put-parameter --name "/dropsecure/jwt/secret" --value "super-secret-jwt-key-for-dropsecure-development-only-32chars" --type "SecureString" --overwrite || true

echo "=== LocalStack Initialization Completed Successfully ==="
