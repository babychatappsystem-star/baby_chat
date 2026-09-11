# BabyChat - CLAUDE.md

## Tổng quan dự án

BabyChat là một ứng dụng chat backend được xây dựng bằng NestJS. Hỗ trợ chat 1-1, nhóm, và kênh; quản lý tin nhắn theo trang (pagination); xác thực JWT.

## Tech Stack

- **Framework:** NestJS 11 + Express + TypeScript 5.7
- **Database:** MongoDB (Mongoose 8)
- **Auth:** Passport.js (JWT + Local strategies), bcrypt
- **Validation:** class-validator, class-transformer
- **Testing:** Jest + Supertest

## Lệnh thường dùng

```bash
npm run dev          # Khởi động dev với hot reload
npm run build        # Build production (output: dist/)
npm run start:prod   # Chạy bản production
npm test             # Chạy unit tests
npm run test:e2e     # Chạy end-to-end tests
npm run lint         # Lint và auto-fix
npm run format       # Format code với prettier
```

## Biến môi trường (.env)

```
MONGODB_URI=mongodb://127.0.0.1:27017/BabyChat
JWT_SECRET=<secret>
JWT_ACCESS_TOKEN_EXPIRES=1d
PORT=3000
```

## Cấu trúc dự án

```
src/
├── common/
│   ├── exceptions/        # BusinessException, ResourceNotFoundException, ValidationException
│   ├── filters/           # GlobalExceptionFilter
│   └── types/             # RequestWithUser
├── modules/
│   ├── auth/              # Đăng ký, đăng nhập, JWT, refresh token
│   ├── users/             # Quản lý tài khoản người dùng
│   ├── conversations/     # Cuộc hội thoại (direct/group/channel)
│   ├── message/           # Gửi và quản lý tin nhắn
│   ├── pages/             # Phân trang tin nhắn trong hội thoại
│   └── participants/      # Thành viên trong hội thoại
├── app.module.ts
└── main.ts
```

## Kiến trúc & Patterns

- **Module pattern:** Mỗi tính năng là một NestJS module độc lập
- **Service layer:** Business logic nằm trong service, không trong controller
- **DTO + Validation:** Mọi input đều được validate qua class-validator
- **Guard:** Route bảo vệ bằng `JwtAuthGuard` hoặc `AuthGuard`
- **Global exception filter:** Trả về lỗi nhất quán từ `GlobalExceptionFilter`
- **Pagination (Pages):** Tin nhắn được lưu theo Page (tối đa 50-100 tin/trang)

## Database Schema (MongoDB)

### users
| Field | Type | Ghi chú |
|-------|------|---------|
| username | string | required |
| email | string | required, unique |
| password | string | hashed bcrypt |
| displayName | string | optional |
| listChats | ObjectId[] | ref: Conversation |
| listGroups | ObjectId[] | ref: Conversation |

### conversations
| Field | Type | Ghi chú |
|-------|------|---------|
| type | enum | `direct` / `group` / `channel` |
| participants | Participant[] | role: admin/member/moderator |
| pages | PageInfo | danh sách trang tin nhắn |
| createdBy | ObjectId | ref: User |

### pages
| Field | Type | Ghi chú |
|-------|------|---------|
| conversationId | ObjectId | ref: Conversation |
| pageNumber | number | min: 1 |
| pageSize | number | default: 50, max: 100 |
| messageCount | number | số tin nhắn trong trang |
| messages | Message[] | mảng tin nhắn nhúng trực tiếp |

### Message (nhúng trong Page)
| Field | Type | Ghi chú |
|-------|------|---------|
| senderId | ObjectId | ref: User |
| content | string | nội dung tin nhắn |
| replyId | ObjectId | optional, cho reply/thread |

## API Endpoints

### Auth (`/auth`)
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập, trả về JWT
- `POST /auth/refresh` - Làm mới token
- `GET /auth/profile` - Thông tin user (JWT required)

### Conversations (`/conversations`, JWT required)
- `GET /conversations` - Danh sách hội thoại của user
- `POST /conversations` - Tạo hội thoại mới
- `POST /conversations/messages` - Gửi tin nhắn
- `GET /conversations/messages/:conversationId/:pageNum` - Lấy tin nhắn theo trang
- `GET /conversations/:id/pages/` - Danh sách trang của hội thoại

### Messages (`/messages`, JWT required)
- `POST /messages` - Gửi tin nhắn

## Những điểm còn thiếu / TODO

- Token blacklist cho logout chưa được implement (`auth.controller.ts:35`)
- Validation conversation và sender trong `message.service.ts` chưa hoàn chỉnh
- Roles/permissions chưa được implement đầy đủ (`auth.service.ts:42`)
- WebSocket / real-time chưa có

## Quy ước code

- Sử dụng TypeScript strict mode
- DTO đặt trong thư mục `dto/`, entity trong `entities/`
- Tên file: `kebab-case.ts`, tên class: `PascalCase`
- Mỗi module có file `.spec.ts` tương ứng cho unit test
- Passwords luôn hash bằng bcrypt (10 salt rounds) trước khi lưu
