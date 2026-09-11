import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { TokenService, IssuedTokens } from 'src/modules/auth/application/token.service';
import { InvalidRefreshTokenException } from 'src/shared/exceptions/domain-exceptions';

export interface RefreshTokensCommand {
  refreshToken: string;
}

export interface RefreshTokensResult extends IssuedTokens {
  user: { id: string; email: string; username: string };
}

// Rotation flow:
//  1. Parse userId từ token format "<userId>.<random>".
//  2. Tìm document active khớp (userId, hash).
//  3. Revoke document cũ NGAY (atomic-ish — nếu request lặp lại sau bước này sẽ fail).
//  4. Cấp cặp token mới + persist refresh token mới.
// Bất kỳ lỗi nào ở bước 1-2 đều trả InvalidRefreshTokenException, không tiết lộ lý do.
@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(cmd: RefreshTokensCommand): Promise<RefreshTokensResult> {
    if (!cmd.refreshToken) throw new InvalidRefreshTokenException();

    const userId = this.tokenService.parseUserId(cmd.refreshToken);
    if (!userId) throw new InvalidRefreshTokenException();

    const existing = await this.tokenService.findActiveByPlaintext(userId, cmd.refreshToken);
    if (!existing) throw new InvalidRefreshTokenException();

    const user = await this.userRepository.findById(userId);
    if (!user || !user.id) throw new InvalidRefreshTokenException();

    await this.tokenService.revokeById(existing.id!);

    const issued = await this.tokenService.issueTokens({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      ...issued,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }
}
