# Plan: Fix #2 — content non-string gây 500

## Context

Code review ([docs/code-review-2026-06-20.md](code-review-2026-06-20.md) mục #2, CONFIRMED): image message với `content` không phải string gây **TypeError 500** thay vì 400 sạch.

**Cơ chế:**
- [create-message.dto.ts:9](../src/modules/message/interfaces/dto/create-message.dto.ts#L9): `@IsString()` trên `content` bị bọc trong `@ValidateIf((o) => o.type !== 'image')`. Khi `type==='image'`, `@IsString()` bị **skip** hoàn toàn.
- ValidationPipe không bật `transform` → `content: 12345` giữ nguyên number.
- [message.entity.ts:79](../src/modules/message/domain/message.entity.ts#L79): `props.content?.trim()` → `(12345).trim` is not a function → **unhandled TypeError → 500**.

**Kịch bản khai thác:**
```
POST /conversations/messages
{ type: "image", fileId: "<owned>", content: 12345 }   // content là number
```

## Quyết định thiết kế (đã chốt với user)

- **DTO:** `content` **luôn** validate `@IsString()`; chỉ `@IsOptional()` khi `type==='image'` (cho phép thiếu caption). Non-string luôn bị reject 400.
- **Entity:** thêm guard `typeof content !== 'string'` trong `MessageEntity.create` (defense-in-depth — không tin mỗi DTO).
- **KHÔNG** bật `transform: true` (tránh regression coercion toàn cục cho conversationId/ObjectId + các DTO khác).

## Thay đổi

### 1. DTO — content luôn là string, chỉ optional khi image
**File:** [src/modules/message/interfaces/dto/create-message.dto.ts:8-11](../src/modules/message/interfaces/dto/create-message.dto.ts#L8)

Hiện tại:
```ts
@ValidateIf((o) => o.type !== 'image')
@IsString()
content: string;
```
Đổi thành:
```ts
// @IsString luôn áp dụng (chặn non-string mọi type). Chỉ image mới cho phép thiếu content.
@ApiPropertyOptional({ ... })
@ValidateIf((o) => o.type === 'image')
@IsOptional()
@IsString()
content: string;
```

**Logic từng nhánh:**
- `type !== 'image'` (text): `@ValidateIf` điều kiện `type==='image'` → false → **cả `@IsOptional` + `@IsString` đều bị skip?**

  ⚠️ **Điểm rủi ro cần verify:** cách trên có thể làm text message KHÔNG còn validate `@IsString` (vì `@ValidateIf(type==='image')` skip mọi validator sau nó khi text). Đây chính là loại bug đã gặp ở fix #1 (ValidateIf skip cả nhánh).

**Cách đúng (tránh ValidateIf skip nhầm):** tách 2 mối quan tâm:
```ts
// content: luôn phải là string NẾU có mặt; text bắt buộc có, image optional.
@IsString()                                  // luôn chạy khi content có mặt
@ValidateIf((o) => o.type === 'image')       // chỉ với image...
@IsOptional()                                // ...mới cho phép undefined
content: string;
```
Nhưng thứ tự decorator + tương tác `@ValidateIf`/`@IsOptional` của class-validator tinh tế. **Phương án an toàn nhất, nhất quán với fix #1: dùng 1 custom validator** `@IsContentValidForType`:
- `type === 'image'`: content là `undefined`/`null`/`''` HOẶC string bất kỳ → OK; non-string (number/object) → fail.
- `type !== 'image'`: content phải là string non-empty (sau trim) → fail nếu thiếu / non-string / rỗng.

Đặt cạnh [file-id-rule.validator.ts](../src/modules/message/interfaces/dto/file-id-rule.validator.ts) (cùng thư mục dto), pattern giống hệt.

### 2. Entity guard — defense-in-depth
**File:** [src/modules/message/domain/message.entity.ts:59](../src/modules/message/domain/message.entity.ts#L59) (`create`)

Thêm guard đầu hàm, trước khi dùng `.trim()`:
```ts
if (props.content !== undefined && props.content !== null && typeof props.content !== 'string') {
  throw new Error('Message content must be a string');
}
```
- Chốt chặn thật: nếu use case được gọi từ chỗ khác (vd WS handler tương lai) với non-string → throw domain error rõ ràng thay vì TypeError khó debug.
- Giữ nguyên logic hiện có: image cho phép content rỗng, text bắt buộc non-empty. `content: props.content?.trim() ?? ''` vẫn đúng sau guard (đã chắc là string hoặc nullish).

## Files sửa (tóm tắt)

| File | Sửa gì |
|---|---|
| create-message.dto.ts | content luôn validate string; custom validator `@IsContentValidForType` |
| content-rule.validator.ts (mới) | Custom validator theo type (giống file-id-rule) |
| message.entity.ts | Guard `typeof content` trong create() |

## Reuse / lưu ý

- Pattern custom validator đã có sẵn: [file-id-rule.validator.ts](../src/modules/message/interfaces/dto/file-id-rule.validator.ts) — copy cấu trúc `registerDecorator`.
- **KHÔNG** đụng ValidationPipe (giữ `whitelist: true` từ fix #1, không thêm transform).

## Verification

Chạy test độc lập với DTO thật + ValidationPipe thật (như đã làm ở fix #1 — `npx ts-node` script tạm) TRƯỚC khi tin tưởng, vì `@ValidateIf` + `@IsOptional` tương tác dễ sai:

1. **Build:** `npm run build`.
2. **DTO validation (script ts-node tạm, xóa sau):**
   - `{ type:'image', fileId:v, content: 12345 }` → **REJECT 400** (content non-string). ← fix chính
   - `{ type:'image', fileId:v }` (thiếu content) → **PASS** (caption optional).
   - `{ type:'image', fileId:v, content: 'caption' }` → **PASS**.
   - `{ conversationId:v, content:'hi' }` (text) → **PASS**.
   - `{ conversationId:v, content: 999 }` (text non-string) → **REJECT 400**.
   - `{ conversationId:v }` (text thiếu content) → **REJECT 400** (text bắt buộc).
   - `{ conversationId:v, content:'' }` (text rỗng) → **REJECT 400** (non-empty).
3. **Entity guard:** unit-level — `MessageEntity.create({ senderId, content: 123 as any, type:'image', fileId })` → throw 'must be a string' (không TypeError).
4. **Regression:** text/image message hợp lệ vẫn gửi được (không phá fix #1).

## Out of scope

- #3 Multer thiếu `limits.fileSize` → DoS RAM (plan riêng).
