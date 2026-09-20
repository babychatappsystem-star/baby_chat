// Contract giữa BE và FE cho mọi event WebSocket. FE có thể copy file này
// hoặc import qua codegen sau này.

export const WS_EVENTS = {
  MESSAGE_NEW: 'message.new',
  FRIENDSHIP_REQUEST_RECEIVED: 'friendship.request_received',
  FRIENDSHIP_ACCEPTED: 'friendship.accepted',
  CONVERSATION_CREATED: 'conversation.created',
  REACTION_UPDATED: 'reaction.updated',
  PRESENCE_ONLINE: 'presence.online',
  PRESENCE_OFFLINE: 'presence.offline',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// Tin nhắn mới trong conversation. Emit cho MỌI participant, KỂ CẢ sender
// (mọi thiết bị). Contract: WS là nguồn render duy nhất — FE render tin từ
// message.new, KHÔNG append từ REST response (tránh trùng). Mỗi tin đến 1 lần.
export interface MessageNewPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  type: string; // 'text' | 'image' | 'sticker'
  fileUrl?: string | null; // URL ảnh khi type='image'
  stickerUrl?: string | null; // URL ảnh khi type='sticker'
  replyId?: string;
  replySnippet?: string;
  replySenderId?: string;
  createdAt: string; // ISO 8601
}

// Có người gửi lời mời kết bạn cho mình.
export interface FriendshipRequestReceivedPayload {
  friendshipId: string;
  requesterId: string;
  requesterUsername: string;
}

// Lời mời mình gửi đã được accept.
export interface FriendshipAcceptedPayload {
  friendshipId: string;
  recipientId: string;
  recipientUsername: string;
}

// Có conversation mới mà mình là participant.
export interface ConversationCreatedPayload {
  conversationId: string;
  type: string; // 'direct' | 'group' | 'channel'
  participants: Array<{ userId: string; username: string }>;
}

export interface ReactionUpdatedPayload {
  messageId: string;
  conversationId: string;
  emoji: string;
  userId: string;
  action: 'add' | 'remove';
}

// user vừa online (không còn offline).
export interface PresenceOnlinePayload {
  userId: string;
}

// user vừa offline. lastSeenAt=null khi user ẩn trạng thái.
export interface PresenceOfflinePayload {
  userId: string;
  lastSeenAt: string | null; // ISO 8601 hoặc null
}
