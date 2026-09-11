# Avatar & File Upload Guide — Hướng dẫn FE

Tài liệu cho FE (React + TypeScript) về upload ảnh và gán avatar (user/conversation) + gửi ảnh trong tin nhắn.

- Server: `http://localhost:3000`
- Mọi endpoint cần header `Authorization: Bearer <access_token>`
- Ảnh được serve static tại `/uploads/<filename>` (public URL)

---

## 1. Nguyên tắc cốt lõi: upload tách rời khỏi gán

Hệ thống dùng flow **2 bước**:

```
Bước 1: POST /files          → upload file vật lý, trả về { id, url, ... }
Bước 2: gán fileId vào đâu đó → PATCH /users/me/avatar | PATCH /conversations/:id/avatar | POST messages
```

**Tại sao tách?**
- Upload xong có thể retry bước gán mà không upload lại.
- 1 ảnh dùng được cho nhiều mục đích.
- Endpoint gán nhận JSON đơn giản (`{ fileId }`), không phải multipart.

> **Lưu ý quan trọng:** Chỉ `POST /files` **KHÔNG** làm ảnh xuất hiện ở đâu cả. Phải gọi bước 2 để "gán". Nếu chỉ upload mà `/profile` vẫn trả `avatarUrl: null` → đó là vì chưa gọi bước gán.

---

## 2. Bước 1: Upload file (`POST /files`)

Dùng chung cho mọi loại ảnh. Khác nhau ở `category`.

### Request

```
POST /files?category=user_avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

field "file" = <binary ảnh>
```

`category` (query param, optional, default `other`):
- `user_avatar` — avatar người dùng (server center-crop vuông 512px)
- `conversation_avatar` — avatar nhóm (center-crop vuông 512px)
- `message_image` — ảnh trong tin nhắn (giữ tỉ lệ, max 1280px)
- `other`

### Response 201

```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "category": "user_avatar",
  "url": "/uploads/abc.webp",
  "thumbnailUrl": "/uploads/thumb_abc.webp",
  "mimetype": "image/webp",
  "size": 45210,
  "width": 512,
  "height": 512,
  "createdAt": "2026-06-04T10:00:00.000Z"
}
```

> **`id` chính là `fileId`** dùng cho bước 2. Không phải tên file.

### Lỗi

| Status | error | Khi nào |
|---|---|---|
| 400 | `InvalidFileType` | Không phải ảnh (jpeg/png/webp/gif) |
| 400 | `MissingFile` | Không có field `file` |
| 413 | `FileTooLarge` | Vượt 5MB (cấu hình `UPLOAD_MAX_SIZE_MB`) |

### Code helper upload

```ts
// src/lib/upload.ts
export interface UploadedFile {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
}

export async function uploadImage(
  file: File,
  category: 'user_avatar' | 'conversation_avatar' | 'message_image' | 'other',
  token: string,
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/files?category=${category}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // KHÔNG set Content-Type — browser tự thêm boundary
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Upload failed');
  }
  return res.json();
}
```

> **Đừng tự set `Content-Type`** khi gửi `FormData` — browser tự thêm `multipart/form-data; boundary=...`. Set tay sẽ làm hỏng request.

---

## 3. Avatar người dùng

### Flow

```
┌─────────┐
│  User   │  chọn ảnh từ máy
└────┬────┘
     │ ① POST /files?category=user_avatar  (multipart)
     │ ◄── { id: "file123", url, thumbnailUrl }
     │
     │ ② PATCH /users/me/avatar  { fileId: "file123" }
     │ ◄── { id, username, email, avatarUrl }
     │
     │ ③ GET /auth/profile  → avatarUrl + thumbnailUrl đã có
```

### Bước 2: `PATCH /users/me/avatar`

```
PATCH /users/me/avatar
Authorization: Bearer <token>
Content-Type: application/json

{ "fileId": "64a1b2c3d4e5f6a7b8c9d0e1" }
```

Response 200:
```json
{
  "id": "64a1b2c3d4e5f6a7b8c9d0e2",
  "username": "johndoe",
  "email": "user@example.com",
  "avatarUrl": "/uploads/abc.webp"
}
```

Lỗi:
| Status | error | Khi nào |
|---|---|---|
| 403 | `FileAccessDenied` | fileId không phải file bạn upload |
| 404 | `FileNotFound` | fileId không tồn tại |

### React component đầy đủ

```tsx
// src/components/AvatarUploader.tsx
import { useState } from 'react';
import { uploadImage } from '@/lib/upload';

export function AvatarUploader({ token, onUpdated }: { token: string; onUpdated: (url: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      // Bước 1: upload
      const uploaded = await uploadImage(file, 'user_avatar', token);

      // Bước 2: gán vào user
      const res = await fetch(`${API_URL}/users/me/avatar`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: uploaded.id }),
      });
      if (!res.ok) throw new Error('Gán avatar thất bại');
      const user = await res.json();

      onUpdated(user.avatarUrl); // cập nhật UI ngay
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={loading} />
      {loading && <span>Đang tải lên...</span>}
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}
```

### Hiển thị avatar

URL trả về là **relative** (`/uploads/abc.webp`). Ghép với base URL:

```tsx
const avatarSrc = profile.avatarUrl
  ? `${API_URL}${profile.avatarUrl}`     // http://localhost:3000/uploads/abc.webp
  : '/default-avatar.png';

<img src={avatarSrc} alt="avatar" />
```

> Dùng `thumbnailUrl` cho danh sách (nhẹ hơn), `avatarUrl` cho trang profile chi tiết.

---

## 4. Avatar conversation

Tương tự avatar user, nhưng **chỉ admin/creator** của nhóm được gán.

```ts
async function updateConversationAvatar(conversationId: string, file: File, token: string) {
  // Bước 1
  const uploaded = await uploadImage(file, 'conversation_avatar', token);

  // Bước 2
  const res = await fetch(`${API_URL}/conversations/${conversationId}/avatar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId: uploaded.id }),
  });
  if (res.status === 403) throw new Error('Chỉ admin/creator mới đổi được avatar nhóm');
  if (!res.ok) throw new Error('Cập nhật thất bại');
  return res.json(); // ConversationResponseDto có avatarUrl
}
```

Lỗi:
| Status | Khi nào |
|---|---|
| 403 | Không phải admin/creator, hoặc fileId không thuộc về bạn |
| 404 | Conversation hoặc file không tồn tại |

Response có `avatarUrl` (resolve sẵn). `GET /conversations` và `GET /conversations/:id` cũng trả `avatarUrl` cho mỗi conversation.

---

## 5. Gửi ảnh trong tin nhắn (image message)

Cũng 2 bước: upload → gửi message với `type: 'image'`.

```
┌─────────┐
│  User   │  chọn ảnh để gửi
└────┬────┘
     │ ① POST /files?category=message_image
     │ ◄── { id: "img456", url }
     │
     │ ② POST /conversations/messages
     │    { conversationId, type: "image", fileId: "img456", content: "" }
     │ ◄── message có { type: "image", fileUrl }
     │
     │ ③ Các participant khác nhận WS event "message.new" có fileUrl
```

### Code

```ts
async function sendImageMessage(
  conversationId: string,
  file: File,
  token: string,
  caption = '',
) {
  // Bước 1: upload
  const uploaded = await uploadImage(file, 'message_image', token);

  // Bước 2: gửi message
  const res = await fetch(`${API_URL}/conversations/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId,
      type: 'image',
      fileId: uploaded.id,
      content: caption, // optional — caption kèm ảnh, có thể rỗng
    }),
  });
  if (!res.ok) throw new Error('Gửi ảnh thất bại');
  return res.json(); // MessageResponseDto: { type:'image', fileUrl, content, ... }
}
```

### Render message

```tsx
function MessageItem({ msg }: { msg: MessageResponseDto }) {
  if (msg.type === 'image' && msg.fileUrl) {
    return <img src={`${API_URL}${msg.fileUrl}`} alt="ảnh" className="message-image" />;
  }
  return <p>{msg.content}</p>;
}
```

### Lưu ý image message

- `content` (caption) **optional** với image message — có thể rỗng.
- Với text message, `content` vẫn **bắt buộc**.
- Tin nhắn reply một image message sẽ có `replySnippet: '[Hình ảnh]'`.
- WS payload `message.new` cũng có `type` + `fileUrl` (xem [socket-client-guide.md](socket-client-guide.md)).

---

## 6. Bảng tham chiếu nhanh

| Mục đích | Bước 1 (upload) | Bước 2 (gán) |
|---|---|---|
| Avatar user | `POST /files?category=user_avatar` | `PATCH /users/me/avatar` `{ fileId }` |
| Avatar nhóm | `POST /files?category=conversation_avatar` | `PATCH /conversations/:id/avatar` `{ fileId }` |
| Ảnh tin nhắn | `POST /files?category=message_image` | `POST /conversations/messages` `{ type:'image', fileId }` |

URL resolve sẵn ở response các endpoint sau:
- `GET /auth/profile` → `avatarUrl`, `thumbnailUrl`
- `GET /users/by-friend-code/:code` → `avatarUrl`
- `GET /conversations`, `GET /conversations/:id` → `avatarUrl` mỗi conversation
- `GET /conversations/messages/:convId/:pageNum` → `fileUrl` mỗi image message

---

## 7. Quản lý file

### Xem metadata
```
GET /files/:id
```

### Xóa file (chỉ owner)
```
DELETE /files/:id
```
Xóa cả file vật lý (main + thumbnail) lẫn metadata. User khác xóa file không phải của mình → 403.

> **Lưu ý:** Xóa file đang được dùng làm avatar/message sẽ làm `avatarUrl`/`fileUrl` resolve về `null` (vì file không còn). Nên cân nhắc trước khi xóa.

---

## 8. Validation phía FE (nên có trước khi upload)

Giảm round-trip lỗi bằng cách validate ở client:

```ts
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB — khớp UPLOAD_MAX_SIZE_MB

function validateImage(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF';
  if (file.size > MAX_SIZE) return 'Ảnh không được vượt quá 5MB';
  return null; // hợp lệ
}
```

> Server vẫn validate lại (không tin client) — đây chỉ để UX tốt hơn.

---

## 9. FAQ

**Q: Upload xong mà `/profile` vẫn `avatarUrl: null`?**
A: Bạn quên bước 2. `POST /files` chỉ upload file, phải gọi `PATCH /users/me/avatar` để gán.

**Q: `fileId` lấy ở đâu?**
A: Là field `id` trong response của `POST /files`. Không phải tên file (`url`).

**Q: Có cần xóa avatar cũ khi đổi avatar mới không?**
A: Không bắt buộc — `PATCH avatar` chỉ ghi đè `avatarFileId`. File cũ vẫn nằm trên server (orphan). Nếu muốn dọn, gọi `DELETE /files/:oldId`.

**Q: Tại sao ảnh trả về là `.webp` dù tôi upload `.jpg`?**
A: Server convert mọi ảnh sang webp (nhẹ + đồng nhất). Kích thước cũng được resize. `<img>` của browser hiển thị webp bình thường.

**Q: URL là relative (`/uploads/...`), dùng sao?**
A: Ghép với base URL server: `${API_URL}${avatarUrl}`. Vì serve static public nên dùng trực tiếp trong `<img src>` được.

**Q: Gửi nhiều ảnh 1 lúc trong tin nhắn được không?**
A: Hiện mỗi message 1 ảnh. Gửi nhiều ảnh → gửi nhiều message. Multi-image trong 1 message cần BE mở rộng.

---

## 10. Liên kết

- [docs/socket-client-guide.md](socket-client-guide.md) — nhận `message.new` realtime (có `fileUrl`).
- [docs/friendship-flow.md](friendship-flow.md) — flow kết bạn.
- Swagger UI: `http://localhost:3000/api/docs` — `files`, `users`, `conversations` tags.
