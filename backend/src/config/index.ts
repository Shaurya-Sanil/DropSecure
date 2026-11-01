import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  providerMode: 'local' | 'aws';
  db: {
    url: string;
    host?: string;
    port?: number;
    name?: string;
    user?: string;
    password?: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  aws: {
    region: string;
    endpointUrl?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  s3: {
    bucketName: string;
    presignedExpires: number;
  };
  sqs: {
    queueUrl: string;
    dlqUrl: string;
  };
  sns: {
    topicArn: string;
  };
  ssm: {
    dbSecretParam: string;
    jwtSecretParam: string;
  };
}

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  providerMode: (process.env.PROVIDER_MODE === 'aws' ? 'aws' : 'local') as 'local' | 'aws',
  db: {
    url: process.env.DATABASE_URL || 'postgresql://dropsecure_user:dropsecure_password@localhost:5432/dropsecure_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'dropsecure_db',
    user: process.env.DB_USER || 'dropsecure_user',
    password: process.env.DB_PASSWORD || 'dropsecure_password',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-dropsecure-development-only-32chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    endpointUrl: process.env.AWS_ENDPOINT_URL || undefined,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME || 'dropsecure-parcel-photos',
    presignedExpires: parseInt(process.env.S3_PRESIGNED_URL_EXPIRES || '900', 10),
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/notification-queue',
    dlqUrl: process.env.SQS_DLQ_URL || 'http://localhost:4566/000000000000/notification-dlq',
  },
  sns: {
    topicArn: process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-south-1:000000000000:parcel-notifications',
  },
  ssm: {
    dbSecretParam: process.env.SSM_PARAM_DB_SECRET || '/dropsecure/db/password',
    jwtSecretParam: process.env.SSM_PARAM_JWT_SECRET || '/dropsecure/jwt/secret',
  },
};
