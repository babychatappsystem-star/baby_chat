# Socket Architecture — Tài liệu nội bộ BE

Tài liệu mô tả kiến trúc WebSocket realtime của BabyChat: cách module được tổ chức, luồng dữ liệu giữa REST → Domain Event → Socket.IO, và quy ước khi mở rộng feature realtime mới.

- Transport: **Socket.IO 4.x** (`@nestjs/websockets` + `@nestjs/platform-socket.io`).
- Entry point: HTTP server (cùng port với REST, mặc định `3000`).
- Module entry: [src/modules/realtime/](../src/modules/realtime/).

---

## 1. Triết lý thiết kế

3 nguyên tắc cốt lõi:

1. **Domain modules không biết WS tồn tại.** Use case (vd `SendMessageUseCase`) chỉ publish `DomainEvent` qua `IEventBus`. Không inject `ChatGateway`, không gọi `server.emit()` ở use case.
2. **Bridge pattern.** `DomainEventsBridge` là **điểm duy nhất** subscribe domain event và forward sang WS. Mọi event WS đều xuất phát từ đây.
3. **Stateless gateway.** Không lưu socket state trong DB. Khi user reconnect, gateway query lại `ConversationRepository` để join lại room. Mất disconnection state là chấp nhận được.

Lợi ích:
- Domain layer test được không cần Socket.IO.
- Có thể swap transport (Socket.IO → ws thuần, hoặc thêm SSE) chỉ bằng cách thay Gateway + Bridge, không đụng use case.
- Single source of truth cho event mapping (tất cả ở [domain-events.bridge.ts](../src/modules/realtime/bridge/domain-events.bridge.ts)).

---

## 2. Sơ đồ luồng

```
┌──────────┐   HTTP    ┌──────────────────────┐  publish   ┌──────────┐
│  Client  │ ────────► │  REST Controller     │ ─────────► │ EventBus │
│  (REST)  │           │  + Use Case          │            │ (EE2)    │
└──────────┘           └──────────────────────┘            └────┬─────┘
                                                                │ @OnEvent
                                                                ▼
                                                       ┌────────────────────┐
                                                       │ DomainEventsBridge │
                                                       │  (4 listeners)     │
                                                       └─────────┬──────────┘
                                                                 │ emit helper
                                                                 ▼
┌──────────┐   WS      ┌──────────────────────┐                ┌──────────┐
│  Client  │ ◄──────── │  ChatGateway         │ ◄───────────── │ Socket.IO│
│  (WS)    │           │  (rooms)             │                │ Server   │
└──────────┘           └──────────────────────┘                └──────────┘
```

**Quy luật bất biến:** một WS event được trigger CHỈ qua chuỗi `Use Case → DomainEvent → Bridge → Gateway`. Không có shortcut.

---

## 3. Cấu trúc thư mục

```
src/modules/realtime/
├── realtime.module.ts          # @Global module wire mọi thứ
├── gateway/
│   └── chat.gateway.ts         # @WebSocketGateway, room join, emit helpers
├── auth/
│   └── ws-jwt.middleware.ts    # Verify JWT trong handshake
├── bridge/
│   └── domain-events.bridge.ts # @OnEvent listeners → emit qua gateway
└── events/
    └── ws-events.ts            # Hằng số WS_EVENTS + payload TypeScript types
```

### Vai trò từng file

| File | Trách nhiệm | Không được làm |
|---|---|---|
| [realtime.module.ts](../src/modules/realtime/realtime.module.ts) | Wire dependency, export `ChatGateway` để module khác có thể inject nếu cần emit thủ công | Chứa logic |
| [gateway/chat.gateway.ts](../src/modules/realtime/gateway/chat.gateway.ts) | Quản lý connection lifecycle, room membership, expose emit helpers | Lookup DB phức tạp, business logic |
| [auth/ws-jwt.middleware.ts](../src/modules/realtime/auth/ws-jwt.middleware.ts) | Verify JWT, check blacklist, gán `socket.data.user` | Authorization (vd check role) |
| [bridge/domain-events.bridge.ts](../src/modules/realtime/bridge/domain-events.bridge.ts) | Subscribe domain event, lookup data bổ sung, gọi emit helper của gateway | Business logic, throw exception (chỉ log) |
| [events/ws-events.ts](../src/modules/realtime/events/ws-events.ts) | Contract event name + payload type | Logic, import từ infrastructure |

---

## 4. Authentication flow

```
Client                          Server (Socket.IO middleware)
  │                                       │
  │  io({ auth: { token: '<jwt>' } })     │
  │ ─────────────────────────────────────►│
  │                                       │── verify JWT (JwtService global)
  │                                       │── check TokenBlacklistService
  │                                       │── socket.data.user = { userId, email, username, roles }
  │                                       │
  │           connect / connect_error     │
  │ ◄─────────────────────────────────────│
```

**Token sources** (theo thứ tự ưu tiên trong [ws-jwt.middleware.ts](../src/modules/realtime/auth/ws-jwt.middleware.ts)):

1. `socket.handshake.auth.token` (chuẩn Socket.IO)
2. `socket.handshake.headers.authorization` (Bearer ...) — fallback cho client legacy

**Reject cases:**

| Lý do | Error message |
|---|---|
| Không gửi token | `Missing auth token` |
| Token blacklisted (đã logout) | `Token has been revoked` |
| Token sai/hết hạn | `Unauthorized` (verify exception bị nuốt + log warn) |

**Trade-off chấp nhận hiện tại:** token hết hạn **trong khi đang connect** không bị disconnect tự động — Socket.IO không re-verify. Client nhận 401 từ REST sẽ chủ động reconnect. Nếu cần siết, xem section 9.

---

## 5. Room strategy

Mỗi user sau khi connect được join vào **2 loại room**:

| Loại room | Tên | Mục đích | Khi nào join |
|---|---|---|---|
| User room | `user:<userId>` | Notification cá nhân (friend request, ...) | `handleConnection` |
| Conversation room | `conv:<conversationId>` | Tin nhắn của conversation | `handleConnection` (loop) + khi conversation mới được tạo |

**Helper:** `userRoom(userId)` và `convRoom(convId)` ở [chat.gateway.ts](../src/modules/realtime/gateway/chat.gateway.ts). **Bắt buộc dùng helper** thay vì hardcode string — đổi format chỉ cần sửa 1 chỗ.

**Tại sao 2 loại?**

- Tin nhắn trong conversation: emit `.to(convRoom(id))` → 1 broadcast tới tất cả participant đang online. Hiệu quả hơn loop từng user.
- Friend request: recipient chưa hẳn ở chung conversation nào với requester. Chỉ có user room là điểm liên lạc.

**Auto-join khi conversation mới:** Khi `ConversationCreatedEvent` fire, Bridge gọi `gateway.emitConversationCreated()` — method này không chỉ emit mà còn **fetch sockets của từng participant** và join họ vào `conv:<newId>` để các tab đang mở nhận tin nhắn ngay (không cần reconnect).

---

## 6. Event mapping

Toàn bộ event tập trung trong [domain-events.bridge.ts](../src/modules/realtime/bridge/domain-events.bridge.ts).

| Domain Event (eventName) | Publish bởi | WS Event | Payload (xem [ws-events.ts](../src/modules/realtime/events/ws-events.ts)) | Target room |
|---|---|---|---|---|
| `message.sent` | `SendMessageUseCase` | `message.new` | `MessageNewPayload` | `conv:<id>` (trừ sender's user room) |
| `friendship.request_sent` | `SendFriendRequestUseCase` | `friendship.request_received` | `FriendshipRequestReceivedPayload` | `user:<recipient>` |
| `friendship.accepted` | `AcceptFriendRequestUseCase` | `friendship.accepted` | `FriendshipAcceptedPayload` | `user:<requester>` |
| `conversation.created` | `CreateConversationUseCase` | `conversation.created` | `ConversationCreatedPayload` | `user:<participant>` × n + auto-join `conv:<new>` |

**Quy ước payload:**
- Phải có **đủ data** để FE render mà không phải query thêm REST.
- Vd `MessageNewPayload` có sẵn `replySnippet` + `replySenderId` để FE hiển thị reply preview ngay.
- Với event cần data không có trong domain event (vd username của requester), Bridge tự lookup repository.

**Quy ước không emit cho sender** (`.except(userRoom(senderId))` ở `emitMessageNew`):
Sender đã có response từ REST chứa message ID. Emit lại gây duplicate render. Nếu sau này cần multi-device echo, sửa helper trong gateway (1 chỗ), không cần đổi Bridge.

---

## 7. Quy trình thêm WS event mới

Giả sử cần thêm `message.deleted` (broadcast khi tin nhắn bị xóa):

1. **Domain layer:** tạo `MessageDeletedEvent` extends `DomainEvent` trong `src/modules/message/domain/`.
2. **Use case:** `DeleteMessageUseCase` (chưa có) publish event qua `IEventBus.publish()`. Pattern giống [send-friend-request.usecase.ts](../src/modules/friendship/application/use-cases/send-friend-request.usecase.ts).
3. **Contract:** thêm `MESSAGE_DELETED: 'message.deleted'` + interface `MessageDeletedPayload` trong [ws-events.ts](../src/modules/realtime/events/ws-events.ts).
4. **Gateway helper:** thêm method `emitMessageDeleted(conversationId, payload)` trong [chat.gateway.ts](../src/modules/realtime/gateway/chat.gateway.ts) — quyết định room target.
5. **Bridge:** thêm `@OnEvent('message.deleted') onMessageDeleted(event)` trong [domain-events.bridge.ts](../src/modules/realtime/bridge/domain-events.bridge.ts) → gọi helper ở bước 4.

**Không bỏ qua bước nào.** Đặc biệt:
- Không emit thẳng từ use case (vi phạm "domain không biết WS").
- Không tạo helper trong Bridge — chỉ tạo trong Gateway, Bridge gọi.

---

## 8. Dependency wiring

`RealtimeModule` cần các dependency sau (xem [realtime.module.ts](../src/modules/realtime/realtime.module.ts)):

| Module/Provider | Lý do | Yêu cầu phía module gốc |
|---|---|---|
| `AuthModule` | `TokenBlacklistService` cho middleware | `AuthModule` phải `exports: [TokenBlacklistService]` |
| `JwtService` | Verify token | Đã global từ `AppModule` |
| `ConversationsModule` | `IConversationRepository` (fetch conversation của user lúc connect; lookup participants) | Đã `exports: [IConversationRepository]` |
| `UserModule` | `IUserRepository` (lookup username cho payload friend event) | Đã `exports: [IUserRepository]` |
| `PageModule` | `IPageRepository` (lookup message để lấy reply snapshot cho `message.new`) | Đã `exports: [IPageRepository]` |

Module được đánh dấu `@Global` để các module khác có thể inject `ChatGateway` mà không phải import lại (dù hiện không có nhu cầu — pattern Bridge đã đủ).

---

## 9. Tradeoff & hạn chế hiện tại

| Vấn đề | Trạng thái | Hướng giải nếu cần |
|---|---|---|
| Token hết hạn không kick connection | Chấp nhận | Setup interval verify token mỗi N phút; hoặc dùng short-lived ticket gửi qua REST trước khi connect |
| Single instance — không scale ngang | Chấp nhận | `@socket.io/redis-adapter` + Redis. Room state sync qua Redis pub/sub |
| TokenBlacklistService in-memory | Đã biết | Đổi sang Redis hoặc Mongo collection `revoked_tokens` |
| Client cũ vẫn ở `conv:<id>` sau khi unfriend / leave nhóm | Chấp nhận | Thêm event `conversation.participant_left` → Bridge `socket.leave(convRoom(id))` |
| CORS origin `*` | Dev OK | Prod siết list domain cụ thể trong `@WebSocketGateway({ cors: { origin: [...] } })` |
| Mất event khi user offline | Chấp nhận | Không persist — REST query lại khi reconnect. Nếu cần guaranteed delivery, thêm `notifications` collection + delivery ack |
| Lookup DB trong Bridge | Acceptable | Enrich payload ngay từ domain event để giảm round-trip — vd `MessageSentEvent` chứa sẵn snapshot |

---

## 10. Quy ước phát triển

- **Không hardcode tên event** ngoài file [ws-events.ts](../src/modules/realtime/events/ws-events.ts). Mọi nơi dùng `WS_EVENTS.MESSAGE_NEW`.
- **Không hardcode tên room.** Dùng `userRoom()` / `convRoom()` từ gateway.
- **Bridge listener không throw** — chỉ `logger.error` để không phá luồng REST. Domain event đã được commit khi Bridge chạy; throw chỉ gây log noise.
- **Payload immutable.** Khi đổi shape là breaking change cho FE — bump version event (vd `message.new.v2`) thay vì sửa shape cũ.
- **Khi thêm middleware mới** (vd rate-limit, logging): gắn trong `afterInit()` của gateway, sau `createWsJwtMiddleware`.

---

## 11. Test & debug

**Bootstrap check:**
```bash
npm run build && npm run dev
```
Server log phải có `ChatGateway initialized with JWT middleware`. Nếu không → có lỗi DI.

**Test connection bằng `socket.io-client` CLI:**
```js
const io = require('socket.io-client');
const s = io('ws://localhost:3000', { auth: { token: '<access_token>' } });
s.on('connect', () => console.log('connected', s.id));
s.on('connect_error', (e) => console.log('err', e.message));
s.onAny((evt, payload) => console.log(evt, payload));
```

**End-to-end** (xem chi tiết ở section "Verification" trong plan file):
1. 2 user kết nối socket.
2. Gửi tin nhắn / friend request qua REST.
3. Quan sát event tới đúng user.

**Debug log:**
- Bridge log error khi emit fail (vd network).
- Gateway log connect/disconnect ở level `debug`. Bật bằng env `LOG_LEVEL=debug` hoặc thay `logger.debug` thành `logger.log` tạm thời.
- Socket.IO server có debug riêng: `DEBUG=socket.io:* npm run dev`.

---

## 12. Liên kết với REST docs

- [docs/friendship-flow.md](friendship-flow.md) — flow nghiệp vụ friendship qua REST. WS event `friendship.request_received` / `friendship.accepted` bổ sung cho flow này.
- Swagger UI: `http://localhost:3000/api/docs` — chỉ cover REST.
