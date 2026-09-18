// Auth
export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
  access_token_expires_at: string;
  refresh_token_expires_in: number;
  refresh_token_expires_at: string;
}

// GET /auth/profile — thông tin user hiện tại.
export interface ProfileDTO {
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  hidePresence?: boolean;
  expressiveChatThresholds?: number;
  expressiveChatTransitionTime?: number;
}

// ── Files ──
export type FileCategory = 'user_avatar' | 'conversation_avatar' | 'message_image' | 'other';

// POST /files — response sau khi upload.
export interface FileUploadResponse {
  id: string;
  category: FileCategory;
  url: string;
  thumbnailUrl?: string;
  mimetype: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
}

// Conversations
export type ConversationType = 'direct' | 'group';

export interface ConversationParticipant {
  userId: string;
  username?: string;
  role: 'admin' | 'member';
  joinedAt: string;
  isActive: boolean;
  avatarUrl?: string;
}

export interface ConversationDTO {
  id: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  participants: ConversationParticipant[];
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

// GET /conversations/:id/pages — danh sách các trang tin nhắn.
export interface ConversationPageInfo {
  pageNumber: number;
  pageId: string;
  messageCount: number;
}

export interface ConversationPagesResponse {
  totalPages: number;
  limit: number;
  items: ConversationPageInfo[];
}

// GET /conversations/messages/:conversationId/:pageNum — tin nhắn trong 1 trang.
export interface MessageDTO {
  id: string;
  senderId?: string;
  content: string;
  replyId?: string;
  replySnippet?: string;
  replySenderId?: string;
  reactions?: Array<{ userId: string; emoji: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SendVerificationLinkPayload {
  email: string;
}

export interface VerifyRegistrationPayload {
  email: string;
  token: string;
  password?: string;
  username?: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

// ── Friends ──
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

// Đối phương trong một quan hệ — luôn là người KHÁC với user hiện tại.
export interface FriendPeer {
  userId: string;
  username: string | null; // null nếu user đó đã bị xóa
  avatarUrl?: string | null;
}

// Item trả về từ /friendships, /friendships/requests/incoming, /outgoing
export interface FriendshipDTO {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  friend: FriendPeer;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
}

// Friend code của user hiện tại — GET /users/me/friend-code
export interface FriendCodeResponse {
  friendCode: string;
}

// Preview user theo friend code — GET /users/by-friend-code/:code
// hoặc tìm theo email — GET /users/search?email=...
export interface UserSearchResultDTO {
  id: string;
  username: string;
  email?: string; // Optional (không trả về khi tìm bằng friend code)
  avatarUrl?: string | null;
}

// Friendship vừa tạo — POST /friendships/requests(/by-code)
export interface FriendshipRequestResult {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

// Shape lỗi chuẩn từ server
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}