import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileController } from './file.controller';
import {
  FileDocument,
  FileSchema,
} from 'src/modules/file/infrastructure/file.schema';
import { FileRepository } from 'src/modules/file/infrastructure/file.repository';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import { IStorageProvider } from 'src/modules/file/domain/i-storage.provider';
import { LocalStorageProvider } from 'src/modules/file/infrastructure/local-storage.provider';
import { CloudinaryStorageProvider } from 'src/modules/file/infrastructure/cloudinary-storage.provider';
import { ImageProcessor } from 'src/modules/file/infrastructure/image-processor';
import { ConfigService } from '@nestjs/config';
import { UploadImageUseCase } from 'src/modules/file/application/use-cases/upload-image.usecase';
import { GetFileUseCase } from 'src/modules/file/application/use-cases/get-file.usecase';
import { DeleteFileUseCase } from 'src/modules/file/application/use-cases/delete-file.usecase';
import { FileUrlResolver } from 'src/modules/file/application/file-url-resolver.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileDocument.name, schema: FileSchema },
    ]),
  ],
  controllers: [FileController],
  providers: [
    { provide: IFileRepository, useClass: FileRepository },
    {
      provide: IStorageProvider,
      useFactory: (configService: ConfigService) => {
        const storageType =
          configService.get<string>('STORAGE_TYPE') || 'local';
        return storageType === 'cloudinary'
          ? new CloudinaryStorageProvider(configService)
          : new LocalStorageProvider(configService);
      },
      inject: [ConfigService],
    },
    ImageProcessor,
    UploadImageUseCase,
    GetFileUseCase,
    DeleteFileUseCase,
    FileUrlResolver,
  ],
  // FileUrlResolver + IFileRepository export để user/conversation/message resolve fileId → url.
  exports: [FileUrlResolver, IFileRepository],
})
export class FileModule {}
