import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { TokenBlacklistService } from 'src/modules/auth/infrastructure/token-blacklist.service';
import { createWsJwtMiddleware, SocketDataShape } from '../auth/ws-jwt.middleware';
import {
  ConversationCreatedPayload,
  FriendshipAcceptedPayload,
  FriendshipRequestReceivedPayload,
  MessageNewPayload,
  ReactionUpdatedPayload,
  WS_EVENTS,
} from '../events/ws-events';

// Helper sinh tên room nhất quán giữa gateway và bridge.
export const userRoom = (userId: string) => `user:${userId}`;
export const convRoom = (conversationId: string) => `conv:${conversationId}`;

// Gateway Socket.IO chính. CORS để rộng (giống app.enableCors()) — siết lại khi có domain FE prod.
@WebSocketGateway({ cors: { origin: '*', credentials: true } })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  declare server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklist: TokenBlacklistService,
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
  ) {}

  onModuleInit() {
    // Gateway lifecycle không đảm bảo server có sẵn ngoài afterInit.
  }

  // Gắn middleware verify JWT trước khi accept connection.
  afterInit(server: Server) {
    server.use(createWsJwtMiddleware(this.jwtService, this.tokenBlacklist));
    this.logger.log('ChatGateway initialized with JWT middleware');
  }

  // Sau khi auth pass: join user room + tất cả conversation room của user.
  async handleConnection(socket: Socket) {
    const data = socket.data as SocketDataShape;
    const user = data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    await socket.join(userRoom(user.userId));

    try {
      const conversations = await this.conversationRepository.findByUserId(user.userId);
      for (const conv of conversations) {
        if (conv.id) await socket.join(convRoom(conv.id));
      }
      this.logger.debug(
        `User ${user.userId} connected (${socket.id}), joined ${conversations.length} conversations`,
      );
    } catch (err) {
      // Không kill connection nếu fetch lỗi — user vẫn nhận được notification cá nhân.
      this.logger.error(`Failed to load conversations for ${user.userId}`, err as any);
    }
  }

  handleDisconnect(socket: Socket) {
    // Socket.IO tự rời tất cả room khi disconnect — không cần làm gì thêm.
    this.logger.debug(`Socket disconnected ${socket.id}`);
  }

  // ─── Emit helpers — dùng bởi DomainEventsBridge ─────────────────────────────

  // Emit tin nhắn mới cho MỌI participant trong conversation, kể cả các thiết bị của
  // chính sender. Contract: WS là nguồn render duy nhất — FE không append từ REST response,
  // chỉ append từ message.new → mỗi tin đến đúng 1 lần, không cần dedupe.
  // (Trước đây .except(user:sender) loại cả các thiết bị khác của sender → multi-device miss tin — fix #4.)
  // senderId giữ lại để tham chiếu/tương lai, không dùng để filter nữa.
  emitMessageNew(conversationId: string, _senderId: string, payload: MessageNewPayload): void {
    this.server.to(convRoom(conversationId)).emit(WS_EVENTS.MESSAGE_NEW, payload);
  }

  emitFriendshipRequestReceived(
    recipientId: string,
    payload: FriendshipRequestReceivedPayload,
  ): void {
    this.server.to(userRoom(recipientId)).emit(WS_EVENTS.FRIENDSHIP_REQUEST_RECEIVED, payload);
  }

  emitFriendshipAccepted(requesterId: string, payload: FriendshipAcceptedPayload): void {
    this.server.to(userRoom(requesterId)).emit(WS_EVENTS.FRIENDSHIP_ACCEPTED, payload);
  }

  // Emit conversation.created cho tất cả participant + join sockets của họ vào conv room
  // để các tab đang mở nhận message.new ngay mà không phải reconnect.
  async emitConversationCreated(
    participantUserIds: string[],
    payload: ConversationCreatedPayload,
  ): Promise<void> {
    for (const uid of participantUserIds) {
      const sockets = await this.server.in(userRoom(uid)).fetchSockets();
      for (const s of sockets) {
        await s.join(convRoom(payload.conversationId));
      }
      this.server.to(userRoom(uid)).emit(WS_EVENTS.CONVERSATION_CREATED, payload);
    }
  }

  emitReactionUpdated(conversationId: string, payload: ReactionUpdatedPayload): void {
    this.server.to(convRoom(conversationId)).emit(WS_EVENTS.REACTION_UPDATED, payload);
  }
}
