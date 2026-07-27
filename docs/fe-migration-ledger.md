# FE Migration Ledger — trạng thái

Sổ cái theo dõi việc di trú FE sang kiến trúc microservices-ready
(`src/features/<domain>/` mirror 1:1 package BE). Luật ở `CLAUDE.md`, thứ tự task ở
`docs/prompts/wbs-theo-giai-doan.md`.

**Cập nhật sổ này ở bước `d` / `cd` của mỗi domain.** Một domain chỉ "xong" khi mọi
endpoint BE có hàm API tương ứng **và** ít nhất một surface UI tiêu thụ nó.

Trạng thái: `not started` · `in progress` · `done` · `n/a`

## File nào đọc lúc nào

File này là **thứ duy nhất đọc ở đầu mọi phiên**. Phần còn lại đọc theo nhu cầu — sổ cái được
tách ra chính vì đọc trọn gói tốn context mà phần lớn không dùng tới.

| file                                                           | đọc khi nào                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **file này** (bảng tiến độ + bản đồ route)                     | **luôn luôn**, đầu phiên                                               |
| [`ledger/findings/<domain>.md`](ledger/findings/)              | **trước khi làm domain đó** — nợ kỹ thuật, cạm bẫy, quyết định đã chốt |
| [`ledger/ds-deviations.md`](ledger/ds-deviations.md)           | khi dựng UI từ Design System                                           |
| [`ledger/legacy-inventory.md`](ledger/legacy-inventory.md)     | ở bước `d` (xoá legacy)                                                |
| [`ledger/checkpoint-log.md`](ledger/checkpoint-log.md)         | **hiếm khi** — append-only, chỉ để truy lại lịch sử                    |
| [`ledger/schema-drift.md`](ledger/schema-drift.md)             | chỉ khi drift check ra diff khác rỗng                                  |
| [`prompts/session-constants.md`](prompts/session-constants.md) | đầu phiên, thay cho việc dán lại vào prompt                            |

Domain đã có file findings: `posts` · `newsfeed` · `security` · `friendships` · `reputation` · `notifications` · `chat` · `search` · `shared`
(hạ tầng, không thuộc domain nào). Domain mới thì tạo file mới khi có phát hiện đầu tiên.

---

## 1. Ledger — tiến độ di trú

Các cột theo dõi việc chuyển vào `src/features/`. Chưa có gì trong `features/` nên
tất cả đang là `not started` — **không** có nghĩa là FE chưa viết gì (xem mục 3).

| domain        | BE package                    | #ep | boundary note                                                                                                                                                                                                                                                                                                     | types            | api              | store/hooks      | UI                                                         | wired                       | legacy removed                                                                                                         | verified    |
| ------------- | ----------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------- | ---------------- | ---------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| posts         | `com.socialapp.posts`         | 22  | `EventController` (`/events`) nằm trong package `posts` — mirror theo package, không tách `features/events/`. `acceptAnswer` nằm ở `PostController` chứ không phải `CommentController` → thuộc chu kỳ 1                                                                                                           | **done (22/22)** | **done (22/22)** | **done (22/22)** | **done (composer 8/8 loại + toàn bộ mặt đọc + RSVP/lịch)** | **done** (`/newsfeed`)      | **done** (bookstore giữ cầu tạm → P2.10)                                                                               | **done**    |
| security      | `com.socialapp.security`      | 17  | `/profile/professional` (GET+PUT) **không** thuộc security — `ProfessionalProfileController` nằm trong package `knowledge`. Lọc path `/v1/api/profile*` sẽ ra 19, đúng là 17.                                                                                                                                     | done (17/17)     | done (17/17)     | done (17/17)     | done (all surfaces)                                        | done                        | 1+2+3 (shell còn dùng useProfile+role → P3.4)                                                                          | done        |
| bookstore     | `com.socialapp.bookstore`     | 11  | `PaymentController` (`/payments`) nằm trong `bookstore`; route `/payment/success` đứng riêng                                                                                                                                                                                                                      | not started      | not started      | not started      | not started                                                | not started                 | not started                                                                                                            | not started |
| knowledge     | `com.socialapp.knowledge`     | 10  | `PersonalAccessTokenController` (`/tokens`) và `ProfessionalProfileController` (`/profile/professional`) nằm trong `knowledge` dù path trông như security                                                                                                                                                         | not started      | not started      | not started      | not started                                                | not started                 | not started                                                                                                            | not started |
| friendships   | `com.socialapp.friendships`   | 8   |                                                                                                                                                                                                                                                                                                                   | done (8/8)       | done (8/8)       | done (8/8)       | done (3 màn)                                               | done                        | done (phần của 4 route; `/chats` đóng ở P2.7d — sidebar chat gọi `useFriends` qua barrel; dashboard/shell → P3.3/P3.4) | done        |
| roadmap       | `com.socialapp.roadmap`       | 8   |                                                                                                                                                                                                                                                                                                                   | not started      | not started      | not started      | not started                                                | not started                 | not started                                                                                                            | not started |
| notifications | `com.socialapp.notifications` | 6   | BE **không có realtime nào** (không WebSocket, không SSE) → badge chưa đọc chỉ poll 30s được. Xem `findings/notifications.md`                                                                                                                                                                                     | done (6/6)       | done (6/6)       | done (6/6)       | done (list + panel tuỳ chọn)                               | done (`/notifications`)     | done                                                                                                                   | done        |
| github        | `com.socialapp.github`        | 5   |                                                                                                                                                                                                                                                                                                                   | not started      | not started      | not started      | not started                                                | not started                 | not started                                                                                                            | not started |
| matchmaking   | `com.socialapp.matchmaking`   | 5   |                                                                                                                                                                                                                                                                                                                   | not started      | not started      | not started      | not started                                                | not started                 | not started                                                                                                            | not started |
| moderation    | `com.socialapp.moderation`    | 4   |                                                                                                                                                                                                                                                                                                                   | not started      | not started      | not started      | not started                                                | not started                 | not started                                                                                                            | not started |
| chat          | `com.socialapp.chat`          | 1   | BE cấp token **Stream Chat**; FE Twilio cũ chết ở P2.7d. BE đã sửa xong R1–R5 (2026-07-27). **R8 đã sửa+verify**: BE upsert cả bạn bè khi cấp token → nhắn được bạn chưa từng mở chat; người ngoài danh sách bạn vẫn lỗi (đúng mong đợi, (i) không phải gác quyền). Vượt trần UI → tách **P2.7a / c-1 / c-2 / d** | done (1/1)       | done (1/1)       | done (1/1)       | **done** (màn `/chats` + cửa sổ nổi app shell)             | **done** (`/chats` + shell) | **done** (Twilio: 6 component + `lib/twilio/` + route handler + 2 dep)                                                 | **done**    |
| newsfeed      | `com.socialapp.newsfeed`      | 1   | 1 endpoint nhưng là **surface đọc lớn nhất app** — tier C nói nhịp checkpoint, không nói khối lượng                                                                                                                                                                                                               | done (1/1)       | done (1/1)       | done (1/1)       | done (feed + adapter card)                                 | done (`/newsfeed`)          | done (bookstore giữ cầu tạm → P2.10)                                                                                   | done        |
| reputation    | `com.socialapp.reputation`    | 1   |                                                                                                                                                                                                                                                                                                                   | done (1/1)       | done (1/1)       | done (1/1)       | done (card + chip)                                         | done                        | n/a (chưa từng có code legacy)                                                                                         | done        |
| search        | `com.socialapp.search`        | 1   | 1 endpoint trả **hai** danh sách (người + bài). Sách **không** là danh sách thứ ba — sách khớp nổi lên dưới dạng bài gắn nó. Không cursor/không xếp hạng: `unaccent LIKE` trên 3 bảng Postgres. Xem `findings/search.md`                                                                                          | done (1/1)       | done (1/1)       | done (1/1)       | done (`/search` + ô tìm kiếm của shell)                    | done (`/search` + shell)    | done (`components/search/`, `lib/api/search.ts`, `lib/hooks/use-search.ts`, 4 type)                                    | done        |
| trending      | `com.socialapp.trending`      | 1   |                                                                                                                                                                                                                                                                                                                   | not started      | not started      | not started      | not started                                                | not started                 | not started                                                                                                            | not started |

Σ 15 domain · 101 endpoint. `cloud` và `common` không có REST controller → không thành
FE feature.

**Mục tiêu thật là 99, không phải 101:** 2 endpoint không dành cho FE gọi
(`POST /v1/api/payments/momo/webhook` — MoMo gọi server-to-server;
`GET /v1/api/events/google/callback` — Google redirect thẳng về BE). Xem P4.7.

### DS deviation

Đã tách ra [`ledger/ds-deviations.md`](ledger/ds-deviations.md) (13 dòng).

---

## 2. Bản đồ route → domain (P0.4)

22 page (21 từ P0.4 + `/notifications` thêm ở P2.6cd) + 4 layout. Route handler `/api/twilio/token` **đã xoá ở P2.7d** — `src/app/api/` không còn tồn tại. Bảng dưới
suy ra từ **đồ thị import thật**, không
đoán theo tên thư mục: barrel `@/lib/hooks` và `@/lib/api` re-export cả 14 domain nên
nếu đi theo import thô thì trang nào cũng "chạm" mọi domain — phải resolve từng symbol
qua barrel về đúng file định nghĩa mới ra được bảng này.

**Domain chủ** sở hữu shell + layout của trang. Domain góp mặt chỉ export component qua
`index.ts` của mình, không domain nào import internals của domain khác (CLAUDE.md §4).

| route                   | file                                      | domain chủ    | domain góp mặt             | ghi chú                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------------- | ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                     | `app/page.tsx`                            | —             | —                          | chỉ `redirect('/newsfeed')`                                                                                                                                                                                                                      |
| `/login`                | `app/(auth)/login/page.tsx`               | security      | —                          |                                                                                                                                                                                                                                                  |
| `/register`             | `app/(auth)/register/page.tsx`            | security      | —                          |                                                                                                                                                                                                                                                  |
| `/forgot-password`      | `app/(auth)/forgot-password/page.tsx`     | security      | —                          |                                                                                                                                                                                                                                                  |
| `/reset-password`       | `app/(auth)/reset-password/page.tsx`      | security      | —                          |                                                                                                                                                                                                                                                  |
| `/verify-email`         | `app/(auth)/verify-email/page.tsx`        | security      | —                          |                                                                                                                                                                                                                                                  |
| `/magic-link`           | `app/(auth)/magic-link/page.tsx`          | security      | —                          |                                                                                                                                                                                                                                                  |
| `/magic-login`          | `app/(auth)/magic-login/page.tsx`         | security      | —                          |                                                                                                                                                                                                                                                  |
| `/newsfeed`             | `app/(main)/newsfeed/page.tsx`            | **newsfeed**  | posts, bookstore, security | **span 4 domain** — P3.1. posts + newsfeed đều đã sang `features/`. Legacy còn lại đúng **một** thứ: cầu tạm bookstore `book-post-actions.tsx`, page truyền vào qua render prop (→ P2.10)                                                        |
| `/dashboard`            | `app/(main)/dashboard/page.tsx`           | **security**  | friendships                | **span 3** — P3.3. Xem quyết định bên dưới                                                                                                                                                                                                       |
| `/profile`              | `app/(main)/profile/page.tsx`             | security      | —                          | P3.2 sẽ thêm knowledge, roadmap, github, reputation                                                                                                                                                                                              |
| `/friends`              | `app/(main)/friends/page.tsx`             | —             | —                          | chỉ `redirect('/friends/all')`                                                                                                                                                                                                                   |
| `/friends/all`          | `app/(main)/friends/all/page.tsx`         | friendships   | —                          |                                                                                                                                                                                                                                                  |
| `/friends/requests`     | `app/(main)/friends/requests/page.tsx`    | friendships   | —                          |                                                                                                                                                                                                                                                  |
| `/friends/suggestions`  | `app/(main)/friends/suggestions/page.tsx` | friendships   | —                          |                                                                                                                                                                                                                                                  |
| `/chats`                | `app/(main)/chats/page.tsx`               | **chat**      | friendships                | **span 2 sau P2.7d** — trang chỉ còn `ChatMessenger` + state URL; phần security (tên/avatar mình) không cần nữa vì Stream mang sẵn thành viên channel. friendships vào qua barrel trong `ConversationSidebar`                                    |
| `/search`               | `app/(main)/search/page.tsx`              | search        | reputation                 | **P2.8**: page chỉ giữ `?q=`, `SearchResults` lo phần còn lại. `RepScore` vào qua barrel `features/reputation` (`eliteScore` nằm sẵn trong payload). Kết quả **không bấm được** — BE không có profile công khai, app không có route chi tiết bài |
| `/trending`             | `app/(main)/trending/page.tsx`            | trending      | —                          |                                                                                                                                                                                                                                                  |
| `/notifications`        | `app/(main)/notifications/page.tsx`       | notifications | —                          | **route mới ở P2.6cd** — domain có 6/6 endpoint nhưng 0 UI nên không có trang nào để rewire. Chuông + badge trên topbar vẫn thuộc app shell → P3.4                                                                                               |
| `/admin/moderation`     | `app/(admin)/admin/moderation/page.tsx`   | moderation    | —                          |                                                                                                                                                                                                                                                  |
| `/payment/success`      | `app/payment/success/page.tsx`            | bookstore     | —                          |                                                                                                                                                                                                                                                  |
| ~~`/api/twilio/token`~~ | ~~`app/api/twilio/token/route.ts`~~       | chat          | —                          | **ĐÃ XOÁ ở P2.7d.** Là một backend nằm trong Next.js (tự ký JWT bằng secret Twilio) — trái mục tiêu microservices-ready; BE cấp token Stream thay nó. `src/app/api/` giờ không còn thư mục                                                       |

| layout                   | domain chủ         | ghi chú                                                                                                    |
| ------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `app/layout.tsx`         | —                  | providers, theme                                                                                           |
| `app/(auth)/layout.tsx`  | —                  | thuần trình bày                                                                                            |
| `app/(main)/layout.tsx`  | shared (app shell) | chat đã sang `features/chat` (`ChatClientProvider` + `ChatDock`, P2.7d); còn friendships + security → P3.4 |
| `app/(admin)/layout.tsx` | security           | chỉ chặn quyền admin                                                                                       |

**2 trang span nhiều domain còn phải chờ** — không xoá legacy sớm được, phải giữ phần của
domain chưa migrate: `/newsfeed` (4), `/dashboard` (3). `/chats` **đã đóng ở P2.7d**.

### Quyết định: domain chủ của `/dashboard`

WBS để ngỏ "quyết ở P0.4". Trang hiện gồm lời chào + identity (security), thẻ số bạn bè /
gợi ý / lời mời (friendships), và 2 thẻ follower/following gọi vào API không tồn tại.

**Chọn `security`.** Trang là "home của tài khoản đang đăng nhập" — shell và identity
thuộc security, friendships chỉ góp widget qua `index.ts`. Đã cân nhắc cho friendships
sở hữu vì phần lớn widget là bạn bè, nhưng như vậy shell sẽ phải import identity từ
security ngược lại, đúng kiểu phụ thuộc hai chiều mà §4 cấm.

---

---

## 3. Legacy · nhật ký · drift · phát hiện

Đã tách ra, xem bảng "File nào đọc lúc nào" ở đầu file.
