import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import { FileEntity } from 'src/modules/file/domain/file.entity';
import { FileDocument } from './file.schema';
import { FileMapper } from './file.mapper';

@Injectable()
export class FileRepository implements IFileRepository {
  constructor(
    @InjectModel(FileDocument.name) private readonly model: Model<FileDocument>,
  ) {}

  async findById(id: string): Promise<FileEntity | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean();
    return doc ? FileMapper.toDomain(doc as FileDocument) : null;
  }

  // Batch fetch, dedupe + bỏ id rỗng để tránh query thừa.
  async findByIds(ids: string[]): Promise<FileEntity[]> {
    const unique = Array.from(
      new Set(ids.filter((id) => id && mongoose.Types.ObjectId.isValid(id))),
    );
    if (unique.length === 0) return [];
    const docs = await this.model.find({ _id: { $in: unique } }).lean();
    return docs.map((doc) => FileMapper.toDomain(doc as FileDocument));
  }

  async save(entity: FileEntity): Promise<FileEntity> {
    const data = FileMapper.toPersistence(entity);
    const created = await this.model.create(data);
    return FileMapper.toDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id });
  }
}
