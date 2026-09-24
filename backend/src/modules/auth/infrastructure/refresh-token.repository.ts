import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IRefreshTokenRepository } from 'src/modules/auth/domain/i-refresh-token.repository';
import { RefreshTokenEntity } from 'src/modules/auth/domain/refresh-token.entity';
import { RefreshTokenDocument } from './refresh-token.schema';
import { RefreshTokenMapper } from './refresh-token.mapper';

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectModel(RefreshTokenDocument.name)
    private readonly model: Model<RefreshTokenDocument>,
  ) {}

  async save(entity: RefreshTokenEntity): Promise<RefreshTokenEntity> {
    const data = RefreshTokenMapper.toPersistence(entity);
    const created = await this.model.create(data);
    return RefreshTokenMapper.toDomain(created);
  }

  // Active = chưa revoke + chưa hết hạn. Lọc cứng ở query để không cần load doc.
  async findActiveByHash(
    userId: string,
    tokenHash: string,
  ): Promise<RefreshTokenEntity | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;

    const doc = await this.model.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      tokenHash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    return doc ? RefreshTokenMapper.toDomain(doc) : null;
  }

  async revoke(id: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      { $set: { revokedAt: new Date() } },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;

    await this.model.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } },
    );
  }
}
