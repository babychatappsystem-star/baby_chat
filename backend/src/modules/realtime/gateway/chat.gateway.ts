import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { TokenBlacklistService } from 'src/modules/auth/infrastructure/token-blacklist.service';
import {
  createWsJwtMiddleware,
  SocketDataShape,
} from '../auth/ws-jwt.middleware';
import { PresenceService } from '../presence/presence.service';
import {
  ConversationCreatedPayload,
  FriendshipAcceptedPayload,
  FriendshipRequestReceivedPayload,
  MessageNewPayload,
  ReactionUpdatedPayload,
  WS_CLIENT_EVENTS,
  WS_EVENTS,
} from '../events/ws-events';
import type { ClientFocusPayload } from '../events/ws-events';

// Helper sinh tên room nhất quán giữa gateway và bridge.
export const userRoom = (userId: string) => `user:${userId}`;
export const convRoom = (conversationId: string) => `conv:${conversationId}`;

// Gateway Socket.IO chính. CORS để rộng (giống app.enableCors()) — siết lại khi có domain FE prod.
@WebSocketGateway({ cors: { origin: '*', credentials: true } })
export class ChatGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  declare server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklist: TokenBlacklistService,
    @Inject(IConversationRepository)
    private readonly conversationRepository: IConversationRepository,
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IFriendshipRepository)
    private readonly friendshipRepository: IFriendshipRepository,
    private readonly presenceService: PresenceService,
  ) {}

  onModuleInit() {
    // Gateway lifecycle không đảm bảo server có sẵn ngoài afterInit.
  }

  // Gắn middleware verify JWT trước khi accept connection.
  afterInit(server: Server) {
    const verifyJwt = createWsJwtMiddleware(
      this.jwtService,
      this.tokenBlacklist,
    );
    server.use((socket, next) => void verifyJwt(socket, next));
    this.logger.log('ChatGateway initialized with JWT middleware');
  }

  // Sau khi auth pass: join user room + tất cả conversation room của user.
  // Nếu đây là kết nối đầu tiên (isFirstConnection), emit presence.online đến bạn bè.
  async handleConnection(socket: Socket) {
    const data = socket.data as SocketDataShape;
    const user = data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    await socket.join(userRoom(user.userId));

    try {
      const conversations = await this.conversationRepository.findByUserId(
        user.userId,
      );
      for (const conv of conversations) {
        if (conv.id) await socket.join(convRoom(conv.id));
      }
      this.logger.debug(
        `User ${user.userId} connected (${socket.id}), joined ${conversations.length} conversations`,
      );
    } catch (err) {
      this.logger.error(`Failed to load conversations for ${user.userId}`, err);
    }

    // Presence: ghi nhận kết nối, broadcast nếu vừa online
    const isFirstConnection = this.presenceService.userJoined(user.userId);
    if (isFirstConnection) {
      this.broadcastPresenceOnline(user.userId).catch((err) =>
        this.logger.error(
          `Failed to broadcast presence.online for ${user.userId}`,
          err,
        ),
      );
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`Socket disconnected ${socket.id}`);

    const data = socket.data as SocketDataShape;
    const user = data?.user;
    if (!user) return;

    // Presence: ghi nhận ngắt kết nối, broadcast nếu vừa offline
    this.presenceService.setSocketFocus(user.userId, socket.id, false);
    const isLastConnection = this.presenceService.userLeft(user.userId);
    if (isLastConnection) {
      // Ghi lastSeenAt vào DB (fire-and-forget; không block disconnect)
      const lastSeenAt = new Date();
      this.userRepository
        .updateLastSeen(user.userId, lastSeenAt)
        .catch((err) =>
          this.logger.error(
            `Failed to update lastSeen for ${user.userId}`,
            err,
          ),
        );
      this.broadcastPresenceOffline(user.userId, lastSeenAt).catch((err) =>
        this.logger.error(
          `Failed to broadcast presence.offline for ${user.userId}`,
          err,
        ),
      );
    }
  }

  @SubscribeMessage(WS_CLIENT_EVENTS.CLIENT_FOCUS)
  handleClientFocus(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ClientFocusPayload,
  ): void {
    const user = (socket.data as SocketDataShape).user;
    if (!user) return;
    this.presenceService.setSocketFocus(
      user.userId,
      socket.id,
      payload?.focused === true,
    );
  }

  // ─── Presence Broadcast helpers ─────────────────────────────────────────────

  private async broadcastPresenceOnline(userId: string): Promise<void> {
    // Kiểm tra hidePresence trước khi emit
    const userEntity = await this.userRepository.findById(userId);
    if (!userEntity || userEntity.hidePresence) return;

    const friendIds = await this.friendshipRepository.getFriendIds(userId);
    for (const fid of friendIds) {
      this.server.to(userRoom(fid)).emit(WS_EVENTS.PRESENCE_ONLINE, { userId });
    }
  }

  private async broadcastPresenceOffline(
    userId: string,
    lastSeenAt: Date,
  ): Promise<void> {
    // Kiểm tra hidePresence: nếu đang ẩn thì đã emit offline trước rồi, không cần emit lại
    const userEntity = await this.userRepository.findById(userId);
    if (userEntity?.hidePresence) return;

    const friendIds = await this.friendshipRepository.getFriendIds(userId);
    const lastSeenAtStr = lastSeenAt.toISOString();
    for (const fid of friendIds) {
      this.server.to(userRoom(fid)).emit(WS_EVENTS.PRESENCE_OFFLINE, {
        userId,
        lastSeenAt: lastSeenAtStr,
      });
    }
  }

  // ─── Emit helpers — dùng bởi DomainEventsBridge ─────────────────────────────

  // Emit tin nhắn mới cho MỌI participant trong conversation, kể cả các thiết bị của
  // chính sender. Contract: WS là nguồn render duy nhất — FE không append từ REST response,
  // chỉ append từ message.new → mỗi tin đến đúng 1 lần, không cần dedupe.
  emitMessageNew(
    conversationId: string,
    _senderId: string,
    payload: MessageNewPayload,
  ): void {
    this.server
      .to(convRoom(conversationId))
      .emit(WS_EVENTS.MESSAGE_NEW, payload);
  }

  emitFriendshipRequestReceived(
    recipientId: string,
    payload: FriendshipRequestReceivedPayload,
  ): void {
    this.server
      .to(userRoom(recipientId))
      .emit(WS_EVENTS.FRIENDSHIP_REQUEST_RECEIVED, payload);
  }

  emitFriendshipAccepted(
    requesterId: string,
    payload: FriendshipAcceptedPayload,
  ): void {
    this.server
      .to(userRoom(requesterId))
      .emit(WS_EVENTS.FRIENDSHIP_ACCEPTED, payload);
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
        s.join(convRoom(payload.conversationId));
      }
      this.server
        .to(userRoom(uid))
        .emit(WS_EVENTS.CONVERSATION_CREATED, payload);
    }
  }

  // Hội thoại đã xoá: đưa mọi socket ra khỏi room để không còn nhận event của nó.
  removeConversationRoom(conversationId: string): void {
    this.server
      .in(convRoom(conversationId))
      .socketsLeave(convRoom(conversationId));
  }

  emitReactionUpdated(
    conversationId: string,
    payload: ReactionUpdatedPayload,
  ): void {
    this.server
      .to(convRoom(conversationId))
      .emit(WS_EVENTS.REACTION_UPDATED, payload);
  }
}
