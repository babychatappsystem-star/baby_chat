---
title: BabyChat Product Brief
status: draft
created: 2026-09-06
updated: 2026-09-07
---

# BabyChat Product Brief

## 1. Core Purpose

BabyChat là một ứng dụng nhắn tin **Web-first** được xây dựng như một side project học thuật. Mục đích chính là học sâu và thực hành các kỹ thuật: **Clean Architecture / Design Patterns**, **WebSockets**, và **Event-Driven Architecture**.

Sản phẩm phục vụ nhóm người dùng hẹp: tác giả và bạn bè. Scope giữ nhỏ để có thể hoàn thành, nhưng kiến trúc được xây dựng đúng chuẩn từ đầu.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + TypeScript + Vite + Ant Design |
| **Backend** | NestJS 11 + TypeScript 5.7 |
| **Database** | MongoDB (Mongoose 8) |
| **Auth** | Passport.js (JWT + Local), bcrypt |
| **Realtime** | Socket.IO 4.x (`@nestjs/websockets`) |
| **Architecture** | Clean Architecture + Domain Events + Bridge Pattern |

## 3. Features hiện có (đã implement)

- **Auth:** Đăng ký, đăng nhập, JWT, refresh token, token blacklist, logout
- **User:** Quản lý tài khoản, upload avatar, friend code
- **Social:** Kết bạn (gửi/chấp nhận/từ chối/hủy/block), thông báo realtime
- **Chat 1-1 (Direct):** Tạo conversation khi chấp nhận kết bạn, gửi tin nhắn realtime
- **Realtime infrastructure:** Socket.IO + Bridge Pattern + Domain Events
- **File upload:** Upload avatar user và avatar conversation
- **Pagination:** Tin nhắn lưu theo Page (100 tin/page)

## 4. Features tiếp theo (Group Chat)

**Mục tiêu:** Hoàn thiện tính năng chat nhóm.

**Yêu cầu nghiệp vụ:**
- Bất kỳ user nào cũng có thể tạo nhóm
- Mọi thành viên đều có thể thêm người mới, nhưng phải được **Admin duyệt**
- Tính năng cơ bản của nhóm: tên nhóm, avatar nhóm, phân quyền (Admin/Member/Moderator), kick thành viên

> **Lưu ý kỹ thuật:** Domain Entity `ConversationEntity` đã hỗ trợ `type: 'group'` và `ParticipantRole: 'admin' | 'member' | 'moderator'`. Cần implement thêm các Use Cases và APIs còn thiếu.

## 5. Learning Goals

1. **Clean Architecture:** Ranh giới rõ ràng giữa Domain / Application / Infrastructure / Interfaces
2. **Domain Events:** Pattern `Use Case → DomainEvent → EventBus → Bridge → WebSocket`
3. **WebSockets:** Quản lý rooms, authentication, stateless gateway
4. **Design Patterns:** Bridge Pattern, Repository Pattern, Factory Method

## 6. Constraints

- Scope nhỏ: dùng nội bộ (tác giả + bạn bè), không cần scale lớn ở giai đoạn này
- Giữ nguyên codebase hiện có, tiếp tục phát triển (không refactor lại từ đầu)
- Ưu tiên hệ thống hóa tài liệu kiến trúc trước khi phát triển tính năng mới
