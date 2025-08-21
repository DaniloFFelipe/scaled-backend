import { env } from '@indy/env';
import { Client as MinioClient } from 'minio';

export const minio = new MinioClient({
  endPoint: env.S3_ENDPOINT,
  port: env.S3_PORT,
  useSSL: false,
  accessKey: env.S3_ACCESS_KEY_ID,
  secretKey: env.S3_SECRET_ACCESS_KEY,
});
