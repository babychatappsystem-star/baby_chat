import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/interfaces/guards/jwt-auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { GetAllUsersUseCase, GetUserByIdUseCase, DeleteUserUseCase } from 'src/modules/user/application/use-cases/get-users.usecase';
import { GetOrCreateFriendCodeUseCase } from 'src/modules/user/application/use-cases/get-or-create-friend-code.usecase';
import { RegenerateFriendCodeUseCase } from 'src/modules/user/application/use-cases/regenerate-friend-code.usecase';
import { GetUserByFriendCodeUseCase } from 'src/modules/user/application/use-cases/get-user-by-friend-code.usecase';
import { UpdateUserAvatarUseCase } from 'src/modules/user/application/use-cases/update-user-avatar.usecase';
import { UpdatePresenceSettingsUseCase } from 'src/modules/user/application/use-cases/update-presence-settings.usecase';
import { GetFriendsPresenceUseCase } from 'src/modules/user/application/use-cases/get-friends-presence.usecase';
import { FileUrlResolver } from 'src/modules/file/application/file-url-resolver.service';

import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UserPublicDto } from './dto/user-public.dto';
import { FriendCodeResponseDto } from './dto/friend-code.dto';
import { PaginationQueryDto, PaginatedUsersResponseDto } from './dto/pagination.dto';
import { UpdatePresenceSettingsDto, FriendPresenceItemDto } from './dto/presence.dto';

// Controller cho các endpoint quản lý user. POST /users public, các endpoint khác cần JWT.
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(

    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly getOrCreateFriendCodeUseCase: GetOrCreateFriendCodeUseCase,
    private readonly regenerateFriendCodeUseCase: RegenerateFriendCodeUseCase,
    private readonly getUserByFriendCodeUseCase: GetUserByFriendCodeUseCase,
    private readonly updateUserAvatarUseCase: UpdateUserAvatarUseCase,
    private readonly fileUrlResolver: FileUrlResolver,
    private readonly updatePresenceSettingsUseCase: UpdatePresenceSettingsUseCase,
    private readonly getFriendsPresenceUseCase: GetFriendsPresenceUseCase,
  ) {}



  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách users (có phân trang)' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  // GET /users — yêu cầu JWT. Có hỗ trợ phân trang page và limit.
  @Get()
  async getAllUsers(@Query() query: PaginationQueryDto): Promise<PaginatedUsersResponseDto> {
    const result = await this.getAllUsersUseCase.execute(query);
    const avatarMap = await this.fileUrlResolver.resolveMany(
      result.items.map((u) => u.avatarFileId),
    );
    return {
      items: result.items.map((user) => {
        const resolved = user.avatarFileId ? avatarMap.get(user.avatarFileId) : null;
        return UserPublicDto.fromEntity(user, resolved?.url);
      }),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy friend code của user hiện tại (tự sinh nếu chưa có)' })
  @ApiResponse({ status: 200, type: FriendCodeResponseDto })
  // GET /users/me/friend-code — code dùng để người khác gửi friend request.
  // Lazy-init: nếu user chưa có code thì sinh + lưu rồi trả về.
  @Get('me/friend-code')
  async getMyFriendCode(@CurrentUser('userId') userId: string): Promise<FriendCodeResponseDto> {
    const code = await this.getOrCreateFriendCodeUseCase.execute(userId);
    return { friendCode: code };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sinh friend code mới (vô hiệu code cũ)' })
  @ApiResponse({ status: 200, type: FriendCodeResponseDto })
  // POST /users/me/friend-code/regenerate — dùng khi user muốn vô hiệu code cũ (bị spam).
  @Post('me/friend-code/regenerate')
  async regenerateMyFriendCode(@CurrentUser('userId') userId: string): Promise<FriendCodeResponseDto> {
    const code = await this.regenerateFriendCodeUseCase.execute(userId);
    return { friendCode: code };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật avatar của user hiện tại' })
  @ApiResponse({ status: 200, type: UserPublicDto })
  @ApiResponse({ status: 403, description: 'fileId không thuộc về bạn' })
  @ApiResponse({ status: 404, description: 'file không tồn tại' })
  // PATCH /users/me/avatar — gán avatar đã upload trước đó qua POST /files.
  @Patch('me/avatar')
  async updateMyAvatar(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAvatarDto,
  ): Promise<UserPublicDto> {
    const user = await this.updateUserAvatarUseCase.execute({ userId, fileId: dto.fileId });
    const resolved = await this.fileUrlResolver.resolve(user.avatarFileId);
    return UserPublicDto.fromEntity(user, resolved?.url);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tra cứu user theo friend code (preview trước khi gửi request)' })
  @ApiResponse({ status: 200, type: UserPublicDto })
  @ApiResponse({ status: 404, description: 'Friend code không tồn tại' })
  // GET /users/by-friend-code/:code — trả thông tin public user để FE hiển thị preview
  // trước khi gửi friend request. Code không phân biệt hoa thường.
  @Get('by-friend-code/:code')
  async getByFriendCode(@Param('code') code: string): Promise<UserPublicDto> {
    const user = await this.getUserByFriendCodeUseCase.execute(code);
    const resolved = await this.fileUrlResolver.resolve(user.avatarFileId);
    return UserPublicDto.fromEntity(user, resolved?.url);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy user theo ID' })
  // GET /users/:id — yêu cầu JWT. 404 nếu không tồn tại.
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.getUserByIdUseCase.execute(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xóa user theo ID (chỉ chính mình hoặc admin)' })
  @ApiResponse({ status: 204, description: 'Xóa user thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa user này' })
  @ApiResponse({ status: 404, description: 'User không tồn tại' })
  @HttpCode(204)
  // DELETE /users/:id — yêu cầu JWT. Lưu ý chưa cascade xóa conversation/message.
  @Delete(':id')
  async deleteUser(
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('roles') roles: string[] | undefined,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteUserUseCase.execute({
      targetUserId: id,
      requesterId: currentUserId,
      roles,
    });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật cài đặt trạng thái hoạt động (ẩn/hiện)' })
  @ApiResponse({ status: 200 })
  // PATCH /users/me/presence — toggle hidePresence; gateway tự emit WS event đến bạn bè.
  @Patch('me/presence')
  async updateMyPresenceSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePresenceSettingsDto,
  ): Promise<{ hidePresence: boolean }> {
    await this.updatePresenceSettingsUseCase.execute(userId, dto.hidePresence);
    return { hidePresence: dto.hidePresence };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy trạng thái online của tất cả bạn bè (bootstrap khi mở app)' })
  @ApiResponse({ status: 200, type: [FriendPresenceItemDto] })
  // GET /users/me/friends/presence — FE dùng để bootstrap PresenceContext khi mở app.
  @Get('me/friends/presence')
  async getMyFriendsPresence(
    @CurrentUser('userId') userId: string,
  ): Promise<FriendPresenceItemDto[]> {
    return this.getFriendsPresenceUseCase.execute(userId);
  }
}
