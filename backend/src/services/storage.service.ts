import { minioClient } from "../config/minio";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { Readable } from "stream";
import "multer";

//storage service logic for minio service
//we're using minio for storing item images, which can be later migrated to AWS S3 on deployment

export interface UploadResult {
  filename: string;
  url: string;
  size: number;
}

export class StorageService {
  private readonly bucketName: string;

  constructor() {
    this.bucketName = env.MINIO_BUCKET;
  }

  //upload image
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
      const stream = Readable.from(file.buffer);

      await minioClient.putObject(
        this.bucketName,
        filename,
        stream,
        file.size,
        {
          "Content-Type": file.mimetype,
        }
      );

      const url = await this.getFileUrl(filename);

      logger.info("File uploaded successfully", { filename, size: file.size });

      return {
        filename,
        url,
        size: file.size,
      };
    } catch (error) {
      logger.error("Failed to upload file", { error, filename });
      throw new Error("Failed to upload file to storage");
    }
  }

  //get a presigned URL for image (valid for 7 days)

  async getFileUrl(
    filename: string,
    expiresIn: number = 7 * 24 * 60 * 60
  ): Promise<string> {
    try {
      const url = await minioClient.presignedGetObject(
        this.bucketName,
        filename,
        expiresIn
      );
      return url;
    } catch (error) {
      logger.error("Failed to generate file URL", { error, filename });
      throw new Error("Failed to generate file URL");
    }
  }

  //delete image
  async deleteFile(filename: string): Promise<void> {
    try {
      await minioClient.removeObject(this.bucketName, filename);
      logger.info("File deleted successfully", { filename });
    } catch (error) {
      logger.error("Failed to delete file", { error, filename });
      throw new Error("Failed to delete file from storage");
    }
  }

  //check if image alrd exists
  async fileExists(filename: string): Promise<boolean> {
    try {
      await minioClient.statObject(this.bucketName, filename);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const storageService = new StorageService();
