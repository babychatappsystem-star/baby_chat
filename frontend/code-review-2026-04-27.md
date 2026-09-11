# Code Review Report — message_app/message

**Ngày review:** 2026-04-27
**Phạm vi:** Bugs & logic, Type safety & TS conventions, Architecture & state, UI/UX & accessibility
**Branch:** `main` — sau commit `a2ae90a` ("add message")

Dự án ở giai đoạn prototype: 5 commits, mới tích hợp API caller + UI Messages, có CLAUDE.md quy định strict TypeScript nhưng codebase hiện tại lệch nhiều so với chuẩn này.

---

## Tổng quan dự án

| Hạng mục | Giá trị |
|---|---|
| Stack | React 19.1, TypeScript 5.8 (strict), Vite 7, Tailwind 4.1, React Router 6.30, Axios 1.12 |
| Pages | 6 ([Messages](pages/Messages.tsx), [Login](pages/Login.tsx), [SignUp](pages/SignUp.tsx), [Home](pages/Home.tsx), [About](pages/About.tsx), [Service](pages/Service.tsx)) |
| Components | Layout (Header/Footer/Sidebar), common (Button/Input/Label) |
| State | Local `useState` only — không có Context/Redux/Zustand |
| Auth | JWT trong `localStorage`, response interceptor 401 → `/login` |
| Tests | **Không có** |

---

## 1. CRITICAL BUGS (logic errors, fix ngay)

### 1.1 [Messages.tsx:76-82](pages/Messages.tsx#L76-L82) — `messagesData` được tạo nhưng không bao giờ set vào state
```tsx
const messagesData: IMessage[] = lastPageMessages.map(...);
// thiếu setMessages(messagesData)
```
**Hệ quả:** Khi chọn conversation, messages array không bao giờ được fill ⇒ chat window luôn trống.

### 1.2 [Messages.tsx:69-71](pages/Messages.tsx#L69-L71) — `if(pages.length == 0)` không return
```tsx
if(pages.length == 0){ setMessages([]); }
// code dưới vẫn chạy → crash khi pages rỗng
const lastPage = pages[pages.length - 1]; // undefined
const lastPageMessages = lastPage.messages; // TypeError
```
**Fix:** Thêm `return` sau `setMessages([])`.

### 1.3 [Messages.tsx:88](pages/Messages.tsx#L88) — `e: Event` sai kiểu cho form submit
```tsx
const handleSendMessage = async (e: Event) => {
```
Trong React, form submit handler phải là `React.FormEvent<HTMLFormElement>`. `Event` là DOM type, không có đầy đủ React synthetic event semantics.

### 1.4 [Messages.tsx:91](pages/Messages.tsx#L91) — Optimistic update không rollback khi API fail
```tsx
setMessages([...prev, newMsg]);            // optimistic add
const data = await apiClient.post(...);    // có thể throw
if(!data){ console.error(...) }            // chỉ log, không xóa msg
```
Nếu request fail, message ảo vẫn nằm lại UI. Cũng thiếu try/catch quanh `apiClient.post`.

### 1.5 [Messages.tsx:28](pages/Messages.tsx#L28) — `useState` init từ `conversations[0]` lúc mount
```tsx
useState<IConversation | null>(conversations[0]);
// conversations chưa fetch → conversations[0] = undefined → state = undefined (không phải null)
```
Type khai báo là `IConversation | null` nhưng giá trị init thực tế có thể là `undefined`. Nên init bằng `null`.

### 1.6 [Messages.tsx:91](pages/Messages.tsx#L91) — `id: prevMessages.length + 1` xung đột với `id: number` từ server
Sau khi server trả về với `_id` (string MongoDB) nhưng optimistic ID là số tăng dần ⇒ duplicate keys, type không nhất quán (interface yêu cầu `number` nhưng API trả MongoDB ObjectId).

### 1.7 [environmentLoader.ts:9](src/config/environmentLoader.ts#L9) — Đọc `VITE_NODE_ENV` không tồn tại
File [.env](.env) chỉ có `VITE_DEV_API_URL` và `REACT_APP_API_KEY`. `VITE_NODE_ENV` undefined ⇒ luôn fallback `development`. Không phải bug nghiêm trọng nếu chỉ chạy dev, nhưng staging/production sẽ không hoạt động.
Nên dùng `import.meta.env.MODE` (Vite chuẩn) thay vì biến custom.

### 1.8 [.env](.env) — Biến `REACT_APP_API_KEY` không được dùng
Biến với prefix `REACT_APP_` chỉ hợp lệ với Create React App, KHÔNG được Vite expose. Nên xoá hoặc đổi sang `VITE_*`.

---

## 2. TYPE SAFETY & TS CONVENTIONS (vi phạm CLAUDE.md)

CLAUDE.md cấm `any`, yêu cầu interfaces cho mọi API response, explicit return types. Hiện trạng:

### 2.1 Sử dụng `any` (4 vị trí)
| Vị trí | Code |
|---|---|
| [Messages.tsx:37](pages/Messages.tsx#L37) | `response.data.map((conv: any) => ...)` |
| [Messages.tsx:76](pages/Messages.tsx#L76) | `lastPageMessages.map((message: any) => ...)` |
| [environmentLoader.ts:2](src/config/environmentLoader.ts#L2) | `private static loadedConfig: any = null` |

**Khuyến nghị:** Tạo `src/types/api.types.ts` định nghĩa `ConversationDTO`, `MessageDTO`, `PageDTO`, `EnvConfig`, dùng generic cho axios: `apiClient.get<ConversationDTO[]>(...)`.

### 2.2 Type annotations dài dòng, dư thừa
[Messages.tsx:27-30](pages/Messages.tsx#L27-L30) — viết `[T[] | [], React.Dispatch<React.SetStateAction<T[] | []>>]` cho mọi useState là không cần thiết. TS tự suy luận. Cũng `T[] | []` là tautology — `[]` đã thuộc `T[]`. Chỉ cần:
```tsx
const [conversations, setConversations] = useState<IConversation[]>([]);
```

### 2.3 Interface props rỗng, không dùng
[Messages.tsx:21-24](pages/Messages.tsx#L21-L24) — `interface Props { userId?: number }` được khai báo nhưng `MessagesPage` destructure không có prop nào. Xoá hoặc xoá luôn `<Props>`.

### 2.4 Naming convention lệch
CLAUDE.md: "PascalCase với descriptive name (e.g. `UserProfileProps`)". Hiện dùng `IConversation`, `IMessage` (Hungarian-style I-prefix). Không sai cú pháp nhưng không khớp convention dự án — nên thống nhất 1 trong 2.

### 2.5 Thiếu explicit return types
- Tất cả pages dùng `React.FC` (CLAUDE.md khuyến cáo "use React.FC sparingly — prefer explicit return types").
- [Button.tsx](components/common/Button.tsx), [Input.tsx](components/common/Input.tsx) cũng vậy.

### 2.6 Path alias không cấu hình
`tsconfig.app.json` không có `paths`. Hiện tại import phải dùng `../src/api/apiClient` từ pages — fragile. Nên thêm alias `@/` → `src/`.

---

## 3. ARCHITECTURE & STATE MANAGEMENT

### 3.1 Không có route guard / auth context
[App.tsx:55-72](src/App.tsx#L55-L72) — `/messages` và `/dashboard` không kiểm tra auth. User chưa login vẫn vào được, chỉ bị 401 redirect khi gọi API. Khuyến nghị: tạo `<ProtectedRoute>` wrapper hoặc `AuthContext`.

### 3.2 Folder `src/contexts/` rỗng
Thư mục có sẵn nhưng không file nào. Hoặc dùng nó cho AuthContext/ThemeContext, hoặc xóa.

### 3.3 Theme state phân tán
Theme đọc/ghi `localStorage` ở [main.tsx](src/main.tsx) và Header. Logic lặp lại, không single source of truth. Nên đưa vào `ThemeContext` + custom hook `useTheme()`.

### 3.4 Inconsistent folder structure vs CLAUDE.md
CLAUDE.md mô tả `src/components/`, `src/pages/`, `src/hooks/`. Thực tế: `components/`, `pages/`, `hooks/` đặt **ngoài** `src/`. App vẫn chạy nhưng:
- Lệch khỏi convention chính dự án quy định
- Tạo import path xấu (`../../src/api/...`)
- Không tận dụng được path alias gọn

### 3.5 API service layer mỏng
Mọi component tự gọi `apiClient.get/post`. CLAUDE.md mục "API Integration" yêu cầu "typed service layers". Nên tách: `src/services/conversationService.ts` chứa `getConversations()`, `getMessages(id)`, `sendMessage(...)` — typed, reusable, dễ mock test.

### 3.6 Token storage trong `localStorage`
[apiClient.ts:17](src/api/apiClient.ts#L17) — JWT trong `localStorage` dễ bị XSS đánh cắp. Đối với app production, cân nhắc httpOnly cookie. Đây là decision-level concern, không bắt buộc fix ngay nhưng cần đánh giá.

### 3.7 Thiếu refresh token flow
Có lưu `refresh_token` trong localStorage nhưng [apiClient.ts:32-36](src/api/apiClient.ts#L32-L36) khi gặp 401 chỉ xóa token và redirect — không thử refresh. UX bị logout đột ngột.

---

## 4. UI/UX & ACCESSIBILITY

### 4.1 Dark mode không nhất quán trong Messages
[Messages.tsx:107-191](pages/Messages.tsx#L107-L191) — nhiều element hardcode `bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-600` không có biến thể `dark:`. Khi bật dark mode, conversation list và message bubble vẫn sáng:
- Line 107: `border-gray-200` không có `dark:border-gray-700`
- Line 122: `bg-gray-100` / `bg-gray-200` không có dark variant
- Line 162: chỉ message area có `dark:bg-surface`, các nơi khác thiếu
- Line 175: `bg-white` input bar không dark variant
- Line 165: `bg-white` cho message bubble của người khác

### 4.2 Accessibility issues
- [Messages.tsx:111](pages/Messages.tsx#L111) — input search không có `aria-label` hay `<label>` ẩn.
- [Messages.tsx:155-157](pages/Messages.tsx#L155-L157) — icon Phone/Video/MoreVertical là `<svg>` không phải `<button>`, không keyboard-focusable, không có `aria-label`.
- [Messages.tsx:177-178](pages/Messages.tsx#L177-L178) — Paperclip/Smile cũng vậy.
- Avatar `<img>`: alt là `convo.name` ổn, nhưng nếu name là tiếng Việt unicode cần test screen reader.
- Color contrast: `text-blue-100` trên `bg-primary-500` (line 167) có thể fail WCAG AA contrast — cần kiểm tra.

### 4.3 Form không xử lý loading/disabled state
[Messages.tsx:176-189](pages/Messages.tsx#L176-L189) — submit button không disable khi đang gửi, không loading indicator. User có thể spam click → duplicate messages.

### 4.4 Search input không hoạt động
[Messages.tsx:112-116](pages/Messages.tsx#L112-L116) — input "Search messages" không có `value`/`onChange` handler. Pure decoration.

### 4.5 Empty states thiếu
- Khi `conversations.length === 0` chưa load xong: hiển thị blank, không có skeleton/spinner.
- Khi messages rỗng: chat area trống, không có gợi ý "Start the conversation".
- Khi `selectedConversation === null`: header hiển thị `''` cho tên/avatar — kém thẩm mỹ.

### 4.6 Color hardcode lệch design system
[Messages.tsx:134](pages/Messages.tsx#L134) — unread badge `bg-blue-500`, không khớp với hệ primary (pink/rose) định nghĩa trong tailwind config. Inconsistent với phần còn lại đã đổi sang `primary-500`.

### 4.7 Layout fixed height có thể cắt content
[Messages.tsx:105](pages/Messages.tsx#L105) — `h-[calc(100vh-8rem)]` giả định header là 8rem. Nếu Layout đổi padding, chat sẽ overflow hoặc thừa. Nên dùng flex layout thay vì calc cứng.

---

## 5. CÁC ĐIỂM TÍCH CỰC

Để cân bằng, dự án đang làm tốt những điểm sau:
- TypeScript strict mode bật đầy đủ trong [tsconfig.app.json](tsconfig.app.json).
- Axios interceptor chuẩn pattern (auth + 401 handling).
- Tailwind v4 + CSS variables cho theme — kiến trúc tốt cho dark mode.
- Layout component có props (`showHeader`, `showFooter`, `showSidebar`) dùng lại được.
- ESLint config với `react-hooks` plugin.
- Form validation client-side trong [SignUp.tsx](pages/SignUp.tsx).
- `useToast` hook tách logic notification gọn gàng.

---

## 6. ĐỀ XUẤT THỨ TỰ KHẮC PHỤC

Khi sẵn sàng fix, thứ tự nên như sau:

| # | Hạng mục | Mức độ | File chính |
|---|---|---|---|
| 1 | Thêm `setMessages(messagesData)` + `return` sau `setMessages([])` | Critical bug | [Messages.tsx:69-82](pages/Messages.tsx#L69-L82) |
| 2 | Sửa `e: Event` → `React.FormEvent<HTMLFormElement>` + try/catch khi gửi | Critical | [Messages.tsx:88-98](pages/Messages.tsx#L88-L98) |
| 3 | Tạo types `ConversationDTO`, `MessageDTO` + xóa `any` | Convention | new `src/types/api.types.ts` |
| 4 | Tách service layer `conversationService.ts` | Architecture | new `src/services/` |
| 5 | Thêm `AuthContext` + `<ProtectedRoute>` | Architecture | new `src/contexts/AuthContext.tsx`, sửa [App.tsx](src/App.tsx) |
| 6 | Sửa `environmentLoader` dùng `import.meta.env.MODE` | Bug | [environmentLoader.ts](src/config/environmentLoader.ts) |
| 7 | Thêm dark mode classes cho [Messages.tsx](pages/Messages.tsx) | UX | toàn bộ JSX phần Messages |
| 8 | Refactor icon thành `<button aria-label>` | A11y | [Messages.tsx:155-178](pages/Messages.tsx#L155-L178) |
| 9 | Thêm loading state + disable button khi submit | UX | [Messages.tsx:176-189](pages/Messages.tsx#L176-L189) |
| 10 | Path alias `@/` trong tsconfig + vite | Convention | [tsconfig.app.json](tsconfig.app.json), [vite.config.ts](vite.config.ts) |

---

## 7. Verification (cách kiểm chứng các phát hiện trên)

1. **Bug 1.1, 1.2:** chạy `npm run dev`, mở `/messages`, click một conversation → sẽ thấy chat trống dù backend trả messages. Mở Network tab, response của `/conversations/:id/pages` có data nhưng UI không render.
2. **Bug 1.7, 1.8:** chạy `npm run build` rồi inspect bundle — `VITE_NODE_ENV` và `REACT_APP_API_KEY` sẽ undefined. Dùng `console.log(import.meta.env)` trong code dev để confirm.
3. **A11y 4.2:** mở DevTools Lighthouse → tab Accessibility, sẽ flag missing labels và non-button interactive elements.
4. **Dark mode 4.1:** vào `/messages`, toggle dark mode từ Header → conversation list vẫn nền trắng/sáng.
5. **Type checking:** chạy `npx tsc --noEmit` — hiện tại pass nhưng vì `any` che đậy. Sau khi xóa `any` sẽ lộ ra các điểm cần fix.
