import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IRefreshTokenRepository } from 'src/modules/auth/domain/i-refresh-token.repository';
import { RefreshTokenEntity } from 'src/modules/auth/domain/refresh-token.entity';

export interface TokenPayload {
  sub: string;
  email: string;
  username?: string;
}

export interface IssuedTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number; // giây
  access_token_expires_at: Date;
  refresh_token_expires_in: number; // giây
  refresh_token_expires_at: Date;
}

// Service tập trung mọi thao tác liên quan token: cấp access JWT, sinh +
// persist refresh token (chỉ lưu hash). Login/Register/Refresh đều gọi service này
// để logic ký token và TTL chỉ tồn tại tại một chỗ.
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(IRefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  // Cấp cặp token mới cho user, đồng thời persist refresh token (đã hash) vào DB.
  // Trả cả expires_in (giây) và expires_at (Date) để FE chọn dùng cái nào tiện.
  async issueTokens(payload: TokenPayload): Promise<IssuedTokens> {
    const now = Date.now();

    const accessTtlMs = this.getAccessTtlMs();
    const access_token = await this.jwtService.signAsync(payload);
    const access_token_expires_at = new Date(now + accessTtlMs);

    const refreshTtlMs = this.getRefreshTtlMs();
    const random = crypto.randomBytes(48).toString('base64url');
    // Format "<userId>.<random>" để /auth/refresh chỉ cần 1 string từ client.
    const refresh_token = `${payload.sub}.${random}`;
    const tokenHash = this.hashToken(refresh_token);
    const refresh_token_expires_at = new Date(now + refreshTtlMs);

    await this.refreshTokenRepository.save(
      RefreshTokenEntity.create({
        userId: payload.sub,
        tokenHash,
        expiresAt: refresh_token_expires_at,
      }),
    );

    return {
      access_token,
      refresh_token,
      access_token_expires_in: Math.floor(accessTtlMs / 1000),
      access_token_expires_at,
      refresh_token_expires_in: Math.floor(refreshTtlMs / 1000),
      refresh_token_expires_at,
    };
  }

  // Tách userId từ token format "<userId>.<random>".
  parseUserId(plaintext: string): string | null {
    const dot = plaintext.indexOf('.');
    if (dot <= 0 || dot === plaintext.length - 1) return null;
    return plaintext.slice(0, dot);
  }

  // Tìm document active khớp với plaintext token. Trả về entity hoặc null.
  findActiveByPlaintext(userId: string, plaintext: string) {
    return this.refreshTokenRepository.findActiveByHash(userId, this.hashToken(plaintext));
  }

  revokeById(id: string): Promise<void> {
    return this.refreshTokenRepository.revoke(id);
  }

  // SHA-256 hex là đủ — refresh token đã đủ entropy nên không cần salt.
  hashToken(plaintext: string): string {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }

  private getAccessTtlMs(): number {
    return this.parseDurationMs('JWT_ACCESS_TOKEN_EXPIRES', '1d');
  }

  private getRefreshTtlMs(): number {
    return this.parseDurationMs('JWT_REFRESH_TOKEN_EXPIRES', '7d');
  }

  // Parse format "<number><unit>" với unit ∈ {s,m,h,d}.
  private parseDurationMs(envKey: string, fallback: string): number {
    const raw = this.configService.get<string>(envKey) ?? fallback;
    const match = /^(\d+)\s*([smhd])$/.exec(raw.trim());
    if (!match) {
      throw new Error(`Invalid ${envKey} value: ${raw}. Expected format like "7d", "12h", "30m".`);
    }
    const value = parseInt(match[1], 10);
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * unitMs[match[2]];
  }
}
