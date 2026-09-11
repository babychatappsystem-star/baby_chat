import { RefreshTokenEntity } from './refresh-token.entity';

export abstract class IRefreshTokenRepository {
  abstract save(entity: RefreshTokenEntity): Promise<RefreshTokenEntity>;
  abstract findActiveByHash(userId: string, tokenHash: string): Promise<RefreshTokenEntity | null>;
  abstract revoke(id: string): Promise<void>;
  abstract revokeAllForUser(userId: string): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = IRefreshTokenRepository;
