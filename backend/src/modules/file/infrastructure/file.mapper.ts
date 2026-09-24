import mongoose from 'mongoose';
import { FileCategory, FileEntity } from 'src/modules/file/domain/file.entity';
import { FileDocument } from './file.schema';

export class FileMapper {
  static toDomain(doc: FileDocument): FileEntity {
    return FileEntity.reconstitute({
      id: String(doc._id),
      ownerId: doc.ownerId.toString(),
      category: doc.category as FileCategory,
      originalName: doc.originalName,
      mimetype: doc.mimetype,
      size: doc.size,
      filename: doc.filename,
      url: doc.url,
      thumbnailUrl: doc.thumbnailUrl,
      width: doc.width,
      height: doc.height,
      createdAt: doc.createdAt,
    });
  }

  static toPersistence(entity: FileEntity): Record<string, any> {
    return {
      ownerId: new mongoose.Types.ObjectId(entity.ownerId),
      category: entity.category,
      originalName: entity.originalName,
      mimetype: entity.mimetype,
      size: entity.size,
      filename: entity.filename,
      url: entity.url,
      thumbnailUrl: entity.thumbnailUrl,
      width: entity.width,
      height: entity.height,
    };
  }
}
