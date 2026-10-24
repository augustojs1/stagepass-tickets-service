import { Module } from '@nestjs/common';

import { ICloudStorageService } from '../storage/interfaces/icloud-storage.service.interface';
import { S3StorageService } from './s3/s3-storage.service';

@Module({
  providers: [
    {
      provide: ICloudStorageService,
      useClass: S3StorageService,
    },
  ],
  exports: [ICloudStorageService],
})
export class StorageModule {}
