# Conversation & Message API — Tài liệu Backend

Tài liệu mô tả toàn bộ API liên quan đến hội thoại (conversations), tin nhắn (messages), và file upload trong BabyChat.

- **Base URL:** `http://localhost:3000`
- **Swagger UI:** `http://localhost:3000/api/docs`
- **Tất cả endpoint** trong tài liệu này yêu cầu header `Authorization: Bearer <access_token>`

---

## 1. Mô hình dữ liệu

### Conversation
Một hội thoại có 3 loại: `direct` (1-1), `group` (nhóm), `channel`.

- **Direct:** Tự động tạo khi 2 user chấp nhận kết bạn. Luôn có đúng 2 participants.
- **Group:** Bất kỳ user nào tạo. Creator tự động là `admin`. Tối đa 500 participants.

### Pagination — Page Model
Tin nhắn được lưu theo **Page**:
- Mỗi page chứa tối đa `pageSize` tin nhắn (default 50, max 100).
- Khi page đầy → page mới tự động được tạo với `pageNumber` tăng lên.
- FE query `GET /conversations/:id/pages` để biết có bao nhiêu page, rồi `GET /conversations/messages/:id/:pageNum` để lấy tin nhắn.

```
Conversation (id: X)
  └── Page 1 (messages 1–50)
  └── Page 2 (messages 51–100)
  └── Page 3 (messages 101–...) ← active page
```

---

## 2. Bảng API tham chiếu nhanh

### 2.1 Conversations

| Method | Path | Mục đích |
|---|---|---|
| `GET` | `/conversations` | Danh sách conversation của user đang đăng nhập |
| `GET` | `/conversations/:id` | Chi tiết 1 conversation |
| `POST` | `/conversations` | Tạo conversation mới |
| `DELETE` | `/conversations/:id` | Xóa conversation (soft delete) |
| `PATCH` | `/conversations/:id/avatar` | Cập nhật avatar nhóm |
| `PATCH` | `/conversations/:id/participants/me/username` | Đổi nickname của mình trong conversation |

### 2.2 Messages

| Method | Path | Mục đích |
|---|---|---|
| `POST` | `/conversations/messages` | Gửi tin nhắn |
| `GET` | `/conversations/messages/:conversationId/:pageNum` | Lấy tin nhắn theo trang |
| `GET` | `/conversations/:id/pages` | Danh sách pages (metadata) của conversation |

### 2.3 Files

| Method | Path | Mục đích |
|---|---|---|
| `POST` | `/files` | Upload ảnh (multipart/form-data) |
| `GET` | `/files/:id` | Lấy metadata 1 file |
| `DELETE` | `/files/:id` | Xóa file (chỉ owner) |

---

## 3. Chi tiết API

### `GET /conversations`

Trả về danh sách tất cả conversation mà user hiện tại đang tham gia (chưa xóa).

**Response 200:**
```json
[
  {
    "id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "type": "direct",
    "name": null,
    "description": null,
    "avatarUrl": null,
    "createdBy": "64a1b2c3d4e5f6a7b8c9d0e2",
    "participants": [
      {
        "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
        "username": "alice",
        "role": "admin",
        "joinedAt": "2026-06-01T10:00:00.000Z",
        "isActive": true
      },
      {
        "userId": "64a1b2c3d4e5f6a7b8c9d0e3",
        "username": "bob",
        "role": "member",
        "joinedAt": "2026-06-01T10:00:00.000Z",
        "isActive": true
      }
    ],
    "settings": {
      "isPrivate": false,
      "allowInvites": true
    },
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-01T10:00:00.000Z"
  }
]
```

---

### `GET /conversations/:id`

Lấy chi tiết 1 conversation theo ID.

**Response 200:** Shape giống item trong `/conversations`.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 404 | Conversation không tồn tại hoặc đã bị xóa |

---

### `POST /conversations`

Tạo conversation mới. Creator (lấy từ JWT) tự động là `admin`.

**Request body:**
```json
{
  "type": "group",
  "name": "Team Alpha",
  "description": "Nhóm dự án Alpha",
  "participants": [
    { "userId": "64a1b2c3d4e5f6a7b8c9d0e3" },
    { "userId": "64a1b2c3d4e5f6a7b8c9d0e4" }
  ]
}
```

> **Lưu ý:** Với `type: "direct"`, `participants` phải chứa đúng 1 userId (người kia). Creator không cần tự thêm mình vào.

**Response 201:** Shape giống `/conversations/:id`.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 400 | `type = 'group'` nhưng thiếu `name`; `type = 'direct'` nhưng không có đúng 1 participant |
| 404 | Một trong các userId trong `participants` không tồn tại |

---

### `DELETE /conversations/:id`

Xóa conversation (soft delete — set `deletedAt`, không xóa data).

**Quy tắc authorization:**
- `direct`: bất kỳ participant nào
- `group` / `channel`: chỉ `admin` hoặc `createdBy`

**Response 204:** Không có body.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 403 | Không đủ quyền |
| 404 | Conversation không tồn tại |

---

### `PATCH /conversations/:id/avatar`

Gán avatar đã upload cho conversation. Chỉ `admin` hoặc `createdBy`.

> **Workflow:** Upload file trước với `POST /files?category=conversation_avatar` → lấy `fileId` từ response → gọi endpoint này.

**Request body:**
```json
{
  "fileId": "64a1b2c3d4e5f6a7b8c9d0f0"
}
```

**Response 200:** Conversation đã cập nhật.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 403 | Không phải admin/creator; hoặc fileId không thuộc về user hiện tại |
| 404 | Conversation hoặc file không tồn tại |

---

### `PATCH /conversations/:id/participants/me/username`

Đặt nickname của mình trong conversation này. Không ảnh hưởng `User.username` gốc.

**Request body:**
```json
{
  "username": "Bob ở Alpha team"
}
```

**Response 200:** Conversation đã cập nhật.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 403 | User không phải participant của conversation |
| 404 | Conversation không tồn tại |

---

### `POST /conversations/messages`

Gửi tin nhắn vào conversation. Sender lấy từ JWT (không nhận từ body).

**Request body — tin nhắn văn bản:**
```json
{
  "conversationId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "content": "Xin chào!",
  "type": "text"
}
```

**Request body — reply:**
```json
{
  "conversationId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "content": "Đồng ý với bạn",
  "type": "text",
  "replyId": "64a1b2c3d4e5f6a7b8c9d0f0"
}
```

**Request body — tin nhắn ảnh:**
```json
{
  "conversationId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "content": "Caption tùy chọn",
  "type": "image",
  "fileId": "64a1b2c3d4e5f6a7b8c9d0f0"
}
```
> **Workflow ảnh:** Upload trước với `POST /files?category=message_image` → lấy `fileId` → gọi endpoint này.

**Response 201:**
```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d111",
  "senderId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "content": "Xin chào!",
  "type": "text",
  "fileUrl": null,
  "replyId": null,
  "replySnippet": null,
  "replySenderId": null,
  "createdAt": "2026-09-08T00:00:00.000Z",
  "updatedAt": "2026-09-08T00:00:00.000Z"
}
```

**Realtime:** Tin nhắn sẽ được push realtime đến tất cả participant khác (trừ sender) qua WebSocket event `message.new`. Xem [`socket-architecture.md`](socket-architecture.md).

**Lỗi:**

| Status | Khi nào |
|---|---|
| 403 | Sender không phải participant của conversation |
| 404 | Conversation không tồn tại; hoặc `replyId` không tìm thấy |
| 400 | `type = 'image'` nhưng thiếu `fileId`; `type = 'text'` nhưng `content` rỗng |

---

### `GET /conversations/messages/:conversationId/:pageNum`

Lấy tin nhắn của 1 page cụ thể.

**Path params:**
- `conversationId`: ID của conversation
- `pageNum`: Số page (bắt đầu từ 1)

**Response 200:**
```json
[
  {
    "id": "64a1b2c3d4e5f6a7b8c9d111",
    "senderId": "64a1b2c3d4e5f6a7b8c9d0e2",
    "content": "Xin chào!",
    "type": "text",
    "fileUrl": null,
    "replyId": null,
    "replySnippet": null,
    "replySenderId": null,
    "createdAt": "2026-09-08T00:00:00.000Z",
    "updatedAt": "2026-09-08T00:00:00.000Z"
  }
]
```

**Lưu ý:**
- Trả về array rỗng `[]` nếu page không tồn tại (không phải 404)
- Với `type = 'image'`, `fileUrl` sẽ là URL đầy đủ của ảnh

---

### `GET /conversations/:id/pages`

Lấy danh sách metadata của tất cả pages trong conversation.

**Response 200:**
```json
{
  "conversationId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "pages": [
    {
      "pageNumber": 1,
      "messageCount": 50,
      "startTime": "2026-06-01T10:00:00.000Z",
      "endTime": "2026-07-01T12:00:00.000Z"
    },
    {
      "pageNumber": 2,
      "messageCount": 23,
      "startTime": "2026-07-01T12:01:00.000Z",
      "endTime": null
    }
  ],
  "totalPages": 2,
  "totalMessages": 73
}
```

---

## 4. File API

### `POST /files`

Upload ảnh. Dùng `multipart/form-data`.

**Query params:**
- `category`: `user_avatar` | `conversation_avatar` | `message_image` | `other`

**Form fields:**
- `file`: File ảnh (jpeg, png, webp, gif)

**Response 201:**
```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0f0",
  "url": "/uploads/abc123.webp",
  "thumbnailUrl": "/uploads/thumb_abc123.webp",
  "width": 400,
  "height": 400,
  "size": 45120,
  "mimetype": "image/webp",
  "originalName": "avatar.png",
  "category": "user_avatar",
  "createdAt": "2026-09-08T00:00:00.000Z"
}
```

**Giới hạn:**
- Max size: `UPLOAD_MAX_SIZE_MB` (default 5MB)
- Ảnh được tự động convert sang WebP và resize
- Avatar (`user_avatar`, `conversation_avatar`) tạo thêm thumbnail

**Lỗi:**

| Status | Khi nào |
|---|---|
| 400 | Thiếu file; sai MIME type (không phải jpeg/png/webp/gif) |
| 413 | File vượt quá dung lượng cho phép |

---

### `GET /files/:id`

Lấy metadata của file theo ID.

**Response 200:** Shape giống `POST /files`.

**Lỗi:** 404 nếu không tồn tại.

---

### `DELETE /files/:id`

Xóa file (vật lý trên disk + xóa document trong DB). Chỉ owner mới được xóa.

**Response 204:** Không có body.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 403 | Không phải owner |
| 404 | File không tồn tại |

---

## 5. Recipe FE cho các use case thường gặp

### 5.1 Load conversation và tin nhắn

```ts
// Bước 1: lấy danh sách conversation
const conversations = await api.get('/conversations');

// Bước 2: khi user click vào 1 conversation — lấy pages metadata
const { pages, totalPages } = await api.get(`/conversations/${convId}/pages`);

// Bước 3: load page cuối cùng (tin nhắn mới nhất)
const messages = await api.get(`/conversations/messages/${convId}/${totalPages}`);
```

### 5.2 Gửi tin nhắn văn bản

```ts
const response = await api.post('/conversations/messages', {
  conversationId: convId,
  content: text,
  type: 'text',
});
// Render message ngay từ response (không cần đợi WS event)
// WS event 'message.new' sẽ broadcast cho các participants khác
```

### 5.3 Gửi ảnh

```ts
// Bước 1: upload file
const formData = new FormData();
formData.append('file', imageFile);
const { id: fileId } = await api.post('/files?category=message_image', formData);

// Bước 2: gửi tin nhắn
const response = await api.post('/conversations/messages', {
  conversationId: convId,
  content: '',  // caption optional
  type: 'image',
  fileId,
});
```

### 5.4 Tạo nhóm chat

```ts
const conversation = await api.post('/conversations', {
  type: 'group',
  name: 'Nhóm mới',
  participants: friendIds.map(id => ({ userId: id })),
});
// Conversation mới sẽ được broadcast qua WS event 'conversation.created'
// tới tất cả participants
```

### 5.5 Phân trang tin nhắn (load thêm)

```ts
// User scroll lên trên → load page trước đó
const olderMessages = await api.get(`/conversations/messages/${convId}/${currentPage - 1}`);
```
