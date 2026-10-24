import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { ICloudStorageService } from '../interfaces/icloud-storage.service.interface';
import { PreSignedResponse } from '../models';

@Injectable()
export class S3StorageService implements ICloudStorageService {
  private readonly logger = new Logger(S3StorageService.name);

  private readonly s3Client: S3Client;
  private readonly bucket: string;

  private readonly MAX_OBJECT_SIZE_IN_BYTES = 7 * 1024 * 1024;

  private readonly VALID_OBJECT_CONTENT_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
  ];

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('aws.region'),
    });

    this.bucket = this.configService.getOrThrow<string>('aws.s3.bucket');
  }

  async createPresignedUploadUrl(
    key: string,
    expiresIn: number = 300,
    contentType: string,
  ): Promise<PreSignedResponse> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Successfully generated presigned URL for ${key}`);

      return {
        key,
        uploadUrl,
        publicUrl: this.configService.get<string>('aws.s3.public_url'),
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${key}`, error);

      throw new InternalServerErrorException(
        'Failed to generate presigned upload URL',
      );
    }
  }

  async getObject(key: string): Promise<void> {
    try {
      const object = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      await this.validateObjectImageFile(key, object);
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;

      if (status === 404) {
        throw new BadRequestException(`File not found in storage: ${key}`);
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to verify object ${key}`, error);

      throw new InternalServerErrorException(`Failed to verify object ${key}`);
    }
  }

  async removeObject(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`Successfully removed object ${key}`);
    } catch (error) {
      this.logger.error(`Failed to remove object ${key}`, error);

      throw new InternalServerErrorException(`Failed to remove object ${key}`);
    }
  }

  private async validateObjectImageFile(
    key: string,
    object: HeadObjectCommandOutput,
  ): Promise<void> {
    if (!this.VALID_OBJECT_CONTENT_TYPES.includes(object.ContentType ?? '')) {
      await this.removeObject(key);

      throw new UnprocessableEntityException('Invalid object content type!');
    }

    if (
      object.ContentLength === undefined ||
      object.ContentLength > this.MAX_OBJECT_SIZE_IN_BYTES
    ) {
      await this.removeObject(key);

      throw new UnprocessableEntityException(
        `Object exceeds the maximum allowed size!`,
      );
    }
  }
}
