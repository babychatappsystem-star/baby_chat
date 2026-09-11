import { ParticipantEntity, ParticipantRole } from './participant.entity';

export type ConversationType = 'direct' | 'group' | 'channel';

export interface ConversationSettings {
  isPrivate: boolean;
  allowInvites: boolean;
  mutedBy: string[];
  pinnedBy: string[];
}

export interface CreateConversationProps {
  type: ConversationType;
  createdByUserId: string;
  participantUserIds: string[];
  // Map userId → username. Caller (use case) lookup user repo trước rồi truyền vào.
  // Phải có entry cho mọi userId (cả creator). Nếu thiếu → throw.
  usernames: Map<string, string>;
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Partial<ConversationSettings>;
}

// Mặc định số tin nhắn tối đa mỗi page. Trước đây lưu trong conversation
// nhưng giờ dùng hằng số chung — đơn giản hóa và tránh data redundancy.
export const DEFAULT_PAGE_SIZE = 100;

// Giới hạn participant per conversation. Khi đạt ngưỡng này, cần chuyển sang
// pattern "participants bucket" (collection riêng) — chưa implement vì chưa cần.
export const MAX_PARTICIPANTS = 500;

export class ConversationEntity {
  readonly id?: string;
  readonly type: ConversationType;
  readonly name?: string;
  readonly description?: string;
  readonly avatar?: string;
  readonly createdBy: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  private _participants: ParticipantEntity[];
  private _settings: ConversationSettings;
  private _deletedAt?: Date | null;
  // Tham chiếu file ảnh avatar (collection 'files'). Ưu tiên dùng field này;
  // `avatar` (URL string) giữ lại cho data cũ.
  private _avatarFileId?: string;

  private constructor(props: {
    id?: string;
    type: ConversationType;
    name?: string;
    description?: string;
    avatar?: string;
    createdBy: string;
    participants: ParticipantEntity[];
    settings: ConversationSettings;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
    avatarFileId?: string;
  }) {
    this.id = props.id;
    this.type = props.type;
    this.name = props.name;
    this.description = props.description;
    this.avatar = props.avatar;
    this.createdBy = props.createdBy;
    this._participants = props.participants;
    this._settings = props.settings;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt ?? null;
    this._avatarFileId = props.avatarFileId;
  }

  get participants(): ReadonlyArray<ParticipantEntity> {
    return this._participants;
  }

  get settings(): Readonly<ConversationSettings> {
    return this._settings;
  }

  get deletedAt(): Date | null | undefined {
    return this._deletedAt;
  }

  get isDeleted(): boolean {
    return !!this._deletedAt;
  }

  get avatarFileId(): string | undefined {
    return this._avatarFileId;
  }

  // Gán avatar mới (file đã upload). Validate file thuộc về ai do use case lo.
  setAvatarFile(fileId: string): void {
    this._avatarFileId = fileId;
  }

  // Soft delete — chỉ set timestamp, không xóa data. Idempotent (set lại không sao).
  softDelete(now: Date = new Date()): void {
    this._deletedAt = now;
  }

  // Tạo conversation MỚI. Creator tự động là admin và được dedupe khỏi participantUserIds
  // để tránh tạo trùng. Group/channel bắt buộc có name.
  static create(props: CreateConversationProps): ConversationEntity {
    const validTypes: ConversationType[] = ['direct', 'group', 'channel'];
    if (!validTypes.includes(props.type)) {
      throw new Error(`Invalid conversation type: ${props.type}`);
    }

    if (props.type !== 'direct' && !props.name) {
      throw new Error('Name is required for group and channel conversations');
    }

    // Creator is always admin; dedupe nếu creator có trong participantUserIds
    const otherUserIds = props.participantUserIds.filter(
      (uid) => uid !== props.createdByUserId,
    );

    // direct phải có đúng 2 người. Group/channel giới hạn MAX_PARTICIPANTS.
    if (props.type === 'direct' && otherUserIds.length !== 1) {
      throw new Error('Direct conversation must have exactly 2 participants');
    }
    const totalParticipants = otherUserIds.length + 1; // +1 cho creator
    if (totalParticipants > MAX_PARTICIPANTS) {
      throw new Error(
        `Conversation cannot have more than ${MAX_PARTICIPANTS} participants (got ${totalParticipants})`,
      );
    }

    const usernameFor = (uid: string): string => {
      const name = props.usernames.get(uid);
      if (!name) throw new Error(`Missing username for participant ${uid}`);
      return name;
    };

    const participants: ParticipantEntity[] = [
      ParticipantEntity.create({
        userId: props.createdByUserId,
        username: usernameFor(props.createdByUserId),
        role: 'admin',
      }),
      ...otherUserIds.map((uid) =>
        ParticipantEntity.create({ userId: uid, username: usernameFor(uid), role: 'member' }),
      ),
    ];

    return new ConversationEntity({
      type: props.type,
      name: props.name,
      description: props.description,
      avatar: props.avatar,
      createdBy: props.createdByUserId,
      participants,
      settings: {
        isPrivate: props.settings?.isPrivate ?? false,
        allowInvites: props.settings?.allowInvites ?? true,
        mutedBy: props.settings?.mutedBy ?? [],
        pinnedBy: props.settings?.pinnedBy ?? [],
      },
    });
  }

  // Khôi phục ConversationEntity từ DB (không validate lại logic create).
  static reconstitute(props: {
    id: string;
    type: ConversationType;
    name?: string;
    description?: string;
    avatar?: string;
    createdBy: string;
    participants: ParticipantEntity[];
    settings: ConversationSettings;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
    avatarFileId?: string;
  }): ConversationEntity {
    return new ConversationEntity(props);
  }

  // Check user có phải là thành viên của conversation hay không (dùng cho authorize gửi tin nhắn).
  isParticipant(userId: string): boolean {
    return this._participants.some((p) => p.userId === userId);
  }

  // Lấy role của một thành viên (admin/member/moderator), null nếu không tham gia.
  getParticipantRole(userId: string): ParticipantRole | null {
    return this._participants.find((p) => p.userId === userId)?.role ?? null;
  }
}
