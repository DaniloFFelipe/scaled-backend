/** biome-ignore-all lint/suspicious/noConsole: I Know */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Client as MinioClient } from 'minio';

type UploadResult = {
  success: boolean;
  uploadedFiles?: string[];
  error?: string;
};

type UploadOptions = {
  bucketName: string;
  folderPrefix?: string;
  preserveStructure?: boolean;
};

/**
 * Uploads a temporary folder to MinIO and deletes the local folder afterwards
 * @param minioClient - Configured MinIO client instance
 * @param tmpFolderPath - Path to the temporary folder to upload
 * @param options - Upload configuration options
 * @returns Promise<UploadResult> - Result of the upload operation
 */
export async function uploadTmpFolder(
  minioClient: MinioClient,
  tmpFolderPath: string,
  options: UploadOptions
): Promise<UploadResult> {
  const { bucketName, folderPrefix = '', preserveStructure = true } = options;
  const uploadedFiles: string[] = [];

  try {
    // Verify the temporary folder exists
    const folderStats = await fs.stat(tmpFolderPath);
    if (!folderStats.isDirectory()) {
      return {
        success: false,
        error: 'Provided path is not a directory',
      };
    }

    // Ensure bucket exists
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName);
    }

    // Get all files recursively from the folder
    const files = await getFilesRecursively(tmpFolderPath);

    // Upload each file
    const uploadPromises = files.map(async (filePath) => {
      try {
        const relativePath = path.relative(tmpFolderPath, filePath);
        const objectName = preserveStructure
          ? path.join(folderPrefix, relativePath).replace(/\\/g, '/')
          : path
              .join(folderPrefix, path.basename(filePath))
              .replace(/\\/g, '/');

        await minioClient.fPutObject(bucketName, objectName, filePath, {
          'x-amz-acl': 'public-read',
        });
        return objectName;
      } catch (uploadError) {
        console.error(`Failed to upload file ${filePath}:`, uploadError);
        // Return null for failed uploads
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);

    // Filter out failed uploads and add successful ones to uploadedFiles
    for (const result of results) {
      if (result !== null) {
        uploadedFiles.push(result);
      }
    }

    // Delete the temporary folder after successful upload
    await fs.rm(tmpFolderPath, { recursive: true, force: true });

    return {
      success: true,
      uploadedFiles,
    };
  } catch (error) {
    console.error('Error uploading temporary folder:', error);

    // Attempt to clean up the temporary folder even if upload failed
    try {
      await fs.rm(tmpFolderPath, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to cleanup temporary folder:', cleanupError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Recursively gets all file paths from a directory
 * @param dirPath - Directory path to scan
 * @returns Promise<string[]> - Array of file paths
 */
async function getFilesRecursively(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const subDirPromises: Promise<string[]>[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        subDirPromises.push(getFilesRecursively(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    if (subDirPromises.length > 0) {
      const subFilesArrays = await Promise.all(subDirPromises);
      for (const subFiles of subFilesArrays) {
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return files;
}
