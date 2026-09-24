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
  // Ghi thời điểm user ngắt kết nối cuối cùng. Không throw nếu userId không tồn tại.
  abstract updateLastSeen(userId: string, date: Date): Promise<void>;
  // Toggle ẩn trạng thái. Caller chịu trách nhiệm emit WS event sau khi gọi.
  abstract updateHidePresence(userId: string, hide: boolean): Promise<void>;
  // Cập nhật cấu hình Expressive Chat.
  abstract updateExpressiveChatSettings(userId: string, thresholds: number, transitionTime: number, emojis?: string[]): Promise<void>;
  // Web Push Notifications
  abstract addPushSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void>;
  abstract removePushSubscription(userId: string, endpoint: string): Promise<void>;
}

export const USER_REPOSITORY = IUserRepository;
