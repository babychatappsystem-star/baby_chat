import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import { FileUrlResolver } from 'src/modules/file/application/file-url-resolver.service';
import { UserNotFoundException } from 'src/shared/exceptions/domain-exceptions';

export interface ProfileResult {
  user: UserEntity;
  avatarUrl: string | null;
  thumbnailUrl: string | null;
}

// Lấy profile đầy đủ từ DB (không chỉ từ JWT payload) để có avatar + thumbnail.
@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    private readonly fileUrlResolver: FileUrlResolver,
  ) {}

  async execute(userId: string): Promise<ProfileResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundException(userId);

    const resolved = await this.fileUrlResolver.resolve(user.avatarFileId);
    return {
      user,
      avatarUrl: resolved?.url ?? null,
      thumbnailUrl: resolved?.thumbnailUrl ?? null,
    };
  }
}
