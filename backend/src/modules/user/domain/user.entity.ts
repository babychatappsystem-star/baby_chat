export interface CreateUserProps {
  username: string;
  email: string;
  password: string; // already hashed
  displayName?: string;
  dateOfBirth?: Date;
}

export class UserEntity {
  readonly id?: string;
  readonly username: string;
  readonly email: string;
  readonly password: string; // hashed
  readonly displayName?: string;
  readonly dateOfBirth?: Date;
  readonly createdAt: Date;
  readonly friendCode?: string;
  readonly avatarFileId?: string;
  readonly lastSeenAt?: Date;
  readonly hidePresence: boolean;
  readonly expressiveChatThresholds: number;
  readonly expressiveChatTransitionTime: number;
  readonly expressiveChatEmojis: string[];

  private constructor(props: {
    id?: string;
    username: string;
    email: string;
    password: string;
    displayName?: string;
    dateOfBirth?: Date;
    createdAt: Date;
    friendCode?: string;
    avatarFileId?: string;
    lastSeenAt?: Date;
    hidePresence?: boolean;
    expressiveChatThresholds?: number;
    expressiveChatTransitionTime?: number;
    expressiveChatEmojis?: string[];
  }) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.password = props.password;
    this.displayName = props.displayName;
    this.dateOfBirth = props.dateOfBirth;
    this.createdAt = props.createdAt;
    this.friendCode = props.friendCode;
    this.avatarFileId = props.avatarFileId;
    this.lastSeenAt = props.lastSeenAt;
    this.hidePresence = props.hidePresence ?? false;
    this.expressiveChatThresholds = props.expressiveChatThresholds ?? 5;
    this.expressiveChatTransitionTime = props.expressiveChatTransitionTime ?? 300;
    this.expressiveChatEmojis = props.expressiveChatEmojis ?? ['🙂', '😀', '😄', '😆', '😂'];
  }

  // Tạo user MỚI. Password phải đã được hash trước khi truyền vào (hash ở use case).
  // Email được normalize lowercase + trim.
  static create(props: CreateUserProps): UserEntity {
    if (!props.username || props.username.trim().length === 0) {
      throw new Error('Username is required');
    }
    if (!props.email || props.email.trim().length === 0) {
      throw new Error('Email is required');
    }
    if (!props.password) {
      throw new Error('Password is required');
    }

    return new UserEntity({
      id: undefined, // assigned by persistence layer
      username: props.username.trim(),
      email: props.email.toLowerCase().trim(),
      password: props.password,
      displayName: props.displayName,
      dateOfBirth: props.dateOfBirth,
      createdAt: new Date(),
    });
  }

  // Khôi phục UserEntity từ DB document (đã có id, password đã hash).
  static reconstitute(props: {
    id?: string;
    username: string;
    email: string;
    password: string;
    displayName?: string;
    dateOfBirth?: Date;
    createdAt: Date;
    friendCode?: string;
    avatarFileId?: string;
    lastSeenAt?: Date;
    hidePresence?: boolean;
    expressiveChatThresholds?: number;
    expressiveChatTransitionTime?: number;
    expressiveChatEmojis?: string[];
  }): UserEntity {
    return new UserEntity(props);
  }
}
