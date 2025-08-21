import type { Client as MinioClient } from 'minio';

interface PresignedUrlOptions {
  bucketName: string;
  objectName: string;
  expiry?: number; // in seconds, default 7 days
}

type PresignedUrlResult =
  | {
      success: true;
      url: string;
      expiry: number; // in seconds
    }
  | {
      success: false;
      error: string;
    };

/**
 * Generates a presigned URL for uploading objects to MinIO
 * @param minioClient - Configured MinIO client instance
 * @param options - Presigned URL configuration options
 * @returns Promise<PresignedUrlResult> - Result containing the presigned URL
 */
export async function getPresignedUploadUrl(
  minioClient: MinioClient,
  options: PresignedUrlOptions
): Promise<PresignedUrlResult> {
  const {
    bucketName,
    objectName,
    expiry = 7 * 24 * 60 * 60, // 7 days in seconds
  } = options;

  try {
    // Validate bucket name
    if (!bucketName || bucketName.trim() === '') {
      return {
        success: false,
        error: 'Bucket name is required',
      };
    }

    // Validate object name
    if (!objectName || objectName.trim() === '') {
      return {
        success: false,
        error: 'Object name is required',
      };
    }

    // Validate expiry (MinIO max is 7 days)
    const maxExpiry = 7 * 24 * 60 * 60; // 7 days
    if (expiry > maxExpiry) {
      return {
        success: false,
        error: `Expiry cannot exceed ${maxExpiry} seconds (7 days)`,
      };
    }

    if (expiry <= 0) {
      return {
        success: false,
        error: 'Expiry must be greater than 0',
      };
    }

    // Ensure bucket exists
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      return {
        success: false,
        error: 'Bucket does not exist',
      };
    }

    // Generate presigned URL for PUT operation
    const presignedUrl = await minioClient.presignedPutObject(
      bucketName,
      objectName,
      expiry
    );

    return {
      success: true,
      url: presignedUrl,
      expiry,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generates a presigned URL for downloading objects from MinIO
 * @param minioClient - Configured MinIO client instance
 * @param options - Presigned URL configuration options
 * @returns Promise<PresignedUrlResult> - Result containing the presigned URL
 */
export async function getPresignedDownloadUrl(
  minioClient: MinioClient,
  options: PresignedUrlOptions
): Promise<PresignedUrlResult> {
  const {
    bucketName,
    objectName,
    expiry = 24 * 60 * 60, // 24 hours in seconds
  } = options;

  try {
    // Validate bucket name
    if (!bucketName || bucketName.trim() === '') {
      return {
        success: false,
        error: 'Bucket name is required',
      };
    }

    // Validate object name
    if (!objectName || objectName.trim() === '') {
      return {
        success: false,
        error: 'Object name is required',
      };
    }

    // Validate expiry
    const maxExpiry = 7 * 24 * 60 * 60; // 7 days
    if (expiry > maxExpiry) {
      return {
        success: false,
        error: `Expiry cannot exceed ${maxExpiry} seconds (7 days)`,
      };
    }

    if (expiry <= 0) {
      return {
        success: false,
        error: 'Expiry must be greater than 0',
      };
    }

    // Check if bucket exists
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      return {
        success: false,
        error: 'Bucket does not exist',
      };
    }

    // Check if object exists
    try {
      await minioClient.statObject(bucketName, objectName);
    } catch {
      return {
        success: false,
        error: 'Object does not exist',
      };
    }

    // Generate presigned URL for GET operation
    const presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      expiry
    );

    return {
      success: true,
      url: presignedUrl,
      expiry,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generates multiple presigned URLs for batch operations
 * @param minioClient - Configured MinIO client instance
 * @param requests - Array of presigned URL requests
 * @param operation - Type of operation ('upload' or 'download')
 * @returns Promise<PresignedUrlResult[]> - Array of results
 */
export async function getBatchPresignedUrls(
  minioClient: MinioClient,
  requests: PresignedUrlOptions[],
  operation: 'upload' | 'download' = 'upload'
): Promise<PresignedUrlResult[]> {
  const results = await Promise.all(
    requests.map((request) => {
      if (operation === 'upload') {
        return getPresignedUploadUrl(minioClient, request);
      }
      return getPresignedDownloadUrl(minioClient, request);
    })
  );

  return results;
}
