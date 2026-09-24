import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { JwtAuthGuard } from 'src/modules/auth/interfaces/guards/jwt-auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { CreateConversationUseCase } from 'src/modules/conversation/application/use-cases/create-conversation.usecase';
import { DeleteConversationUseCase } from 'src/modules/conversation/application/use-cases/delete-conversation.usecase';
import { SendMessageUseCase } from 'src/modules/conversation/application/use-cases/send-message.usecase';
import { UpdateMyParticipantUsernameUseCase } from 'src/modules/conversation/application/use-cases/update-my-participant-username.usecase';
import { UpdateConversationAvatarUseCase } from 'src/modules/conversation/application/use-cases/update-conversation-avatar.usecase';
import {
  GetConversationsByUserUseCase,
  GetConversationByIdUseCase,
  GetMessagesByPageUseCase,
  GetPageListUseCase,
} from 'src/modules/conversation/application/use-cases/get-conversation.usecase';
import { MarkConversationReadUseCase } from 'src/modules/conversation/application/use-cases/mark-conversation-read.usecase';
import { AddReactionUseCase } from 'src/modules/conversation/application/use-cases/add-reaction.usecase';
import { RemoveReactionUseCase } from 'src/modules/conversation/application/use-cases/remove-reaction.usecase';
import { FileUrlResolver } from 'src/modules/file/application/file-url-resolver.service';
import { CreateConvDto } from './dto/create-conv.dto';
import { CreateMessageDto } from 'src/modules/message/interfaces/dto/create-message.dto';
import { UpdateMyParticipantUsernameDto } from './dto/update-participant-username.dto';
import { UpdateConversationAvatarDto } from './dto/update-conversation-avatar.dto';
import { ReactionDto } from './dto/reaction.dto';
import {
  ConversationResponseDto,
  MessageResponseDto,
  PageRefResponseDto,
} from './dto/conversation-response.dto';
import { ConversationResponseMapper } from './dto/conversation.mapper';

// Controller cho conversations + gửi tin nhắn. Toàn bộ route cần JWT.
@ApiTags('conversations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly createConversationUseCase: CreateConversationUseCase,
    private readonly deleteConversationUseCase: DeleteConversationUseCase,
    private readonly updateMyParticipantUsernameUseCase: UpdateMyParticipantUsernameUseCase,
    private readonly updateConversationAvatarUseCase: UpdateConversationAvatarUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly getConversationsByUserUseCase: GetConversationsByUserUseCase,
    private readonly getConversationByIdUseCase: GetConversationByIdUseCase,
    private readonly getMessagesByPageUseCase: GetMessagesByPageUseCase,
    private readonly getPageListUseCase: GetPageListUseCase,
    private readonly addReactionUseCase: AddReactionUseCase,
    private readonly removeReactionUseCase: RemoveReactionUseCase,
    private readonly markConversationReadUseCase: MarkConversationReadUseCase,
    private readonly fileUrlResolver: FileUrlResolver,
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  // Helper resolve avatarUrl cho 1 conversation entity.
  private async resolveAvatarUrl(
    avatarFileId?: string,
  ): Promise<string | null> {
    const resolved = await this.fileUrlResolver.resolve(avatarFileId);
    return resolved?.url ?? null;
  }

  @ApiOperation({ summary: 'Lấy danh sách hội thoại của user' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  // GET /conversations — danh sách conversation của user đang đăng nhập.
  @Get()
  async getAllConversations(
    @CurrentUser('userId') userId: string,
  ): Promise<ConversationResponseDto[]> {
    const result = await this.getConversationsByUserUseCase.execute(userId);
    // Batch resolve avatarUrl của tất cả conversation tránh N+1.
    const avatarMap = await this.fileUrlResolver.resolveMany(
      result.map((r) => r.conversation.avatarFileId),
    );
    const urlMap = new Map<string, string>();
    for (const [fileId, resolved] of avatarMap)
      urlMap.set(fileId, resolved.url);

    // Fetch participant avatars
    const participantUserIds = new Set<string>();
    for (const r of result) {
      r.conversation.participants.forEach((p) =>
        participantUserIds.add(p.userId),
      );
    }
    const participants = await this.userRepository.findByIds(
      Array.from(participantUserIds),
    );
    const participantAvatarFileIds = participants
      .map((p) => p.avatarFileId)
      .filter((id) => !!id) as string[];
    const participantAvatarMap = await this.fileUrlResolver.resolveMany(
      participantAvatarFileIds,
    );

    const participantUrlMap = new Map<string, string>();
    for (const user of participants) {
      if (user.avatarFileId) {
        const resolved = participantAvatarMap.get(user.avatarFileId);
        if (resolved) participantUrlMap.set(user.id!, resolved.url);
      }
    }

    return result.map((r) => {
      const dto = ConversationResponseMapper.toConversationDto(
        r.conversation,
        r.conversation.avatarFileId
          ? urlMap.get(r.conversation.avatarFileId)
          : null,
        participantUrlMap,
      );
      if (r.lastMessage) {
        // Client tự dựng preview theo type (ảnh/sticker không có chữ).
        dto.lastMessage = r.lastMessage.content;
        dto.lastMessageType = r.lastMessage.type;
        dto.lastMessageAt = r.lastMessage.createdAt;
      }
      dto.unreadCount = r.unreadCount;
      return dto;
    });
  }

  @ApiOperation({ summary: 'Lấy hội thoại theo ID' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Không phải participant của conversation',
  })
  // GET /conversations/:id — chi tiết conversation. 404 nếu không tồn tại.
  @Get(':id')
  async getConversationById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<ConversationResponseDto> {
    const result = await this.getConversationByIdUseCase.execute(id, userId);
    const avatarUrl = await this.resolveAvatarUrl(result.avatarFileId);

    const participantUserIds = result.participants.map((p) => p.userId);
    const participants =
      await this.userRepository.findByIds(participantUserIds);
    const participantAvatarFileIds = participants
      .map((p) => p.avatarFileId)
      .filter((fileId) => !!fileId) as string[];
    const participantAvatarMap = await this.fileUrlResolver.resolveMany(
      participantAvatarFileIds,
    );

    const participantUrlMap = new Map<string, string>();
    for (const user of participants) {
      if (user.avatarFileId) {
        const resolved = participantAvatarMap.get(user.avatarFileId);
        if (resolved) participantUrlMap.set(user.id!, resolved.url);
      }
    }

    return ConversationResponseMapper.toConversationDto(
      result,
      avatarUrl,
      participantUrlMap,
    );
  }

  @ApiOperation({ summary: 'Tạo hội thoại mới' })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  // POST /conversations — tạo conversation mới. Creator (từ JWT) tự động là admin.
  @Post()
  async createConversation(
    @Body() dto: CreateConvDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ConversationResponseDto> {
    const result = await this.createConversationUseCase.execute({
      type: dto.type,
      createdByUserId: userId,
      participantUserIds: dto.participants.map((p) => p.userId.toString()),
      name: dto.name,
      description: dto.description,
      avatar: dto.avatar,
    });
    return ConversationResponseMapper.toConversationDto(result);
  }

  @ApiOperation({ summary: 'Gửi tin nhắn trong hội thoại' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  // POST /conversations/messages — gửi tin nhắn. Sender lấy từ JWT, không nhận từ body.
  @Post('/messages')
  async sendMessage(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const result = await this.sendMessageUseCase.execute({
      conversationId: dto.conversationId.toString(),
      senderId: userId,
      content: dto.content,
      type: dto.type,
      fileId: dto.fileId,
      stickerId: dto.stickerId,
      replyId: dto.replyId?.toString(),
    });
    // Chỉ resolve URL cho image message (mapper cũng gate lại theo type).
    const fileUrl =
      result.type === 'image'
        ? await this.fileUrlResolver.resolve(result.fileId)
        : null;
    return ConversationResponseMapper.toMessageDto(result, fileUrl?.url);
  }

  @ApiOperation({ summary: 'Lấy tin nhắn theo trang' })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  // GET /conversations/messages/:conversationId/:pageNum — lấy tin nhắn của 1 trang.
  @ApiResponse({
    status: 403,
    description: 'Không phải participant của conversation',
  })
  @Get('/messages/:conversationId/:pageNum')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Param('pageNum') pageNum: string,
    @CurrentUser('userId') userId: string,
  ): Promise<MessageResponseDto[]> {
    const result = await this.getMessagesByPageUseCase.execute(
      conversationId,
      Number(pageNum),
      userId,
    );
    // Batch resolve fileUrl — chỉ lấy fileId của image message (tránh rò URL + query thừa).
    const imageFileIds = result
      .filter((m) => m.type === 'image')
      .map((m) => m.fileId);
    const fileMap = await this.fileUrlResolver.resolveMany(imageFileIds);
    const urlMap = new Map<string, string>();
    for (const [fileId, resolved] of fileMap) urlMap.set(fileId, resolved.url);
    return ConversationResponseMapper.toMessageListDto(result, urlMap);
  }

  @ApiOperation({ summary: 'Lấy danh sách trang của hội thoại' })
  @ApiResponse({ status: 200, type: PageRefResponseDto })
  // GET /conversations/:id/pages — danh sách trang (metadata) của conversation.
  @ApiResponse({
    status: 403,
    description: 'Không phải participant của conversation',
  })
  @Get(':id/pages')
  async getPages(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<PageRefResponseDto> {
    const result = await this.getPageListUseCase.execute(
      conversationId,
      userId,
    );
    return ConversationResponseMapper.toPageRefDto(result);
  }

  @ApiOperation({
    summary: 'Đổi username (nickname) của mình trong conversation',
  })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Không phải participant của conversation',
  })
  @ApiResponse({ status: 404, description: 'Conversation không tồn tại' })
  // PATCH /conversations/:id/participants/me/username — user tự đặt nickname cho mình
  // trong conversation này. Không ảnh hưởng User.username gốc.
  @Patch(':id/participants/me/username')
  async updateMyUsername(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateMyParticipantUsernameDto,
  ): Promise<ConversationResponseDto> {
    const result = await this.updateMyParticipantUsernameUseCase.execute({
      conversationId,
      userId,
      newUsername: dto.username,
    });
    const avatarUrl = await this.resolveAvatarUrl(result.avatarFileId);
    return ConversationResponseMapper.toConversationDto(result, avatarUrl);
  }

  @ApiOperation({ summary: 'Cập nhật avatar của hội thoại (admin/creator)' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền hoặc fileId không thuộc về bạn',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation hoặc file không tồn tại',
  })
  // PATCH /conversations/:id/avatar — gán avatar đã upload (POST /files). Chỉ admin/creator.
  @Patch(':id/avatar')
  async updateAvatar(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateConversationAvatarDto,
  ): Promise<ConversationResponseDto> {
    const result = await this.updateConversationAvatarUseCase.execute({
      conversationId,
      userId,
      fileId: dto.fileId,
    });
    const avatarUrl = await this.resolveAvatarUrl(result.avatarFileId);
    return ConversationResponseMapper.toConversationDto(result, avatarUrl);
  }

  @ApiOperation({ summary: 'Đánh dấu đã đọc hết hội thoại' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 403,
    description: 'Không phải participant của conversation',
  })
  @HttpCode(204)
  // POST /conversations/:id/read — đẩy mốc đã đọc của user hiện tại lên bây giờ.
  @Post(':id/read')
  async markRead(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.markConversationReadUseCase.execute({ conversationId, userId });
  }

  @ApiOperation({ summary: 'Xóa hội thoại (soft delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền (không phải admin/creator của group)',
  })
  @ApiResponse({ status: 404, description: 'Hội thoại không tồn tại' })
  @HttpCode(204)
  // DELETE /conversations/:id — soft delete. Direct: bất kỳ participant. Group/channel: chỉ admin/creator.
  @Delete(':id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.deleteConversationUseCase.execute({ conversationId, userId });
  }

  @ApiOperation({ summary: 'Thả reaction vào tin nhắn' })
  @ApiResponse({ status: 201 })
  @Post(':conversationId/messages/:messageId/reactions')
  async addReaction(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: ReactionDto,
  ): Promise<void> {
    await this.addReactionUseCase.execute({
      conversationId,
      messageId,
      userId,
      emoji: body.emoji,
    });
  }

  @ApiOperation({ summary: 'Bỏ reaction khỏi tin nhắn' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':conversationId/messages/:messageId/reactions')
  async removeReaction(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: ReactionDto,
  ): Promise<void> {
    await this.removeReactionUseCase.execute({
      conversationId,
      messageId,
      userId,
      emoji: body.emoji,
    });
  }
}
