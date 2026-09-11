export type ParticipantRole = 'admin' | 'member' | 'moderator';

export interface CreateParticipantProps {
  userId: string;
  username: string;
  role: ParticipantRole;
}

export class ParticipantEntity {
  readonly userId: string;
  // Snapshot username lúc join. User có thể tự đổi qua endpoint riêng — không sync
  // ngược lại User.username gốc. Coi như "nickname trong conversation này".
  private _username: string;
  readonly role: ParticipantRole;
  readonly joinedAt: Date;
  readonly leftAt?: Date;
  readonly isActive: boolean;

  private constructor(props: {
    userId: string;
    username: string;
    role: ParticipantRole;
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
  }) {
    this.userId = props.userId;
    this._username = props.username;
    this.role = props.role;
    this.joinedAt = props.joinedAt;
    this.leftAt = props.leftAt;
    this.isActive = props.isActive;
  }

  get username(): string {
    return this._username;
  }

  // Đổi nickname của participant trong conversation này. Không ảnh hưởng User.username.
  rename(newUsername: string): void {
    const trimmed = newUsername.trim();
    if (trimmed.length === 0) {
      throw new Error('Username cannot be empty');
    }
    this._username = trimmed;
  }

  // Tạo participant MỚI khi user tham gia conversation. joinedAt = now, isActive = true.
  static create(props: CreateParticipantProps): ParticipantEntity {
    const validRoles: ParticipantRole[] = ['admin', 'member', 'moderator'];
    if (!validRoles.includes(props.role)) {
      throw new Error(`Invalid role: ${props.role}. Must be one of ${validRoles.join(', ')}`);
    }
    if (!props.username || props.username.trim().length === 0) {
      throw new Error('Username is required');
    }
    return new ParticipantEntity({
      userId: props.userId,
      username: props.username.trim(),
      role: props.role,
      joinedAt: new Date(),
      isActive: true,
    });
  }

  // Khôi phục từ DB (giữ nguyên joinedAt/leftAt/isActive đã lưu).
  static reconstitute(props: {
    userId: string;
    username: string;
    role: ParticipantRole;
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
  }): ParticipantEntity {
    return new ParticipantEntity(props);
  }
}
