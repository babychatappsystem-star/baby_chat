import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/interfaces/guards/jwt-auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { SendFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/send-friend-request.usecase';
import { SendFriendRequestByCodeUseCase } from 'src/modules/friendship/application/use-cases/send-friend-request-by-code.usecase';
import { AcceptFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/accept-friend-request.usecase';
import { RejectFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/reject-friend-request.usecase';
import { CancelFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/cancel-friend-request.usecase';
import { UnfriendUseCase } from 'src/modules/friendship/application/use-cases/unfriend.usecase';
import { BlockUserUseCase } from 'src/modules/friendship/application/use-cases/block-user.usecase';
import { UnblockUserUseCase } from 'src/modules/friendship/application/use-cases/unblock-user.usecase';
import {
  ListFriendsUseCase,
  ListIncomingRequestsUseCase,
  ListOutgoingRequestsUseCase,
} from 'src/modules/friendship/application/use-cases/list-friendships.usecase';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { FriendshipEntity } from 'src/modules/friendship/domain/friendship.entity';
import { FileUrlResolver } from 'src/modules/file/application/file-url-resolver.service';
import { BlockUserDto, SendFriendRequestByCodeDto, SendFriendRequestDto } from './dto/friend-request.dto';
import { FriendshipResponseDto, FriendshipResponseMapper } from './dto/friendship-response.dto';

@ApiTags('friendships')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('friendships')
export class FriendshipController {
  constructor(
    private readonly sendRequest: SendFriendRequestUseCase,
    private readonly sendRequestByCode: SendFriendRequestByCodeUseCase,
    private readonly acceptRequest: AcceptFriendRequestUseCase,
    private readonly rejectRequest: RejectFriendRequestUseCase,
    private readonly cancelRequest: CancelFriendRequestUseCase,
    private readonly unfriend: UnfriendUseCase,
    private readonly blockUser: BlockUserUseCase,
    private readonly unblockUser: UnblockUserUseCase,
    private readonly listFriends: ListFriendsUseCase,
    private readonly listIncoming: ListIncomingRequestsUseCase,
    private readonly listOutgoing: ListOutgoingRequestsUseCase,
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    private readonly fileUrlResolver: FileUrlResolver,
  ) {}

  private async buildUserMetaMap(
    entities: FriendshipEntity[],
    currentUserId: string,
  ): Promise<Map<string, { username: string; avatarUrl: string | null }>> {
    const otherIds = entities.map((e) => e.otherUserId(currentUserId));
    const users = await this.userRepository.findByIds(otherIds);
    
    // Thu thập tất cả avatarFileId để resolve 1 lần
    const fileIds = users.map((u) => u.avatarFileId).filter((id): id is string => !!id);
    const resolvedUrls = await this.fileUrlResolver.resolveMany(fileIds);

    return new Map(users.map((u) => {
      const url = u.avatarFileId ? resolvedUrls.get(u.avatarFileId)?.url ?? null : null;
      return [u.id!, { username: u.username, avatarUrl: url }];
    }));
  }

  @ApiOperation({ summary: 'Danh sách bạn bè của user hiện tại' })
  @ApiResponse({ status: 200, type: [FriendshipResponseDto] })
  @Get()
  async getFriends(@CurrentUser('userId') userId: string): Promise<FriendshipResponseDto[]> {
    const result = await this.listFriends.execute(userId);
    const userMetaMap = await this.buildUserMetaMap(result, userId);
    return FriendshipResponseMapper.toListDtoWithFriend(result, userId, userMetaMap);
  }

  @ApiOperation({ summary: 'Gửi lời mời kết bạn (bằng userId)' })
  @ApiResponse({ status: 201, type: FriendshipResponseDto })
  @Post('/requests')
  async send(
    @CurrentUser('userId') userId: string,
    @Body() dto: SendFriendRequestDto,
  ): Promise<FriendshipResponseDto> {
    const result = await this.sendRequest.execute({
      requesterId: userId,
      recipientId: dto.recipientId,
    });
    return FriendshipResponseMapper.toDto(result);
  }

  @ApiOperation({ summary: 'Gửi lời mời kết bạn bằng friend code' })
  @ApiResponse({ status: 201, type: FriendshipResponseDto })
  @ApiResponse({ status: 404, description: 'Friend code không tồn tại' })
  @Post('/requests/by-code')
  async sendByCode(
    @CurrentUser('userId') userId: string,
    @Body() dto: SendFriendRequestByCodeDto,
  ): Promise<FriendshipResponseDto> {
    const result = await this.sendRequestByCode.execute({
      requesterId: userId,
      friendCode: dto.friendCode,
    });
    return FriendshipResponseMapper.toDto(result);
  }

  @ApiOperation({ summary: 'Lời mời đang chờ user hiện tại duyệt' })
  @ApiResponse({ status: 200, type: [FriendshipResponseDto] })
  @Get('/requests/incoming')
  async incoming(@CurrentUser('userId') userId: string): Promise<FriendshipResponseDto[]> {
    const result = await this.listIncoming.execute(userId);
    const userMetaMap = await this.buildUserMetaMap(result, userId);
    return FriendshipResponseMapper.toListDtoWithFriend(result, userId, userMetaMap);
  }

  @ApiOperation({ summary: 'Lời mời user hiện tại đã gửi, chưa được duyệt' })
  @ApiResponse({ status: 200, type: [FriendshipResponseDto] })
  @Get('/requests/outgoing')
  async outgoing(@CurrentUser('userId') userId: string): Promise<FriendshipResponseDto[]> {
    const result = await this.listOutgoing.execute(userId);
    const userMetaMap = await this.buildUserMetaMap(result, userId);
    return FriendshipResponseMapper.toListDtoWithFriend(result, userId, userMetaMap);
  }

  @ApiOperation({ summary: 'Chấp nhận lời mời kết bạn' })
  @ApiResponse({ status: 200, type: FriendshipResponseDto })
  @HttpCode(200)
  @Post('/requests/:id/accept')
  async accept(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<FriendshipResponseDto> {
    const result = await this.acceptRequest.execute({
      friendshipId: id,
      acceptedByUserId: userId,
    });
    return FriendshipResponseMapper.toDto(result);
  }

  @ApiOperation({ summary: 'Từ chối lời mời kết bạn (xóa request)' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Post('/requests/:id/reject')
  async reject(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.rejectRequest.execute({ friendshipId: id, rejectedByUserId: userId });
  }

  @ApiOperation({ summary: 'Hủy lời mời đã gửi (requester gọi)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Lời mời không tồn tại, đã được duyệt, hoặc user không phải requester' })
  @HttpCode(204)
  @Delete('/requests/:id')
  async cancel(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.cancelRequest.execute({ friendshipId: id, cancelledByUserId: userId });
  }

  @ApiOperation({ summary: 'Chặn một user' })
  @ApiResponse({ status: 201, type: FriendshipResponseDto })
  @Post('/block')
  async block(
    @CurrentUser('userId') userId: string,
    @Body() dto: BlockUserDto,
  ): Promise<FriendshipResponseDto> {
    const result = await this.blockUser.execute({
      blockerId: userId,
      blockedId: dto.userId,
    });
    return FriendshipResponseMapper.toDto(result);
  }

  @ApiOperation({ summary: 'Bỏ chặn một user' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete('/block/:userId')
  async unblock(
    @CurrentUser('userId') userId: string,
    @Param('userId') blockedUserId: string,
  ): Promise<void> {
    await this.unblockUser.execute({ unblockerId: userId, blockedId: blockedUserId });
  }

  @ApiOperation({ summary: 'Hủy kết bạn với một user' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete('/friends/:friendUserId')
  async removeFriend(
    @CurrentUser('userId') userId: string,
    @Param('friendUserId') friendUserId: string,
  ): Promise<void> {
    await this.unfriend.execute({ userId, friendUserId });
  }
}
