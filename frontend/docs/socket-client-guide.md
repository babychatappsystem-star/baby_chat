# Socket Client Guide — Hướng dẫn FE kết nối WebSocket

Tài liệu cho FE (React + TypeScript) tích hợp realtime với BabyChat backend.

- Server: `http://localhost:3000` (cùng port với REST)
- Transport: Socket.IO 4.x
- Auth: JWT trong handshake `auth.token`

---

## 1. Cài đặt

```bash
npm i socket.io-client
```

> Phiên bản client nên khớp major version với server (`socket.io@4.x`). Khác major → có thể không kết nối được.

---

## 2. Kết nối cơ bản

```ts
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000', {
  auth: { token: accessToken }, // JWT access_token từ /auth/login
  autoConnect: true,
  reconnection: true,
  transports: ['websocket'], // skip long-polling cho nhanh; bỏ field này nếu cần fallback
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Connect error:', err.message);
  // Các message có thể nhận:
  //  - "Missing auth token"
  //  - "Token has been revoked"   ← cần refresh token
  //  - "Unauthorized"              ← token sai/hết hạn → cần refresh
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

**Lưu ý:**
- Chỉ tạo **1 socket instance** cho cả app. Đừng tạo nhiều socket per page.
- Khi user logout: gọi `socket.disconnect()` trước khi clear token.

---

## 3. Danh sách event server → client

Tất cả event name + payload type khớp với [src/modules/realtime/events/ws-events.ts](../src/modules/realtime/events/ws-events.ts) ở backend.

### 3.1 `message.new`

Tin nhắn mới trong conversation mà mình là participant. **Không nhận** event này nếu chính mình là sender (vì REST response đã trả tin nhắn).

```ts
interface MessageNewPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  content: string;
  replyId?: string;
  replySnippet?: string;     // 80 ký tự đầu của tin được reply
  replySenderId?: string;
  createdAt: string;          // ISO 8601
}

socket.on('message.new', (payload: MessageNewPayload) => {
  // FE: append vào danh sách tin nhắn của conversationId
});
```

### 3.2 `friendship.request_received`

Có người gửi lời mời kết bạn cho mình.

```ts
interface FriendshipRequestReceivedPayload {
  friendshipId: string;
  requesterId: string;
  requesterUsername: string;
}

socket.on('friendship.request_received', (payload) => {
  // FE: hiện badge "có lời mời mới", hoặc push vào list incoming requests
});
```

### 3.3 `friendship.accepted`

Lời mời mình đã gửi vừa được accept. Lưu ý: ngay sau event này, sẽ có thêm `conversation.created` (vì BE auto-tạo direct conversation khi accept).

```ts
interface FriendshipAcceptedPayload {
  friendshipId: string;
  recipientId: string;
  recipientUsername: string;
}

socket.on('friendship.accepted', (payload) => {
  // FE: show toast "X đã chấp nhận lời mời", refresh friend list
});
```

### 3.4 `conversation.created`

Có conversation mới mà mình là participant. Trigger khi:
- Người khác tạo group có mình trong đó.
- Friend request được accept → auto-tạo direct conversation giữa 2 người.

Backend **đã tự động join socket của mình vào room conversation này** → không cần làm gì thêm để nhận `message.new` từ conv đó.

```ts
interface ConversationCreatedPayload {
  conversationId: string;
  type: string;  // 'direct' | 'group' | 'channel'
  participants: Array<{ userId: string; username: string }>;
}

socket.on('conversation.created', (payload) => {
  // FE: prepend vào list conversation
});
```

---

## 4. Pattern dùng trong React

### 4.1 Singleton socket instance

Tạo 1 file `socket.ts` quản lý instance:

```ts
// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_API_URL, {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

### 4.2 Hook lắng nghe event

```ts
// src/hooks/useSocketEvent.ts
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';

export function useSocketEvent<T>(eventName: string, handler: (payload: T) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on(eventName, handler);
    return () => {
      socket.off(eventName, handler);
    };
  }, [eventName, handler]);
}
```

### 4.3 Sử dụng trong component

```tsx
// src/pages/ChatPage.tsx
import { useState } from 'react';
import { useSocketEvent } from '@/hooks/useSocketEvent';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export function ChatPage({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useSocketEvent<MessageNewPayload>('message.new', (payload) => {
    // Chỉ append nếu thuộc conversation đang mở
    if (payload.conversationId !== conversationId) return;
    setMessages((prev) => [...prev, {
      id: payload.messageId,
      senderId: payload.senderId,
      content: payload.content,
      createdAt: payload.createdAt,
    }]);
  });

  // ... render
}
```

### 4.4 Kết nối lúc app start (sau khi login)

```tsx
// src/App.tsx
import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';

export function App() {
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;
    connectSocket(accessToken);
    return () => disconnectSocket();
  }, [accessToken]);

  return <Routes>...</Routes>;
}
```

---

## 5. Recipe: token expiry + auto reconnect

Server không tự kick connection khi access token hết hạn. Nhưng nếu user logout (token blacklisted) hoặc reconnect sau khi token expire → server reject với `connect_error`.

### Strategy

1. Catch `connect_error` với message `"Token has been revoked"` hoặc `"Unauthorized"`.
2. Gọi REST `POST /auth/refresh` lấy access token mới.
3. Update `socket.auth.token` rồi `socket.connect()` lại.
4. Nếu refresh fail → user phải login lại.

### Implementation

```ts
// src/lib/socket-with-refresh.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

interface RefreshFn {
  (): Promise<string | null>; // trả access token mới hoặc null nếu fail
  // Implement: gọi POST /auth/refresh với refresh_token đang lưu
}

export function connectSocket(accessToken: string, refreshFn: RefreshFn): Socket {
  if (socket) socket.disconnect();

  socket = io(import.meta.env.VITE_API_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Auto-refresh khi connect_error do token
  socket.on('connect_error', async (err) => {
    const needsRefresh =
      err.message === 'Token has been revoked' ||
      err.message === 'Unauthorized';
    if (!needsRefresh) return;

    const newToken = await refreshFn();
    if (!newToken) {
      // Refresh fail → redirect login
      socket?.disconnect();
      window.location.href = '/login';
      return;
    }

    // Update token + thử connect lại
    socket!.auth = { token: newToken };
    socket!.connect();
  });

  return socket;
}
```

### Refresh function ví dụ

```ts
// src/lib/auth.ts
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token); // rotation
    return data.access_token;
  } catch {
    return null;
  }
}
```

---

## 6. Reconnect lifecycle

Socket.IO tự reconnect khi mất mạng / server restart. Các event lifecycle hữu ích:

```ts
socket.on('connect', () => {
  console.log('Connected', socket.id);
  // FE: fetch lại tin nhắn từ REST nếu nghi ngờ miss event lúc offline
});

socket.io.on('reconnect_attempt', (attempt) => {
  console.log('Reconnecting...', attempt);
});

socket.io.on('reconnect', (attempt) => {
  console.log('Reconnected after', attempt, 'attempts');
});

socket.io.on('reconnect_failed', () => {
  console.error('Reconnect failed sau tất cả attempts');
});
```

**Lưu ý:** sau reconnect, backend tự join lại tất cả room (`user:<id>` + `conv:<id>` của user). FE không cần làm gì để re-subscribe.

**Quan trọng — mất event lúc offline:** Backend **không persist** event chưa deliver. Nếu user offline khi có tin nhắn → khi reconnect sẽ không nhận lại `message.new` cũ. FE nên gọi REST refresh lại danh sách tin nhắn sau khi `connect`:

```ts
socket.on('connect', () => {
  // Refresh data quan trọng để bù event đã miss
  refreshConversationList();
  if (currentConversationId) refreshMessages(currentConversationId);
});
```

---

## 7. Handle các trường hợp đặc biệt

### 7.1 User logout

```ts
async function logout() {
  // 1. Disconnect socket TRƯỚC để cleanup connection
  disconnectSocket();

  // 2. Gọi REST logout (revoke refresh token + blacklist access token)
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  // 3. Clear local storage
  localStorage.clear();
}
```

### 7.2 User đổi tab nhiều, app suspended

Mobile/PWA: khi app vào background, socket có thể bị OS kill. Listen visibility:

```ts
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !socket?.connected) {
    socket?.connect(); // Socket.IO tự dùng token cũ trong auth
  }
});
```

### 7.3 Conversation mới được tạo (vd accept friend)

Khi nhận `conversation.created`, backend đã auto-join socket vào `conv:<newId>`. FE chỉ cần update UI:

```ts
useSocketEvent<ConversationCreatedPayload>('conversation.created', (payload) => {
  // Prepend vào list conversation
  addConversation(payload);
  // KHÔNG cần emit join room hay reconnect — backend đã lo
});
```

---

## 8. TypeScript types đầy đủ

Copy file dưới đây làm contract giữa FE và BE. Khi BE update [ws-events.ts](../src/modules/realtime/events/ws-events.ts), update file này tương ứng.

```ts
// src/lib/ws-events.ts
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

// Typed socket interface — IDE autocomplete event name + payload
export interface ServerToClientEvents {
  'message.new': (p: MessageNewPayload) => void;
  'friendship.request_received': (p: FriendshipRequestReceivedPayload) => void;
  'friendship.accepted': (p: FriendshipAcceptedPayload) => void;
  'conversation.created': (p: ConversationCreatedPayload) => void;
}

// Hiện chưa có client-to-server event nào. Khi BE thêm typing/read receipt mới update.
export interface ClientToServerEvents {}
```

Dùng:

```ts
import { Socket, io } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@/lib/ws-events';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(API_URL, {
  auth: { token: accessToken },
});

socket.on('message.new', (payload) => {
  // payload tự được infer là MessageNewPayload
});
```

---

## 9. Debug

### Browser DevTools

Mở Console:
```js
localStorage.debug = 'socket.io-client:*';
```
Refresh page → log chi tiết của Socket.IO trong console.

### Test connection bằng `wscat` / `socket.io-client` CLI

```bash
npx socket.io-client-tool http://localhost:3000 \
  --auth '{"token":"<access_token>"}'
```

### Backend logs

Server log những event sau (xem `ChatGateway` + `DomainEventsBridge`):
- Connect/disconnect: level `debug`.
- Reject auth: level `warn`.
- Emit fail: level `error`.

---

## 10. Câu hỏi thường gặp

**Q: Phải kết nối socket riêng cho mỗi conversation không?**
A: Không. Một socket xử lý tất cả conversation của user. Backend tự broadcast tới đúng room.

**Q: Có cần emit "join room" khi mở conversation không?**
A: Không. Backend tự join tất cả conversation room của user lúc connect.

**Q: Gửi tin nhắn qua socket hay qua REST?**
A: Hiện tại **chỉ qua REST** (`POST /conversations/messages`). Backend phát `message.new` cho các participant khác. Không có endpoint WS để send.

**Q: Tại sao sender không nhận `message.new` của tin nhắn mình vừa gửi?**
A: REST response đã trả message + ID đầy đủ. Nếu cần echo cho multi-device, báo BE bỏ filter `.except(senderRoom)`.

**Q: Event có guaranteed delivery không?**
A: **Không**. Backend không persist event chưa deliver. Sau reconnect, FE nên refresh data quan trọng qua REST (xem section 6).

**Q: Có rate limit không?**
A: Chưa. Có thể thêm sau (section 9 của [socket-architecture.md](socket-architecture.md)).

---

## 11. Liên kết

- [docs/socket-architecture.md](socket-architecture.md) — kiến trúc nội bộ BE (cho dev BE).
- [docs/friendship-flow.md](friendship-flow.md) — flow nghiệp vụ friendship qua REST.
- Swagger UI: `http://localhost:3000/api/docs` — REST API reference.
