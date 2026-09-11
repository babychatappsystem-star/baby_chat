import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { generateFriendCode } from 'src/modules/user/domain/friend-code';
import { UserNotFoundException } from 'src/shared/exceptions/domain-exceptions';

const MAX_ATTEMPTS = 5;

// Sinh code mới, ghi đè code cũ (vô hiệu hóa code cũ). Dùng khi user bị spam.
@Injectable()
export class RegenerateFriendCodeUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<string> {
    const exists = await this.userRepository.findById(userId);
    if (!exists) throw new UserNotFoundException(userId);

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const code = generateFriendCode();
      const ok = await this.userRepository.setFriendCode(userId, code);
      if (ok) return code;
    }
    throw new Error('Failed to generate a unique friend code after multiple attempts');
  }
}
