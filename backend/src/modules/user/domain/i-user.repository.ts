import { UserEntity } from './user.entity';

export abstract class IUserRepository {
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract findByIds(ids: string[]): Promise<UserEntity[]>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract findByFriendCode(code: string): Promise<UserEntity | null>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract save(user: UserEntity): Promise<UserEntity>;
  // Atomic set friendCode. Trả false nếu code đã bị user khác chiếm (caller tự retry).
  abstract setFriendCode(userId: string, code: string): Promise<boolean>;
  // Set avatarFileId. Trả user đã update hoặc null nếu không tồn tại.
  abstract updateAvatar(userId: string, fileId: string): Promise<UserEntity | null>;
  abstract delete(id: string): Promise<void>;
  abstract findAll(): Promise<UserEntity[]>;
  abstract findPaginated(page: number, limit: number): Promise<{ items: UserEntity[]; total: number }>;
}

export const USER_REPOSITORY = IUserRepository;
