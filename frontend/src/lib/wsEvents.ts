// Contract giữa FE và BE — khớp với backend src/modules/realtime/events/ws-events.ts.
// Khi BE cập nhật event, cập nhật file này tương ứng.

export const WS_EVENTS = {
  MESSAGE_NEW: 'message.new',
  FRIENDSHIP_REQUEST_RECEIVED: 'friendship.request_received',
  FRIENDSHIP_ACCEPTED: 'friendship.accepted',
  CONVERSATION_CREATED: 'conversation.created',
} as const;

export interface MessageNewPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
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

// Typed socket interface — IDE autocomplete event name + payload.
export interface ServerToClientEvents {
  'message.new': (p: MessageNewPayload) => void;
  'friendship.request_received': (p: FriendshipRequestReceivedPayload) => void;
  'friendship.accepted': (p: FriendshipAcceptedPayload) => void;
  'conversation.created': (p: ConversationCreatedPayload) => void;
}

// Hiện chưa có client-to-server event nào.
export type ClientToServerEvents = Record<string, never>;
