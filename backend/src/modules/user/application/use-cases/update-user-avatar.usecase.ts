import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import { IFileRepository } from 'src/modules/file/domain/i-file.repository';
import {
  FileAccessDeniedException,
  FileNotFoundException,
  UserNotFoundException,
} from 'src/shared/exceptions/domain-exceptions';

export interface UpdateUserAvatarCommand {
  userId: string;
  fileId: string;
}

// Gán avatar cho user. Validate file tồn tại + thuộc về chính user (chống gán file người khác).
@Injectable()
export class UpdateUserAvatarUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IFileRepository) private readonly fileRepository: IFileRepository,
  ) {}

  async execute(cmd: UpdateUserAvatarCommand): Promise<UserEntity> {
    const file = await this.fileRepository.findById(cmd.fileId);
    if (!file) throw new FileNotFoundException(cmd.fileId);
    if (!file.isOwnedBy(cmd.userId)) throw new FileAccessDeniedException();

    const updated = await this.userRepository.updateAvatar(
      cmd.userId,
      cmd.fileId,
    );
    if (!updated) throw new UserNotFoundException(cmd.userId);
    return updated;
  }
}
