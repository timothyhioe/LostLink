import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Client as MinioClient } from "minio";
import { Readable } from "stream";
import { storageConfig } from "../config/storage";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import "multer";

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
}

export class StorageService {
  private readonly config = storageConfig;

  async uploadFile(
    file: Express.Multer.File,
    folder: string = "items"
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );
    const filename = `${folder}/${timestamp}-${sanitizedOriginalName}`;

    try {
      if (this.config.type === "s3") {
        // AWS S3 upload
        const s3Client = this.config.client as any;
        const command = new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        logger.info("Attempting S3 upload", {
          bucket: this.config.bucket,
          key: filename,
          region: this.config.region,
        });

        const result = await s3Client.send(command);

        logger.info("S3 upload result", { result, etag: result.ETag });

        // Generate public S3 URL
        const url = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filename}`;

        logger.info("File uploaded to S3", { filename, size: file.size, url });

        return {
          filename,
          url,
          size: file.size,
        };
      } else {
        // MinIO upload (development)
        const minioClient = this.config.client as MinioClient;
        const stream = Readable.from(file.buffer);

        await minioClient.putObject(
          this.config.bucket,
          filename,
          stream,
          file.size,
          {
            "Content-Type": file.mimetype,
          }
        );

        // Generate proxy URL for development
        const url = this.getProxyUrl(filename);

        logger.info("File uploaded to MinIO", { filename, size: file.size });

        return {
          filename,
          url,
          size: file.size,
        };
      }
    } catch (error) {
      logger.error("Failed to upload file", { error, filename });
      throw new Error("Failed to upload file to storage");
    }
  }

  /**
   * Generate proxy URL for image access through API
   * Format: /api/items/images/{filename}
   */
  getProxyUrl(filename: string): string {
    // Extract just the filename (remove folder prefix)
    const justFilename = filename.split("/").pop() || filename;
    return `/api/items/images/${justFilename}`;
  }

  /**
   * Get presigned URL (kept for backward compatibility if needed)
   * Note: Presigned URLs don't work in Docker development due to hostname mismatch
   */
  async getFileUrl(
    filename: string,
    expiresIn: number = 7 * 24 * 60 * 60
  ): Promise<string> {
    if (this.config.type === "minio") {
      const minioClient = this.config.client as MinioClient;
      try {
        const url = await minioClient.presignedGetObject(
          this.config.bucket,
          filename,
          expiresIn
        );
        return url;
      } catch (error) {
        logger.error("Failed to generate file URL", { error, filename });
        throw new Error("Failed to generate file URL");
      }
    } else {
      // For S3, return direct URL (public bucket)
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filename}`;
    }
  }

  //delete image
  async deleteFile(filename: string): Promise<void> {
    try {
      if (this.config.type === "s3") {
        const s3Client = this.config.client as any;
        const command = new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: filename,
        });
        await s3Client.send(command);
      } else {
        const minioClient = this.config.client as MinioClient;
        await minioClient.removeObject(this.config.bucket, filename);
      }
      logger.info("File deleted successfully", { filename });
    } catch (error) {
      logger.error("Failed to delete file", { error, filename });
      throw new Error("Failed to delete file from storage");
    }
  }

  //check if image alrd exists
  async fileExists(filename: string): Promise<boolean> {
    try {
      if (this.config.type === "s3") {
        const s3Client = this.config.client as any;
        const command = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: filename,
        });
        await s3Client.send(command);
        return true;
      } else {
        const minioClient = this.config.client as MinioClient;
        await minioClient.statObject(this.config.bucket, filename);
        return true;
      }
    } catch (error) {
      return false;
    }
  }
}

export const storageService = new StorageService();
