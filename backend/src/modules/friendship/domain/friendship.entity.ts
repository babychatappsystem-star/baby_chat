import { DomainError } from 'src/shared/exceptions/domain-error';

export enum FriendshipStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Blocked = 'blocked',
}

export interface CreateFriendshipProps {
  requesterId: string;
  recipientId: string;
}

export class FriendshipEntity {
  readonly id?: string;
  readonly requesterId: string;
  readonly recipientId: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  private _status: FriendshipStatus;
  private _acceptedAt?: Date;

  private constructor(props: {
    id?: string;
    requesterId: string;
    recipientId: string;
    status: FriendshipStatus;
    acceptedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.requesterId = props.requesterId;
    this.recipientId = props.recipientId;
    this._status = props.status;
    this._acceptedAt = props.acceptedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get status(): FriendshipStatus {
    return this._status;
  }

  get acceptedAt(): Date | undefined {
    return this._acceptedAt;
  }

  // Tạo friend request mới (status pending). Chặn tự kết bạn với chính mình.
  static createRequest(props: CreateFriendshipProps): FriendshipEntity {
    if (!props.requesterId || !props.recipientId) {
      throw new DomainError('requesterId and recipientId are required');
    }
    if (props.requesterId === props.recipientId) {
      throw new DomainError('Cannot send a friend request to yourself');
    }
    return new FriendshipEntity({
      requesterId: props.requesterId,
      recipientId: props.recipientId,
      status: FriendshipStatus.Pending,
    });
  }

  // Tạo block trực tiếp giữa 2 user. requesterId = người chặn.
  static createBlock(props: CreateFriendshipProps): FriendshipEntity {
    if (props.requesterId === props.recipientId) {
      throw new DomainError('Cannot block yourself');
    }
    return new FriendshipEntity({
      requesterId: props.requesterId,
      recipientId: props.recipientId,
      status: FriendshipStatus.Blocked,
    });
  }

  static reconstitute(props: {
    id: string;
    requesterId: string;
    recipientId: string;
    status: FriendshipStatus;
    acceptedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }): FriendshipEntity {
    return new FriendshipEntity(props);
  }

  // Chỉ recipient mới được accept; chỉ pending mới chuyển sang accepted.
  accept(byUserId: string): void {
    if (this._status !== FriendshipStatus.Pending) {
      throw new DomainError(
        `Cannot accept friendship in status '${this._status}'`,
      );
    }
    if (byUserId !== this.recipientId) {
      throw new DomainError('Only the recipient can accept this request');
    }
    this._status = FriendshipStatus.Accepted;
    this._acceptedAt = new Date();
  }

  // Chuyển sang blocked bởi userId (phải là 1 trong 2 bên).
  blockBy(userId: string): void {
    if (userId !== this.requesterId && userId !== this.recipientId) {
      throw new DomainError('Only a participant of the friendship can block');
    }
    this._status = FriendshipStatus.Blocked;
  }

  // Kiểm tra user có liên quan đến friendship này không.
  involves(userId: string): boolean {
    return userId === this.requesterId || userId === this.recipientId;
  }

  // Trả về userId của phía còn lại.
  otherUserId(userId: string): string {
    if (userId === this.requesterId) return this.recipientId;
    if (userId === this.recipientId) return this.requesterId;
    throw new DomainError('User is not part of this friendship');
  }
}
