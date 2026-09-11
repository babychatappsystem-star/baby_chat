export interface CreateRefreshTokenProps {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

// Refresh token được lưu DB dưới dạng hash (không lưu plaintext) để leak DB
// không đồng nghĩa leak token. So khớp khi refresh bằng cách hash lại payload và
// query theo (userId, tokenHash). Token bị revoke (revokedAt != null) coi như vô hiệu.
export class RefreshTokenEntity {
  readonly id?: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly createdAt?: Date;

  private _revokedAt?: Date;

  private constructor(props: {
    id?: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt?: Date;
    createdAt?: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this._revokedAt = props.revokedAt;
    this.createdAt = props.createdAt;
  }

  get revokedAt(): Date | undefined {
    return this._revokedAt;
  }

  static create(props: CreateRefreshTokenProps): RefreshTokenEntity {
    if (!props.userId) throw new Error('userId is required');
    if (!props.tokenHash) throw new Error('tokenHash is required');
    if (!(props.expiresAt instanceof Date)) throw new Error('expiresAt must be a Date');
    return new RefreshTokenEntity(props);
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt?: Date;
    createdAt?: Date;
  }): RefreshTokenEntity {
    return new RefreshTokenEntity(props);
  }

  isActive(now: Date = new Date()): boolean {
    return !this._revokedAt && this.expiresAt.getTime() > now.getTime();
  }

  revoke(now: Date = new Date()): void {
    if (this._revokedAt) return;
    this._revokedAt = now;
  }
}
