import { Injectable } from '@nestjs/common';
import { TokenService } from 'src/modules/auth/application/token.service';

export interface RevokeRefreshTokenCommand {
  refreshToken: string;
}

// Logout: revoke refresh token nếu hợp lệ. Không throw khi không tìm thấy —
// idempotent để client log out không bị lỗi nếu đã clear token cục bộ.
@Injectable()
export class RevokeRefreshTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(cmd: RevokeRefreshTokenCommand): Promise<void> {
    if (!cmd.refreshToken) return;
    const userId = this.tokenService.parseUserId(cmd.refreshToken);
    if (!userId) return;
    const existing = await this.tokenService.findActiveByPlaintext(
      userId,
      cmd.refreshToken,
    );
    if (!existing) return;
    await this.tokenService.revokeById(existing.id!);
  }
}
