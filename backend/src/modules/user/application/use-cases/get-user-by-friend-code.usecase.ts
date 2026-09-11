import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import { normalizeFriendCode } from 'src/modules/user/domain/friend-code';
import { UserNotFoundException } from 'src/shared/exceptions/domain-exceptions';

// Tra cứu user theo friend code (case-insensitive, bỏ qua khoảng trắng/dash khi user paste).
@Injectable()
export class GetUserByFriendCodeUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(code: string): Promise<UserEntity> {
    const normalized = normalizeFriendCode(code);
    if (!normalized) throw new UserNotFoundException();
    const user = await this.userRepository.findByFriendCode(normalized);
    if (!user) throw new UserNotFoundException();
    return user;
  }
}
