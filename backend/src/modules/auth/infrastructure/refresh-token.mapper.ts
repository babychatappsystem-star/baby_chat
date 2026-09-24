import mongoose from 'mongoose';
import { RefreshTokenEntity } from 'src/modules/auth/domain/refresh-token.entity';
import { RefreshTokenDocument } from './refresh-token.schema';

export class RefreshTokenMapper {
  static toDomain(doc: RefreshTokenDocument): RefreshTokenEntity {
    return RefreshTokenEntity.reconstitute({
      id: String(doc._id),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    });
  }

  static toPersistence(entity: RefreshTokenEntity): Record<string, any> {
    return {
      userId: new mongoose.Types.ObjectId(entity.userId),
      tokenHash: entity.tokenHash,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
    };
  }
}
