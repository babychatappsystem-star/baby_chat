import { Inject, Injectable } from '@nestjs/common';

import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import {
  UserNotFoundException,
  UserAccessDeniedException,
} from 'src/shared/exceptions/domain-exceptions';

export interface DeleteUserCommand {
  targetUserId: string;
  requesterId: string;
  roles?: string[];
}

// Lấy chi tiết user theo id; throw 404 nếu không tồn tại.
@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  }
}

// Xóa user theo id; chỉ cho phép chính chủ hoặc admin xóa.
// Lưu ý: chưa cascade xóa các conversation/message liên quan.
@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const isAdmin = command.roles?.includes('admin');
    if (command.requesterId !== command.targetUserId && !isAdmin) {
      throw new UserAccessDeniedException();
    }

    const user = await this.userRepository.findById(command.targetUserId);
    if (!user) throw new UserNotFoundException(command.targetUserId);
    await this.userRepository.delete(command.targetUserId);
  }
}
