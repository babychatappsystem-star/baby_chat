import { Inject, Injectable } from '@nestjs/common';

import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import { UserNotFoundException, UserAccessDeniedException } from 'src/shared/exceptions/domain-exceptions';

export interface DeleteUserCommand {
  targetUserId: string;
  requesterId: string;
  roles?: string[];
}

export interface GetAllUsersQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedUsersResult {
  items: UserEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Lấy danh sách user có phân trang.
@Injectable()
export class GetAllUsersUseCase {
  constructor(@Inject(IUserRepository) private readonly userRepository: IUserRepository) {}

  async execute(query?: GetAllUsersQuery): Promise<PaginatedUsersResult> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));

    const { items, total } = await this.userRepository.findPaginated(page, limit);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

// Lấy chi tiết user theo id; throw 404 nếu không tồn tại.
@Injectable()
export class GetUserByIdUseCase {
  constructor(@Inject(IUserRepository) private readonly userRepository: IUserRepository) {}

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
  constructor(@Inject(IUserRepository) private readonly userRepository: IUserRepository) {}

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
