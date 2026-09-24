import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { generateFriendCode } from 'src/modules/user/domain/friend-code';
import { UserNotFoundException } from 'src/shared/exceptions/domain-exceptions';

const MAX_ATTEMPTS = 5;

// Lazy-init friend code: nếu user đã có thì trả về luôn; chưa có thì sinh mới
// và lưu DB. Retry tối đa MAX_ATTEMPTS lần phòng trường hợp collision (cực hiếm).
@Injectable()
export class GetOrCreateFriendCodeUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundException(userId);
    if (user.friendCode) return user.friendCode;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const code = generateFriendCode();
      const ok = await this.userRepository.setFriendCode(userId, code);
      if (ok) return code;
    }
    throw new Error(
      'Failed to generate a unique friend code after multiple attempts',
    );
  }
}
