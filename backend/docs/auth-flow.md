# Auth Flow — Tài liệu Backend

Tài liệu mô tả toàn bộ luồng xác thực của BabyChat: đăng ký, đăng nhập, refresh token, đăng xuất, và cơ chế bảo vệ route.

- **Base URL:** `http://localhost:3000`
- **Swagger UI:** `http://localhost:3000/api/docs`
- **Mọi route được bảo vệ** đều cần header: `Authorization: Bearer <access_token>`

---

## 1. Cơ chế Token

BabyChat dùng cặp **Access Token + Refresh Token**:

| Token | Định dạng | TTL mặc định | Lưu ở đâu |
|---|---|---|---|
| **Access Token** | JWT (HS256, signed bởi `JWT_SECRET`) | `JWT_ACCESS_TOKEN_EXPIRES` (default: `1d`) | Client (memory/localStorage) |
| **Refresh Token** | `<userId>.<random64bytes>` (base64url) | `JWT_REFRESH_TOKEN_EXPIRES` (default: `7d`) | DB (`refresh_tokens` collection, lưu **SHA-256 hash**, không phải plaintext) |

### JWT Payload
```json
{
  "sub": "<userId>",
  "email": "user@example.com",
  "username": "johndoe",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Token Blacklist (Access Token)
Khi user logout, access token được đưa vào **in-memory blacklist** (`TokenBlacklistService`) cho đến khi hết hạn. WS middleware và REST guard đều check blacklist này.

> **Hạn chế đã biết:** Blacklist lưu in-memory → mất khi restart server. Sẽ migrate sang Redis khi cần.

---

## 2. Sơ đồ luồng

### 2.1 Đăng ký
```
Client                          Server
  │  POST /auth/register         │
  │  { email, password, username }
  │ ─────────────────────────────►│
  │                               │── validate (class-validator)
  │                               │── check email unique
  │                               │── hash password (bcrypt 10 rounds)
  │                               │── save User to DB
  │                               │── issue access_token + refresh_token
  │                               │── save refresh_token hash to DB
  │  201 { access_token,          │
  │        refresh_token,         │
  │        expires_in/at, user }  │
  │ ◄─────────────────────────────│
```

### 2.2 Đăng nhập
```
Client                          Server
  │  POST /auth/login             │
  │  { email, password }          │
  │ ─────────────────────────────►│
  │                               │── lookup User by email
  │                               │── bcrypt.compare(password, hash)
  │                               │── issue access_token + refresh_token
  │                               │── save refresh_token hash to DB
  │  200 { access_token,          │
  │        refresh_token, ... }   │
  │ ◄─────────────────────────────│
```

### 2.3 Refresh Token (token rotation)
```
Client                          Server
  │  POST /auth/refresh           │
  │  { refresh_token: "..." }     │
  │ ─────────────────────────────►│
  │                               │── parse userId từ token format
  │                               │── SHA-256 hash token
  │                               │── query DB: (userId, tokenHash, active)
  │                               │── verify not expired, not revoked
  │                               │── REVOKE token cũ (revokedAt = now)
  │                               │── issue cặp token MỚI
  │                               │── save new refresh_token hash
  │  200 { access_token,          │
  │        refresh_token, ... }   │
  │ ◄─────────────────────────────│
```
> **Token rotation:** mỗi lần refresh, token cũ bị revoke ngay. Client phải lưu token mới.

### 2.4 Đăng xuất
```
Client                          Server
  │  POST /auth/logout            │
  │  Authorization: Bearer <at>   │
  │  { refresh_token: "..." }     │
  │ ─────────────────────────────►│
  │                               │── decode access_token → get exp
  │                               │── add access_token to blacklist (TTL = exp)
  │                               │── SHA-256 hash refresh_token
  │                               │── set revokedAt on refresh_token in DB
  │  200 { message: "Logged out" }│
  │ ◄─────────────────────────────│
```

---

## 3. API Reference

### `POST /auth/register`

Tạo tài khoản mới và trả về cặp token.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!",
  "username": "johndoe"
}
```

**Response 201:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "64a1b2c3d4e5f6a7b8c9d0e1.abc123...",
  "access_token_expires_in": 86400,
  "access_token_expires_at": "2026-09-09T00:00:00.000Z",
  "refresh_token_expires_in": 604800,
  "refresh_token_expires_at": "2026-09-15T00:00:00.000Z",
  "user": {
    "id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Lỗi:**

| Status | Khi nào |
|---|---|
| 400 | Thiếu field, email sai format, password yếu |
| 409 | Email đã tồn tại |

---

### `POST /auth/login`

Đăng nhập bằng email + password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!"
}
```

**Response 200:** Giống `/auth/register`.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 401 | Sai email hoặc mật khẩu |

---

### `GET /auth/profile` *(JWT required)*

Lấy thông tin profile đầy đủ (bao gồm avatar URL).

**Response 200:**
```json
{
  "userId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "email": "user@example.com",
  "username": "johndoe",
  "avatarUrl": "/uploads/abc.webp",
  "thumbnailUrl": "/uploads/thumb_abc.webp",
  "roles": ["user"]
}
```

---

### `POST /auth/refresh`

Đổi refresh token lấy cặp token mới. Token cũ bị revoke sau call này.

**Request body:**
```json
{
  "refresh_token": "64a1b2c3d4e5f6a7b8c9d0e1.abc123..."
}
```

**Response 200:** Giống `/auth/register`.

**Lỗi:**

| Status | Khi nào |
|---|---|
| 401 | Token không tồn tại, đã revoke, hoặc đã hết hạn |

---

### `POST /auth/logout` *(JWT required)*

Đăng xuất: blacklist access token + revoke refresh token.

**Request body:**
```json
{
  "refresh_token": "64a1b2c3d4e5f6a7b8c9d0e1.abc123..."
}
```

**Response 200:**
```json
{
  "message": "Logged out successfully"
}
```

---

## 4. Bảo vệ Route

### REST
Tất cả route cần xác thực đều gắn `@UseGuards(JwtAuthGuard)`. Guard verify JWT qua Passport `JwtStrategy` và check blacklist. Token hợp lệ → inject `user` vào request; dùng `@CurrentUser('userId')` trong controller để lấy userId.

### WebSocket
Xem chi tiết trong [`socket-architecture.md`](socket-architecture.md) — section **Authentication flow**.
Token được verify tại handshake (không re-verify sau khi connect). Client gửi token qua `socket.auth.token`.

---

## 5. Biến môi trường

```bash
JWT_SECRET=<strong-secret>
JWT_ACCESS_TOKEN_EXPIRES=1d    # Format: Ns | Nm | Nh | Nd
JWT_REFRESH_TOKEN_EXPIRES=7d
```
