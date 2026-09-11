# Friendship Flow — Tài liệu cho Frontend

Tài liệu mô tả luồng gửi/chấp nhận lời mời kết bạn, quản lý friend code và các API liên quan trong BabyChat.

- Base URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- Mọi endpoint trong tài liệu này (trừ chỗ ghi rõ) đều cần header `Authorization: Bearer <access_token>`.

---

## 1. Mô hình quan hệ bạn bè

Một bản ghi `friendship` đại diện cho **một chiều** quan hệ giữa 2 user. Các trạng thái:

| status | Ý nghĩa |
|---|---|
| `pending` | A đã gửi lời mời cho B, B chưa duyệt |
| `accepted` | B đã chấp nhận, 2 người là bạn |
| `blocked` | A đã chặn B (requesterId = người chặn) |

**Lưu ý quan trọng:**
- Khi 2 người đã là bạn (`accepted`), DB chỉ lưu **1 document** chứ không lưu 2 chiều.
- Khi chấp nhận lời mời, hệ thống **tự động tạo** 1 conversation `type: direct` giữa 2 người.
- Không có 2 lời mời pending cùng tồn tại giữa 2 user (chiều nào cũng vậy).

---

## 2. Luồng gửi & chấp nhận lời mời (text diagram)

```
┌─────────────┐                                    ┌─────────────┐
│   User A    │                                    │   User B    │
│ (requester) │                                    │ (recipient) │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  ① B lấy/tạo friend code:                       │
       │     GET /users/me/friend-code                    │
       │                                                  ├─→ DB
       │                                            ◄─────┤ { friendCode: "A7F2K9XP" }
       │                                                  │
       │  ② B share code cho A (qua app khác/QR/text)    │
       │ ◄────────────────────────────────────────────────┤
       │                                                  │
       │  ③ A preview B trước khi gửi:                   │
       │     GET /users/by-friend-code/A7F2K9XP           │
       │ ──→ DB                                           │
       │ ◄── { id, username, email }                      │
       │                                                  │
       │  ④ A gửi friend request:                        │
       │     POST /friendships/requests/by-code           │
       │     body: { "friendCode": "A7F2K9XP" }           │
       │ ──→ DB (insert friendship: status=pending)       │
       │ ◄── { id, status: "pending", ... }               │
       │                                                  │
       │                                ⑤ B xem lời mời: │
       │                       GET /friendships/requests/incoming
       │                                                  ├─→ DB
       │                                            ◄─────┤ [{ id, friend: {userId,username}, status: "pending" }]
       │                                                  │
       │                            ⑥ B chấp nhận:       │
       │                  POST /friendships/requests/:id/accept
       │                                                  ├─→ DB (update status=accepted)
       │                                                  ├─→ Auto-create direct conversation
       │                                            ◄─────┤ { status: "accepted", acceptedAt: ... }
       │                                                  │
       │  ⑦ Giờ A & B đã là bạn, có thể chat trực tiếp.  │
       │                                                  │
```

---

## 3. Bảng API tham chiếu nhanh

### 3.1 Friend code (thuộc module `users`)

| Method | Path | Mục đích |
|---|---|---|
| `GET` | `/users/me/friend-code` | Lấy code của mình, tự sinh nếu chưa có |
| `POST` | `/users/me/friend-code/regenerate` | Sinh code mới (vô hiệu code cũ) |
| `GET` | `/users/by-friend-code/:code` | Tra cứu user theo code (preview) |

### 3.2 Friendship (thuộc module `friendships`)

| Method | Path | Mục đích |
|---|---|---|
| `GET` | `/friendships` | Danh sách bạn (đã accepted) |
| `GET` | `/friendships/requests/incoming` | Lời mời đang chờ mình duyệt |
| `GET` | `/friendships/requests/outgoing` | Lời mời mình đã gửi |
| `POST` | `/friendships/requests` | Gửi lời mời bằng userId |
| `POST` | `/friendships/requests/by-code` | Gửi lời mời bằng friend code (khuyến nghị) |
| `POST` | `/friendships/requests/:id/accept` | Chấp nhận (recipient) |
| `POST` | `/friendships/requests/:id/reject` | Từ chối (recipient) |
| `DELETE` | `/friendships/requests/:id` | Hủy lời mời đã gửi (requester) |
| `DELETE` | `/friendships/friends/:friendUserId` | Hủy kết bạn |
| `POST` | `/friendships/block` | Chặn user |
| `DELETE` | `/friendships/block/:userId` | Bỏ chặn |

---

## 4. Chi tiết từng API

### 4.1 `GET /users/me/friend-code`

Lấy friend code của user hiện tại. Nếu user chưa có code, hệ thống tự sinh + lưu rồi trả về.

**Response 200:**
```json
{
  "friendCode": "A7F2K9XP"
}
```

**Ghi chú format code:**
- 8 ký tự, alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (32 ký tự, loại 0/O/1/I/L để tránh nhầm).
- FE có thể hiển thị dạng `XXXX-XXXX` cho dễ đọc — backend chấp nhận cả 2.

### 4.2 `POST /users/me/friend-code/regenerate`

Sinh code mới, ghi đè code cũ. Dùng khi user nghi ngờ code bị spam.

**Response 200:**
```json
{
  "friendCode": "M3K8N2QR"
}
```

### 4.3 `GET /users/by-friend-code/:code`

Tra cứu user công khai theo code (để FE hiển thị "Bạn sắp gửi lời mời cho X. Xác nhận?").

**Path param:**
- `code`: friend code, không phân biệt hoa thường, chấp nhận space/dash (vd `A7F2-K9XP` hoặc `a7f2 k9xp`).

**Response 200:**
```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "username": "johndoe",
  "email": "john@example.com"
}
```

**Response 404:** Code không tồn tại.

### 4.4 `POST /friendships/requests/by-code`

Gửi lời mời kết bạn bằng friend code (cách khuyến nghị).

**Request body:**
```json
{
  "friendCode": "A7F2K9XP"
}
```

**Response 201:**
```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0f0",
  "requesterId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "recipientId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "status": "pending",
  "createdAt": "2026-06-02T10:00:00.000Z",
  "updatedAt": "2026-06-02T10:00:00.000Z"
}
```

**Các lỗi có thể gặp:**

| Status | Error code | Khi nào xảy ra |
|---|---|---|
| 400 | `CannotFriendSelf` | Friend code là của chính user hiện tại |
| 404 | `UserNotFound` | Friend code không tồn tại |
| 409 | `FriendshipAlreadyExists` | Đã có quan hệ pending hoặc accepted giữa 2 người |
| 403 | `FriendshipBlocked` | Một trong 2 bên đã chặn bên kia |

### 4.5 `POST /friendships/requests` (gửi bằng userId)

Dùng khi FE đã có sẵn userId của recipient (vd từ danh sách gợi ý, mutual friends...). Validation và lỗi giống `/by-code`.

**Request body:**
```json
{
  "recipientId": "64a1b2c3d4e5f6a7b8c9d0e1"
}
```

### 4.6 `GET /friendships/requests/incoming`

Danh sách lời mời đang chờ user hiện tại duyệt.

**Response 200:**
```json
[
  {
    "id": "64a1b2c3d4e5f6a7b8c9d0f0",
    "requesterId": "64a1b2c3d4e5f6a7b8c9d0e2",
    "recipientId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "status": "pending",
    "friend": {
      "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
      "username": "alice"
    },
    "createdAt": "2026-06-02T10:00:00.000Z",
    "updatedAt": "2026-06-02T10:00:00.000Z"
  }
]
```

**Lưu ý:**
- Field `friend` luôn là **đối phương** so với user hiện tại — FE không cần tự so userId.
- `friend.username = null` nếu user đó đã bị xóa.

### 4.7 `GET /friendships/requests/outgoing`

Tương tự `/incoming`, nhưng trả lời mời mà user hiện tại đã gửi đi và chưa được duyệt.

### 4.8 `POST /friendships/requests/:id/accept`

Chấp nhận lời mời. Chỉ recipient mới được gọi endpoint này.

**Side effect:** Hệ thống tự tạo 1 direct conversation giữa 2 user (nếu chưa tồn tại). FE không cần làm gì thêm; gọi `GET /conversations` ngay sau accept sẽ thấy conversation mới.

**Response 200:**
```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0f0",
  "requesterId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "recipientId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "status": "accepted",
  "acceptedAt": "2026-06-02T10:05:00.000Z",
  "createdAt": "2026-06-02T10:00:00.000Z",
  "updatedAt": "2026-06-02T10:05:00.000Z"
}
```

**Lỗi:**

| Status | Error code | Khi nào |
|---|---|---|
| 404 | `FriendshipNotFound` | ID không tồn tại |
| 403 | `NotFriendshipRecipient` | User hiện tại không phải recipient |

### 4.9 `POST /friendships/requests/:id/reject`

Từ chối lời mời. Document bị xóa hẳn để requester có thể gửi lại sau này.

**Response 204:** Không có body.

**Lỗi:** giống `/accept`.

### 4.9b `DELETE /friendships/requests/:id`

Hủy lời mời mình đã gửi. Chỉ **requester** được gọi, và chỉ khi status còn `pending`.

**Response 204:** Không có body.

**Lỗi:**

| Status | Error code | Khi nào |
|---|---|---|
| 404 | `FriendshipNotFound` | ID không tồn tại, đã được accepted/blocked, hoặc user không phải requester |

> Lưu ý: backend trả 404 chung cho mọi case "không cho cancel" thay vì 403 — để không leak thông tin status của lời mời.

### 4.10 `GET /friendships`

Danh sách bạn đã accepted của user hiện tại. Shape giống `/incoming` nhưng `status: "accepted"`.

### 4.11 `DELETE /friendships/friends/:friendUserId`

Hủy kết bạn với một user.

**Response 204:** Không có body.

**Lỗi:**

| Status | Error code | Khi nào |
|---|---|---|
| 404 | `FriendshipNotFound` | Chưa từng kết bạn với user này |

### 4.12 `POST /friendships/block`

Chặn user. Nếu đang có quan hệ pending/accepted thì xóa rồi tạo bản ghi `blocked` mới.

**Request body:**
```json
{
  "userId": "64a1b2c3d4e5f6a7b8c9d0e1"
}
```

**Response 201:** Trả về document friendship với `status: "blocked"`.

### 4.13 `DELETE /friendships/block/:userId`

Bỏ chặn. Chỉ xóa được bản ghi blocked do chính user hiện tại tạo.

**Response 204.**

---

## 5. Recipe FE cho các use case thường gặp

### 5.1 Hiển thị "thêm bạn bằng code"

```ts
// Bước 1: user nhập/paste code
const code = userInput; // "A7F2-K9XP", " a7f2 k9xp ", "A7F2K9XP" đều ok

// Bước 2: preview
const previewResp = await api.get(`/users/by-friend-code/${code}`);
if (previewResp.status === 404) {
  showError("Không tìm thấy user với code này");
  return;
}
showConfirmDialog(`Gửi lời mời cho ${previewResp.data.username}?`);

// Bước 3: user xác nhận → gửi request
const sendResp = await api.post('/friendships/requests/by-code', { friendCode: code });
// Xử lý lỗi 409 (đã là bạn), 403 (bị chặn), 400 (tự kết bạn)...
```

### 5.2 Trang "Lời mời kết bạn"

```ts
// Lấy 2 list song song
const [incoming, outgoing] = await Promise.all([
  api.get('/friendships/requests/incoming'),
  api.get('/friendships/requests/outgoing'),
]);

// Render từng list dùng item.friend.username
// Incoming: nút "Chấp nhận" → POST /requests/:id/accept, "Từ chối" → POST /requests/:id/reject
// Outgoing: nút "Hủy" → DELETE /requests/:id
```

### 5.3 Sau khi accept lời mời

```ts
await api.post(`/friendships/requests/${id}/accept`);
// Tùy chọn: refresh danh sách conversation để hiển thị cuộc trò chuyện mới
const conversations = await api.get('/conversations');
```

### 5.4 Trang "Bạn bè của tôi"

```ts
const friends = await api.get('/friendships');
// friends là array, mỗi item có item.friend = { userId, username }
// Render danh sách + nút "Nhắn tin" (route đến conversation direct tương ứng)
// + nút "Hủy kết bạn" (gọi DELETE /friendships/friends/:friendUserId)
```

### 5.5 Trang "Mã của tôi" (settings)

```ts
// Lấy code hiện tại
const { friendCode } = await api.get('/users/me/friend-code');
// Hiển thị code (dạng XXXX-XXXX cho dễ đọc) + nút "Sao chép" + "Tạo QR"

// Nếu user nhấn "Tạo code mới"
const { friendCode: newCode } = await api.post('/users/me/friend-code/regenerate');
```

---

## 6. Mapping mã lỗi → message hiển thị (gợi ý)

| `error` | Message FE đề xuất |
|---|---|
| `UserNotFound` | "Không tìm thấy người dùng này" |
| `CannotFriendSelf` | "Bạn không thể kết bạn với chính mình" |
| `FriendshipAlreadyExists` | "Hai bạn đã là bạn bè hoặc đang có lời mời chờ duyệt" |
| `FriendshipBlocked` | "Không thể gửi lời mời do một trong hai đã chặn bên kia" |
| `FriendshipNotFound` | "Lời mời/quan hệ không tồn tại" |
| `NotFriendshipRecipient` | "Chỉ người nhận lời mời mới được thực hiện thao tác này" |

Tất cả response lỗi đều có shape:
```json
{
  "error": "<error code>",
  "message": "<message tiếng Anh từ server>",
  "statusCode": 4xx
}
```

---

## 7. Câu hỏi thường gặp

**Q: Nếu user A reject lời mời của B, B có thể gửi lại không?**
A: Có. Reject xóa document hoàn toàn → B có thể gọi lại `POST /friendships/requests/by-code` bình thường.

**Q: User A chặn B rồi unblock thì có cần gửi lại lời mời để kết bạn không?**
A: Có. Chặn xóa quan hệ accepted/pending cũ. Sau unblock, 2 user trở về trạng thái "chưa quen biết" → phải gửi lời mời mới.

**Q: Khi 2 bạn unfriend nhau, direct conversation cũ còn không?**
A: Có. Conversation và tin nhắn cũ vẫn còn. Nếu kết bạn lại, hệ thống không tạo conversation mới (logic listener đã check duplicate).

**Q: Có endpoint xóa lời mời mình đã gửi (cancel outgoing) không?**
A: Có. Dùng `DELETE /friendships/requests/:id`. Chỉ requester gọi được, chỉ khi status còn `pending`. Sau khi hủy, requester có thể gửi lại lời mời bất kỳ lúc nào.

**Q: Friend code có hết hạn không?**
A: Không. Code chỉ thay đổi khi user chủ động gọi `/regenerate`.
