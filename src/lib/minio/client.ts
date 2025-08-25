import { Client as MinioClient } from 'minio';
import { env } from '../../env.ts';

export const minio = new MinioClient({
  endPoint: env.STORAGE_ENDPOINT,
  port: env.STORAGE_PORT,
  useSSL: false,
  accessKey: env.STORAGE_ACCESS_KEY,
  secretKey: env.STORAGE_SECRET_KEY,
});
