# Code Review toàn bộ BabyChat — 2026-09-24

Phạm vi: backend (NestJS, `backend/src`) và frontend (React/Vite, `frontend/src`, `frontend/public/sw.js`), tại commit `25350db`.

Các mục đánh dấu **(đã kiểm chứng)** đã được xác nhận bằng script chạy thực tế; các mục còn lại dựa trên đọc code.

## Tóm tắt

| Mức độ | Số lượng | Ghi chú |
|---|---|---|
| Nghiêm trọng (bảo mật) | 5 | Cần sửa trước khi có người dùng thật |
| Cao (lỗi chức năng) | 5 | Tính năng hỏng hoặc rò dữ liệu giữa tài khoản |
| Trung bình | 7 | Độ bền, validation, UX |
| Tooling / vệ sinh repo | — | Lint, test, cấu hình |

Ưu tiên đề xuất: sửa mục 1–5, rồi 6–8. Phần lớn chỉ cần vài dòng mỗi mục.

---

## 1. Nghiêm trọng (bảo mật)

### 1.1 Secret thật bị commit vào git
- **Vị trí:** [backend/.env.example:2](../backend/.env.example#L2), [:19](../backend/.env.example#L19)
- **Vấn đề:** File chứa `JWT_SECRET` và SMTP app password của `babychat.app.system@gmail.com`. Cả hai đã nằm trong lịch sử git (từ commit `0fc31d9`).
- **Cách sửa:** Đổi mật khẩu/app password và JWT secret ngay; thay giá trị trong `.env.example` bằng placeholder. Xoá khỏi lịch sử git chỉ là bước phụ — secret đã lộ thì phải coi như bị lộ.

### 1.2 Ai đăng nhập cũng đọc được hội thoại bất kỳ (IDOR)
- **Vị trí:** [conversations.controller.ts:104](../backend/src/modules/conversation/interfaces/conversations.controller.ts#L104), [:170](../backend/src/modules/conversation/interfaces/conversations.controller.ts#L170), [:187](../backend/src/modules/conversation/interfaces/conversations.controller.ts#L187)
- **Vấn đề:** `GET /conversations/:id`, `GET /conversations/messages/:conversationId/:pageNum` và `GET /conversations/:id/pages` không kiểm tra người gọi có phải participant không. Biết `conversationId` là đọc được toàn bộ tin nhắn.
- **Cách sửa:** Truyền `userId` vào các use case tương ứng và ném `NotParticipantException` nếu `!conversation.isParticipant(userId)`, giống cách `SendMessageUseCase` đang làm.

### 1.3 `GET /users/:id` trả về password hash
- **Vị trí:** [users.controller.ts:124](../backend/src/modules/user/interfaces/users.controller.ts#L124)
- **Vấn đề:** Endpoint trả nguyên `UserEntity`, gồm `password` (hash), `email`, `pushSubscriptions`, `friendCode`.
- **Cách sửa:** Map qua `UserPublicDto.fromEntity(user, avatarUrl, false)`.

### 1.4 Push subscription bị lưu vào sai user (đã kiểm chứng)
- **Vị trí:** [notification.controller.ts:32](../backend/src/modules/notification/notification.controller.ts#L32), [:45](../backend/src/modules/notification/notification.controller.ts#L45)
- **Vấn đề:** Controller dùng `user.sub`, nhưng `JwtStrategy.validate` trả về `{ userId, ... }` nên `user.sub` là `undefined`. Mongoose biến filter `{ _id: undefined }` thành `{}`, nên `updateOne` tác động lên **user đầu tiên trong collection**.
- **Hậu quả:** Subscription của mọi người đều gắn vào user đầu tiên. Khi có người nhắn cho user đó, nội dung tin nhắn được push tới trình duyệt của tất cả người đã subscribe; những người khác không nhận được push nào.
- **Cách sửa:** Dùng `@CurrentUser('userId')`; thêm DTO có validator cho body (`endpoint`, `keys.p256dh`, `keys.auth`); dọn dữ liệu `pushSubscriptions` sai trong DB.

### 1.5 `GET /users` lộ email của mọi user
- **Vị trí:** [users.controller.ts:57](../backend/src/modules/user/interfaces/users.controller.ts#L57)
- **Vấn đề:** Bất kỳ ai đã đăng nhập đều lấy được danh sách toàn bộ user kèm email. Comment ghi "Admin list" nhưng không có guard kiểm tra quyền admin.
- **Cách sửa:** Thêm guard kiểm tra role admin, hoặc bỏ email khỏi response (`includeEmail = false`).

---

## 2. Cao (lỗi chức năng)

### 2.1 `POST /conversations` luôn trả 500 (đã kiểm chứng)
- **Vị trí:** [create-conv.dto.ts:5](../backend/src/modules/conversation/interfaces/dto/create-conv.dto.ts#L5)
- **Vấn đề:** `ParticipantInputDto.userId` không có decorator của class-validator, nên `ValidationPipe({ whitelist: true })` xoá field này. `participants` còn lại `[{}]` và `p.userId.toString()` ném TypeError.
- **Cách sửa:** Thêm `@IsMongoId()` cho `userId`.

### 2.2 Socket ở frontend không theo phiên đăng nhập
- **Vị trí:** [App.tsx:53](../frontend/src/App.tsx#L53), [Profile.tsx:147](../frontend/src/pages/Profile.tsx#L147)
- **Vấn đề:**
  - Socket chỉ kết nối khi `App` mount lần đầu. Sau khi login hoặc đăng ký trong cùng tab (điều hướng SPA, không reload), **không có realtime cho tới khi reload trang**.
  - Nút logout ở trang Profile không gọi `disconnectSocket`. Nếu người khác đăng nhập tiếp trên cùng tab, socket của người trước vẫn nhận tin của người trước.
- **Cách sửa:** Gọi `connectSocket` sau khi login/verify thành công; gom logout về một hàm duy nhất (disconnect socket + gọi API logout + xoá session).

### 2.3 Logout không thu hồi gì ở server
- **Vấn đề:** Frontend không gọi `POST /auth/logout`, nên refresh token không bị revoke và access token không bị blacklist. Push subscription cũng không bị xoá, nên trình duyệt vẫn nhận push của tài khoản cũ.
- **Cách sửa:** Trong hàm logout chung: gọi `/auth/logout` với `refresh_token`, gọi `DELETE /notifications/subscribe` và `pushManager.getSubscription().unsubscribe()`.

### 2.4 Bấm push notification dẫn tới trang trống
- **Vị trí:** [notification.service.ts:49](../backend/src/modules/notification/notification.service.ts#L49)
- **Vấn đề:** Server gửi URL `/chat/:id`, nhưng router frontend chỉ có `/messages`.
- **Cách sửa:** Đổi URL thành route có thật (ví dụ `/messages?c=<id>`) và để trang Messages chọn hội thoại theo query param.

### 2.5 Chặn / huỷ kết bạn không ngăn nhắn tin
- **Vấn đề:** `SendMessageUseCase` và `CreateConversationUseCase` không kiểm tra block hay friendship. Người bị chặn vẫn nhắn được trong hội thoại direct đã có, và ai cũng tạo được hội thoại với bất kỳ user nào.
- **Cách sửa:** Với hội thoại direct, kiểm tra `friendshipRepository.findBetween` trước khi gửi/tạo; chặn nếu trạng thái là `blocked`.

---

## 3. Trung bình

### 3.1 Lỗi nghiệp vụ bị trả về 500 kèm message nội bộ
- **Vị trí:** [http-exception.filter.ts:51](../backend/src/shared/filters/http-exception.filter.ts#L51)
- **Ví dụ:** `throw new Error('Message not found')` trong add/remove reaction; `ObjectId` không hợp lệ gây `BSONError`/`CastError`; accept lời mời không còn pending; "Direct conversation must have exactly 2 participants".
- **Cách sửa:** Dùng domain exception có status 4xx; validate id bằng `ParseMongoIdPipe` hoặc `@IsMongoId()`; nhánh `Error` chung không nên trả `exception.message` cho client.

### 3.2 Không có rate limit
- `/auth/register` gửi email mỗi lần gọi → có thể bị dùng để spam và làm cạn quota Brevo.
- `/auth/login` có thể bị brute-force.
- **Cách sửa:** Dùng `@nestjs/throttler` cho nhóm route auth.

### 3.3 Validation thiếu
- Nội dung tin nhắn không giới hạn độ dài. Mỗi page chứa tối đa 100 tin trong một document, nên nội dung lớn có thể làm document vượt giới hạn 16MB của MongoDB và page đó hỏng. → thêm `MaxLength` (ví dụ 4000).
- Body `emoji` của reaction là inline type `{ emoji: string }`, không có DTO nên không được validate.

### 3.4 Chọn "page cuối" dựa vào thứ tự tự nhiên
- **Vị trí:** [page.repository.ts:26](../backend/src/modules/message/infrastructure/page.repository.ts#L26)
- **Vấn đề:** `findByConversationId` không sort, nhưng `SendMessageUseCase` lấy `pages[length-1]` làm page cuối.
- **Cách sửa:** Thêm `.sort({ pageNumber: 1 })`.

### 3.5 Frontend chỉ tải page mới nhất
- **Vị trí:** `conversationService.getLatestMessages`
- **Vấn đề:** Ngay sau khi sang page mới, khung chat có thể chỉ hiện 1 tin và không có cách xem tin cũ hơn.
- **Cách sửa:** Tải thêm page trước khi page mới nhất có ít tin, và thêm "load more" khi cuộn lên.

### 3.6 Hai luồng refresh token tranh nhau
- **Vấn đề:** Handler `connect_error` của socket ([socket.ts:31](../frontend/src/lib/socket.ts#L31)) và interceptor của apiClient refresh độc lập với cùng một refresh token. Vì token được rotate, luồng chạy sau sẽ fail và người dùng bị logout.
- **Cách sửa:** Dùng chung một hàm refresh có khoá (single-flight) cho cả hai.

### 3.7 Push ở frontend
- [usePushNotifications.ts:63](../frontend/src/shared/hooks/usePushNotifications.ts#L63) đọc `VITE_API_URL`, khác với `VITE_*_API_URL` mà `environmentLoader` dùng → trên production có thể gửi tới `localhost:3000`. Nên dùng `apiClient`.
- `sw.js` bỏ qua notification khi app đang focus. Với `userVisibleOnly: true`, Chrome có thể tự hiện thông báo chung chung ("site updated in background").
- Icon `/favicon.ico` không tồn tại (`public/` chỉ có `favicon.svg`).

### Khác
- Xoá hội thoại direct là xoá cho cả hai bên (đã ghi chú trong code); socket không được rời khỏi room khi hội thoại bị xoá.

---

## 4. Tooling và vệ sinh repo

| Hạng mục | Kết quả |
|---|---|
| Backend `tsc --noEmit` | Sạch, trừ 1 lỗi trong `test/app.e2e-spec.ts` |
| Backend ESLint | `eslint.config.mjs` rỗng → `npm run lint` không kiểm tra gì |
| Backend Jest | 2/4 test suite fail (spec scaffold thiếu provider) |
| Frontend `tsc -b` | Sạch |
| Frontend ESLint | 2 lỗi: [PresenceContext.tsx](../frontend/src/contexts/PresenceContext.tsx), [usePushNotifications.ts:7](../frontend/src/shared/hooks/usePushNotifications.ts#L7) |

- Hầu như chưa có test cho các luồng quan trọng: auth, send-message, kiểm tra quyền truy cập.
- Mail gửi qua Brevo (`BREVO_API_KEY`, `SMTP_FROM`) nhưng `.env.example` chỉ có cấu hình SMTP; dependency `nodemailer` không được dùng. `.env.example` cũng thiếu `VAPID_*`.
- Gitlink rác `backend/.claude/worktrees/agent-a71c41bd` bị commit.
- CORS mở `*` ở cả REST ([main.ts:16](../backend/src/main.ts#L16)) lẫn WebSocket ([chat.gateway.ts:31](../backend/src/modules/realtime/gateway/chat.gateway.ts#L31)).

---

## 5. Điểm tốt
- Kiến trúc chia lớp domain / application / infrastructure rõ ràng; event bus tách realtime và notification khỏi nghiệp vụ.
- Refresh token chỉ lưu hash SHA-256, có rotation, hết hạn tự động qua TTL index.
- Upload ảnh an toàn: re-encode bằng sharp, tên file dùng uuid, giới hạn kích thước ngay ở Multer.
- Thêm tin nhắn vào page bằng một lệnh atomic có điều kiện `$expr`, có retry khi tạo page trùng số.
