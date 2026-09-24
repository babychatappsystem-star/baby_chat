// Contract giữa FE và BE — khớp với backend src/modules/realtime/events/ws-events.ts.
// Khi BE cập nhật event, cập nhật file này tương ứng.

export const WS_EVENTS = {
  MESSAGE_NEW: 'message.new',
  FRIENDSHIP_REQUEST_RECEIVED: 'friendship.request_received',
  FRIENDSHIP_ACCEPTED: 'friendship.accepted',
  CONVERSATION_CREATED: 'conversation.created',
  REACTION_UPDATED: 'reaction.updated',
  CONVERSATION_READ: 'conversation.read',
  PRESENCE_ONLINE: 'presence.online',
  PRESENCE_OFFLINE: 'presence.offline',
} as const;

// Chính mình vừa đọc hội thoại trên thiết bị khác → xoá badge chưa đọc ở đây.
export interface ConversationReadPayload {
  conversationId: string;
  readAt: string;
}

export interface MessageNewPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  type?: 'text' | 'image' | 'sticker';
  stickerUrl?: string | null;
  fileUrl?: string | null;
  replyId?: string;
  replySnippet?: string;
  replySenderId?: string;
  createdAt: string;
}

export interface FriendshipRequestReceivedPayload {
  friendshipId: string;
  requesterId: string;
  requesterUsername: string;
}

export interface FriendshipAcceptedPayload {
  friendshipId: string;
  recipientId: string;
  recipientUsername: string;
}

export interface ConversationCreatedPayload {
  conversationId: string;
  type: string;
  participants: Array<{ userId: string; username: string }>;
}

export interface ReactionUpdatedPayload {
  messageId: string;
  conversationId: string;
  emoji: string;
  userId: string;
  action: 'add' | 'remove';
}

export interface PresenceOnlinePayload {
  userId: string;
}

export interface PresenceOfflinePayload {
  userId: string;
  lastSeenAt: string | null;
}

// Typed socket interface — IDE autocomplete event name + payload.
export interface ServerToClientEvents {
  'message.new': (p: MessageNewPayload) => void;
  'friendship.request_received': (p: FriendshipRequestReceivedPayload) => void;
  'friendship.accepted': (p: FriendshipAcceptedPayload) => void;
  'conversation.created': (p: ConversationCreatedPayload) => void;
  'reaction.updated': (p: ReactionUpdatedPayload) => void;
  'conversation.read': (p: ConversationReadPayload) => void;
  'presence.online': (p: PresenceOnlinePayload) => void;
  'presence.offline': (p: PresenceOfflinePayload) => void;
}

// Tab có đang hiển thị + được focus không — server dùng để bỏ qua push khi user đang xem app.
export interface ClientToServerEvents {
  'client.focus': (p: { focused: boolean }) => void;
}
