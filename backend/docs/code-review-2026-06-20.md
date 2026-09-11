# Code Review — File Upload / Realtime / Avatar / Image Message

- **Ngày:** 2026-06-20
- **Scope:** `git diff origin/main...HEAD` — 62 files, +3573/−53. Thêm file/image upload module, WebSocket (Socket.IO) realtime, user/conversation avatar, image message, friend-request event.
- **Phương pháp:** 8 finder angle (3 correctness + 3 cleanup + altitude + conventions) × ≤6 candidate → verify 1-vote (recall-biased) → 10 findings.

## Tổng quan

| # | Mức độ | Loại | Vấn đề |
|---|--------|------|--------|
| 1 | 🔴 Critical | Security | Rò file người khác qua foreign fileId |
| 2 | 🔴 Critical | Correctness | content non-string → 500 |
| 3 | 🔴 Critical | Security | Multer thiếu size limit → DoS RAM |
| 4 | 🟠 Medium | Correctness | Multi-device sender miss tin nhắn của chính mình |
| 5 | 🟠 Medium | Correctness | Avatar ảnh nhỏ không crop vuông |
| 6 | 🟡 Low | Correctness | Image message broadcast thành text rỗng khi lookup miss |
| 7 | 🟡 Low | Efficiency/Altitude | findMessageById scan không index trên hot path |
| 8 | 🟡 Low | Altitude/Reuse | Avatar URL resolution rải rác trong controller |
| 9 | 🟡 Low | Altitude | `avatar` + `avatarUrl` dual field — migration dở dang |
| 10 | 🟡 Low | Behavior | `/auth/profile` đổi sang 404 cho deleted user |

> **Đã loại (REFUTED):** "User được add vào conversation cũ không join room" — feature add-member chưa tồn tại, không reachable hôm nay (latent, sẽ thành bug khi build add-member).

---

## 1. 🔴 Rò file người khác qua foreign fileId (CONFIRMED)

**File:** [src/modules/conversation/application/use-cases/send-message.usecase.ts:52](../src/modules/conversation/application/use-cases/send-message.usecase.ts#L52)

Kiểm tra ownership của file (`file.isOwnedBy`) nằm **bên trong** `if (command.type === 'image')`. Một text message mang `fileId` của người khác bỏ qua hoàn toàn check này.

**Kịch bản:**
```
POST /conversations/messages
{ conversationId, content: "hi", fileId: "<file của victim>" }   // type bỏ trống / "text"
```
- `ValidationPipe` bare (`new ValidationPipe()`, không `whitelist`) → `fileId` lọt qua dù `@ValidateIf((o) => o.type === 'image')` skip validation.
- `if (type === 'image')` ownership block bị skip.
- `MessageEntity.create` lưu `fileId` vô điều kiện ([message.entity.ts:81](../src/modules/message/domain/message.entity.ts#L81)).
- Mapper resolve `fileUrl` trên `e.fileId ? ... : null` (không gate theo type) → URL file của victim rò cho mọi người trong conversation.

**Hướng sửa:** Validate ownership cho bất kỳ `fileId` nào được gửi (không chỉ khi `type==='image'`), hoặc strip `fileId` khi `type!=='image'`. Bật `whitelist: true` trên ValidationPipe.

---

## 2. 🔴 content non-string gây 500 (CONFIRMED)

**File:** [src/modules/message/interfaces/dto/create-message.dto.ts:8](../src/modules/message/interfaces/dto/create-message.dto.ts#L8)

`@IsString()` trên `content` bị bọc trong `@ValidateIf((o) => o.type !== 'image')`. Với image message, `content` không còn được validate là string.

**Kịch bản:**
```
POST /conversations/messages
{ type: "image", fileId: "<owned>", content: 12345 }    // content là number
```
- `@ValidateIf` skip `@IsString` cho image type; ValidationPipe không `transform` nên `12345` giữ nguyên number.
- [message.entity.ts:79](../src/modules/message/domain/message.entity.ts#L79) chạy `props.content?.trim()` → `(12345).trim()` is not a function → **TypeError 500** thay vì 400.

**Hướng sửa:** Thêm `@IsOptional() @IsString()` (không điều kiện) cho `content`, hoặc coerce/guard trong entity. Cân nhắc `transform: true` cho ValidationPipe.

---

## 3. 🔴 Multer thiếu fileSize limit → DoS RAM (CONFIRMED)

**File:** [src/modules/file/interfaces/file.controller.ts:76](../src/modules/file/interfaces/file.controller.ts#L76)

`FileInterceptor` dùng `memoryStorage()` nhưng **không có `limits.fileSize`**. Toàn bộ file được buffer vào RAM (`file.buffer`) **trước khi** check size thủ công ở handler body.

**Kịch bản:** Client POST file 500MB với mimetype hợp lệ (header image/png). Multer đọc hết 500MB vào RAM rồi mới tới `if (file.size > maxSizeMb*1024*1024)`. Nhiều request đồng thời → cạn RAM → crash.

**Hướng sửa:** Thêm `limits: { fileSize: maxSizeMb * 1024 * 1024 }` vào option của `FileInterceptor` để Multer abort stream sớm. (Comment trong code đã thừa nhận "check thủ công" — chính là nguồn của bug.)

---

## 4. 🟠 Multi-device sender miss tin nhắn của chính mình (CONFIRMED)

**File:** [src/modules/realtime/gateway/chat.gateway.ts:86](../src/modules/realtime/gateway/chat.gateway.ts#L86)

`emitMessageNew` dùng `.except(userRoom(senderId))` — loại trừ **tất cả** socket của sender (mọi thiết bị trong room `user:<senderId>`), không chỉ socket gốc.

**Kịch bản:** User đăng nhập trên điện thoại + laptop (cả 2 socket trong `user:<senderId>`). Gửi tin từ điện thoại qua REST. `.except` loại cả 2 thiết bị → laptop không nhận `message.new`, hiển thị conversation cũ tới khi refresh tay.

**Hướng sửa:** Track socket-id gốc của request và chỉ `.except` socket đó (truyền socketId qua một header/metadata), hoặc bỏ `.except` và để FE dedupe theo messageId.

---

## 5. 🟠 Avatar ảnh nhỏ không crop vuông (CONFIRMED)

**File:** [src/modules/file/infrastructure/image-processor.ts:38](../src/modules/file/infrastructure/image-processor.ts#L38)

Avatar pipeline dùng `.resize(512, 512, { fit:'cover', position:'centre', withoutEnlargement:true })`. Với `withoutEnlargement:true`, ảnh nhỏ hơn 512 (vd 150×100) **không** được upscale và **không** crop về vuông — output giữ nguyên 150×100.

**Kịch bản:** User upload avatar 150×100. sharp không enlarge, không crop vuông → output 150×100, entity lưu width=150/height=100, FE render méo trong khung vuông. Thumbnail 200×200 dính lỗi y hệt (cùng option).

**Hướng sửa:** Bỏ `withoutEnlargement` cho avatar/thumbnail (chấp nhận upscale nhẹ để giữ vuông), hoặc dùng `extend`/crop thủ công về tỉ lệ 1:1.

---

## 6. 🟡 Image message broadcast thành text rỗng khi lookup miss (PLAUSIBLE)

**File:** [src/modules/realtime/bridge/domain-events.bridge.ts:37](../src/modules/realtime/bridge/domain-events.bridge.ts#L37)

`onMessageSent` enrich payload qua `findMessageById`. Nếu trả `null`, `type` fallback `'text'` và `fileUrl` `null` → recipient nhận bubble text rỗng dù REST đã lưu ảnh.

**Kịch bản:** Tin bị xóa giữa write và lookup, hoặc bất kỳ read-after-write inconsistency. Hẹp hôm nay (write trước publish trên cùng primary) nhưng fragile — data đã biết tại thời điểm publish.

**Hướng sửa:** Enrich `MessageSentEvent` với `type`/`fileId` tại nguồn (xem #7), bỏ lookup hoàn toàn.

---

## 7. 🟡 findMessageById scan không index trên hot path (PLAUSIBLE)

**File:** [src/modules/message/infrastructure/page.repository.ts:104](../src/modules/message/infrastructure/page.repository.ts#L104)

`findMessageById` chạy trên hot path `message.sent` (bridge.onMessageSent) nhưng scan mọi page bucket của conversation — không có index trên `messages._id`, fetch nguyên bucket để linear-search embedded array.

**Kịch bản:** Conversation 10k tin (~200 page bucket) decode hết bucket server-side trên **mỗi** lần broadcast tin nhắn chỉ để đọc 1 reply snapshot / type / fileUrl. Throughput sụp dưới tải.

**Hướng sửa (deep fix):** Enrich `MessageSentEvent` với type/fileId/createdAt/reply fields tại write time (`send-message` đã giữ sẵn entity) → bridge cần 0 lookup. Đây cũng là deep fix đã ghi trong [socket-architecture.md §9](socket-architecture.md). Nếu vẫn cần lookup: thêm index `{ conversationId, 'messages._id' }` + project subdoc khớp.

---

## 8. 🟡 Avatar URL resolution rải rác trong controller (PLAUSIBLE)

**File:** [src/modules/conversation/interfaces/conversations.controller.ts:49](../src/modules/conversation/interfaces/conversations.controller.ts#L49)

Resolution URL (resolveAvatarUrl + build `Map<fileId,url>` thủ công) nằm trong từng GET controller thay vì ở mapper/use-case layer. Boilerplate lặp ở conversations.controller (2 lần), users.controller, get-profile.usecase.

**Kịch bản:** Mỗi endpoint phải nhớ: inject FileUrlResolver → resolveMany → rebuild Map → truyền vào mapper. `createConversation` ([:92](../src/modules/conversation/interfaces/conversations.controller.ts#L92)) đã quên arg avatarUrl → luôn trả `avatarUrl:null` không có lỗi compile — đúng failure mà FAQ trong docs đã cảnh báo.

**Hướng sửa:** Đẩy resolution xuống mapper hoặc một presentation helper duy nhất ("resolve then map" là path duy nhất), xóa Map-building lặp.

---

## 9. 🟡 `avatar` + `avatarUrl` dual field — migration dở dang (PLAUSIBLE)

**File:** [src/modules/conversation/interfaces/dto/conversation-response.dto.ts:77](../src/modules/conversation/interfaces/dto/conversation-response.dto.ts#L77)

`ConversationResponseDto` (và entity/schema) mang **cả** `avatar` (URL legacy) lẫn `avatarUrl` (resolve từ `avatarFileId`), không có precedence — client phải đoán field nào để render.

**Kịch bản:** Conversation tạo trước feature có `avatar` set + `avatarUrl:null`; cái mới thì ngược lại. FE hardcode `avatarUrl ?? avatar` hoặc chọn 1 → vỡ với nửa data.

**Hướng sửa:** Backfill URL `avatar` legacy qua File pipeline (hoặc resolver) → response chỉ còn 1 field `avatarUrl`.

---

## 10. 🟡 `/auth/profile` đổi sang 404 cho deleted user (PLAUSIBLE)

**File:** [src/modules/auth/interfaces/auth.controller.ts:58](../src/modules/auth/interfaces/auth.controller.ts#L58)

`/auth/profile` giờ query DB và throw `UserNotFoundException` (404) cho JWT còn hợp lệ của user đã bị xóa, trong khi trước đây luôn trả 200 từ JWT payload.

**Kịch bản:** Account bị xóa khi user vẫn giữ token chưa hết hạn / chưa blacklist. Cũ: 200 từ req.user. Mới: 404. Client dùng `/auth/profile` như token-validity probe sẽ hiểu sai 404. Cũng thêm 1 DB round-trip mỗi lần gọi profile.

**Hướng xử lý:** Xác nhận 404-on-deleted-user là chủ ý (hợp lý cho security). Nếu cần giữ behavior cũ → fallback về JWT payload khi user không tồn tại.

---

## Cleanup bậc thấp (không nằm top-10 nhưng đáng xử lý)

- **Thiếu `.spec.ts`** cho file module & realtime module — vi phạm CLAUDE.md "Quy ước code": *"Mỗi module có file `.spec.ts` tương ứng cho unit test"*.
- **`toObjectId` duplicate** 4 chỗ (conversation.mapper, friendship.mapper, page.mapper, + inline trong file.mapper) — nên promote lên `src/shared/utils`.
- **`findByIds` copy-paste** giữa [file.repository.ts](../src/modules/file/infrastructure/file.repository.ts) và [user.repository.ts](../src/modules/user/infrastructure/user.repository.ts) (đã bắt đầu drift: bản file thêm `isValid` guard).
- **`uuid` vs `generateObjectIdHex`** — upload-image.usecase thêm package `uuid` cho filename trong khi repo đã có `generateObjectIdHex` ([src/shared/utils/id-generator.ts](../src/shared/utils/id-generator.ts)) → 2 id scheme song song.
- **Permission check copy-paste** (creator || admin) giữa [delete-conversation.usecase.ts:35](../src/modules/conversation/application/use-cases/delete-conversation.usecase.ts#L35) và update-conversation-avatar.usecase — nên extract thành domain method `conversation.isManagedBy(userId)`.
- **try/catch + logger.error boilerplate** lặp 4 lần trong domain-events.bridge — extract `safeBroadcast(label, fn)`.
- **`onModuleInit()` rỗng** trong chat.gateway — dead code, xóa cùng `OnModuleInit` khỏi `implements`.
- **emitConversationCreated** loop `fetchSockets()` + emit per-participant — O(N) adapter round-trip; dùng `socketsJoin` + emit 1 lần tới array user room.
- **socket.join sequential loop** trong handleConnection — `socket.join` nhận array, gộp 1 call.
- **image-processor decode 3×** — `sharp(input)` tạo 3 lần (metadata/main/thumb); decode 1 lần rồi `.clone()`, chạy main+thumb qua `Promise.all`.

---

## Đề xuất thứ tự xử lý

1. **Sửa ngay #1–#3** (cùng vùng upload/message, severity cao nhất, security).
2. **#4–#6** correctness vừa.
3. **#7** (enrich event) — giải quyết luôn #6 + #7 + một phần altitude.
4. Cleanup bậc thấp theo nhịp.
