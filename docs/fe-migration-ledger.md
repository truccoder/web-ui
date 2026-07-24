# FE Migration Ledger

Sổ cái theo dõi việc di trú FE sang kiến trúc microservices-ready
(`src/features/<domain>/` mirror 1:1 package BE). Luật ở `CLAUDE.md`, thứ tự task ở
`docs/prompts/wbs-theo-giai-doan.md`.

**Cập nhật sổ này ở bước `d` / `cd` của mỗi domain.** Một domain chỉ "xong" khi mọi
endpoint BE có hàm API tương ứng **và** ít nhất một surface UI tiêu thụ nó.

Trạng thái: `not started` · `in progress` · `done` · `n/a`

---

## 1. Ledger — tiến độ di trú

Các cột theo dõi việc chuyển vào `src/features/`. Chưa có gì trong `features/` nên
tất cả đang là `not started` — **không** có nghĩa là FE chưa viết gì (xem mục 3).

| domain        | BE package                    | #ep | boundary note                                                                                                                                             | types       | api         | store/hooks | UI          | wired       | legacy removed | verified    |
| ------------- | ----------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------- | ----------- | ----------- | ----------- | -------------- | ----------- |
| posts         | `com.socialapp.posts`         | 22  | `EventController` (`/events`) nằm trong package `posts` — mirror theo package, không tách `features/events/`                                              | not started | not started | not started | not started | not started | not started    | not started |
| security      | `com.socialapp.security`      | 17  |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| bookstore     | `com.socialapp.bookstore`     | 11  | `PaymentController` (`/payments`) nằm trong `bookstore`; route `/payment/success` đứng riêng                                                              | not started | not started | not started | not started | not started | not started    | not started |
| knowledge     | `com.socialapp.knowledge`     | 10  | `PersonalAccessTokenController` (`/tokens`) và `ProfessionalProfileController` (`/profile/professional`) nằm trong `knowledge` dù path trông như security | not started | not started | not started | not started | not started | not started    | not started |
| friendships   | `com.socialapp.friendships`   | 8   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| roadmap       | `com.socialapp.roadmap`       | 8   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| notifications | `com.socialapp.notifications` | 6   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| github        | `com.socialapp.github`        | 5   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| matchmaking   | `com.socialapp.matchmaking`   | 5   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| moderation    | `com.socialapp.moderation`    | 4   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| chat          | `com.socialapp.chat`          | 1   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| newsfeed      | `com.socialapp.newsfeed`      | 1   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| reputation    | `com.socialapp.reputation`    | 1   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| search        | `com.socialapp.search`        | 1   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |
| trending      | `com.socialapp.trending`      | 1   |                                                                                                                                                           | not started | not started | not started | not started | not started | not started    | not started |

Σ 15 domain · 101 endpoint. `cloud` và `common` không có REST controller → không thành
FE feature.

**Mục tiêu thật là 99, không phải 101:** 2 endpoint không dành cho FE gọi
(`POST /v1/api/payments/momo/webhook` — MoMo gọi server-to-server;
`GET /v1/api/events/google/callback` — Google redirect thẳng về BE). Xem P4.7.

### DS deviation

Ghi mọi chi tiết trong bản Design System bị **cắt** vì BE không có dữ liệu, kèm lý do.
Cấm chế số liệu giả cho giống mockup. Ghi luôn chỗ nào cố tình làm khác bản DS.

| #   | chỗ lệch                         | DS nói                                                                                      | làm gì                                     | lý do                                                                                                                                                                                                                              |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | focus ring của `Input`           | `Input.prompt.md`: "amber focus ring"                                                       | **xanh** (`--nx-focus-ring` = blue-500)    | Constitution §1.3 giữ amber riêng cho reputation, §1.2 giao focus cho xanh, và chính `tokens/base.css` của DS đặt `outline: 2px solid var(--focus-ring)` toàn cục với focus-ring = blue-500. §0: constitution thắng khi mâu thuẫn. |
| 2   | `Card selected`                  | `Card.d.ts`: "Amber border for selected state"                                              | **viền + nền xanh**                        | Như trên. §2.1 định nghĩa selected = "blue tint + accent edge".                                                                                                                                                                    |
| 3   | `Button variant="primary"`       | `colors-neutrals` nói nút chính là ink `#101820`; `colors-accent` nói nút chính là blue-600 | **ink fill**                               | Hai guideline mâu thuẫn nhau. §1.2 cho phép cả hai ("reads blue or ink"), nên theo `Button.d.ts` — spec riêng của component thì cụ thể hơn.                                                                                        |
| 4   | hover/pressed của bề mặt inverse | DS không có alias nào cho việc này                                                          | thêm `--nx-surface-inverse-hover/-pressed` | DS có tint 4%/8% cho surface sáng nhưng không có cho surface đảo, mà nút primary ink lại cần. Lấy đúng nấc kế tiếp trên thang ink (gray-800/700, dark thì gray-100/200) chứ không bịa màu mới.                                     |

Ba dòng đầu là **mâu thuẫn nội bộ của DS**, không phải BE thiếu dữ liệu — nên báo ngược
lại cho chủ Design System, đừng để mỗi người tự quyết một kiểu.

---

## 2. Bản đồ route → domain (P0.4)

21 page + 1 route handler + 4 layout. Bảng dưới suy ra từ **đồ thị import thật**, không
đoán theo tên thư mục: barrel `@/lib/hooks` và `@/lib/api` re-export cả 14 domain nên
nếu đi theo import thô thì trang nào cũng "chạm" mọi domain — phải resolve từng symbol
qua barrel về đúng file định nghĩa mới ra được bảng này.

**Domain chủ** sở hữu shell + layout của trang. Domain góp mặt chỉ export component qua
`index.ts` của mình, không domain nào import internals của domain khác (CLAUDE.md §4).

| route                  | file                                      | domain chủ   | domain góp mặt             | ghi chú                                             |
| ---------------------- | ----------------------------------------- | ------------ | -------------------------- | --------------------------------------------------- |
| `/`                    | `app/page.tsx`                            | —            | —                          | chỉ `redirect('/newsfeed')`                         |
| `/login`               | `app/(auth)/login/page.tsx`               | security     | —                          |                                                     |
| `/register`            | `app/(auth)/register/page.tsx`            | security     | —                          |                                                     |
| `/forgot-password`     | `app/(auth)/forgot-password/page.tsx`     | security     | —                          |                                                     |
| `/reset-password`      | `app/(auth)/reset-password/page.tsx`      | security     | —                          |                                                     |
| `/verify-email`        | `app/(auth)/verify-email/page.tsx`        | security     | —                          |                                                     |
| `/magic-link`          | `app/(auth)/magic-link/page.tsx`          | security     | —                          |                                                     |
| `/magic-login`         | `app/(auth)/magic-login/page.tsx`         | security     | —                          |                                                     |
| `/newsfeed`            | `app/(main)/newsfeed/page.tsx`            | **newsfeed** | posts, bookstore, security | **span 4 domain** — P3.1                            |
| `/dashboard`           | `app/(main)/dashboard/page.tsx`           | **security** | friendships                | **span 3** — P3.3. Xem quyết định bên dưới          |
| `/profile`             | `app/(main)/profile/page.tsx`             | security     | —                          | P3.2 sẽ thêm knowledge, roadmap, github, reputation |
| `/friends`             | `app/(main)/friends/page.tsx`             | —            | —                          | chỉ `redirect('/friends/all')`                      |
| `/friends/all`         | `app/(main)/friends/all/page.tsx`         | friendships  | —                          |                                                     |
| `/friends/requests`    | `app/(main)/friends/requests/page.tsx`    | friendships  | —                          |                                                     |
| `/friends/suggestions` | `app/(main)/friends/suggestions/page.tsx` | friendships  | —                          |                                                     |
| `/friends/birthdays`   | `app/(main)/friends/birthdays/page.tsx`   | friendships  | —                          |                                                     |
| `/chats`               | `app/(main)/chats/page.tsx`               | **chat**     | friendships, security      | **span 3**                                          |
| `/search`              | `app/(main)/search/page.tsx`              | search       | —                          |                                                     |
| `/trending`            | `app/(main)/trending/page.tsx`            | trending     | —                          |                                                     |
| `/admin/moderation`    | `app/(admin)/admin/moderation/page.tsx`   | moderation   | —                          |                                                     |
| `/payment/success`     | `app/payment/success/page.tsx`            | bookstore    | —                          |                                                     |
| `/api/twilio/token`    | `app/api/twilio/token/route.ts`           | chat         | —                          | route handler, không phải page                      |

| layout                   | domain chủ         | ghi chú                                 |
| ------------------------ | ------------------ | --------------------------------------- |
| `app/layout.tsx`         | —                  | providers, theme                        |
| `app/(auth)/layout.tsx`  | —                  | thuần trình bày                         |
| `app/(main)/layout.tsx`  | shared (app shell) | dùng chat, friendships, security → P3.4 |
| `app/(admin)/layout.tsx` | security           | chỉ chặn quyền admin                    |

**3 trang span nhiều domain** — không xoá legacy sớm được, phải giữ phần của domain
chưa migrate: `/newsfeed` (4), `/dashboard` (3), `/chats` (3).

### Quyết định: domain chủ của `/dashboard`

WBS để ngỏ "quyết ở P0.4". Trang hiện gồm lời chào + identity (security), thẻ số bạn bè /
gợi ý / lời mời (friendships), và 2 thẻ follower/following gọi vào API không tồn tại.

**Chọn `security`.** Trang là "home của tài khoản đang đăng nhập" — shell và identity
thuộc security, friendships chỉ góp widget qua `index.ts`. Đã cân nhắc cho friendships
sở hữu vì phần lớn widget là bạn bè, nhưng như vậy shell sẽ phải import identity từ
security ngược lại, đúng kiểu phụ thuộc hai chiều mà §4 cấm.

---

## 3. Thực trạng legacy (đo 2026-07-22, P0.3 + P0.4)

Mục 1 nói về `features/`. Mục này ghi lại code **đang chạy** trong `src/lib/` +
`src/components/`, để bước `d` của mỗi domain biết mình đang xoá cái gì.

Chi tiết từng endpoint: [`p03-endpoint-reconciliation.md`](p03-endpoint-reconciliation.md)
(sinh lại bằng `node scripts/p03-reconcile.mjs`).

| domain         | endpoint đã gọi | hook có UI dùng | ghi chú                                                                                 |
| -------------- | --------------- | --------------- | --------------------------------------------------------------------------------------- |
| friendships    | 8/8             | 9/9             | lớp data đủ và đúng                                                                     |
| moderation     | 4/4             | 4/4             | lớp data đủ và đúng                                                                     |
| newsfeed       | 1/1             | —               | feed gọi trong `use-posts.ts`, không phải file riêng                                    |
| search         | 1/1             | 1/3             | 2 hook còn lại là tiện ích debounce                                                     |
| trending       | 1/1             | 1/1             |                                                                                         |
| bookstore      | 10/10 (+1 N/A)  | 7/10            | thiếu UI: `useBooksByAuthor`, `useDeleteBook`, `useRatingBreakdown`                     |
| posts          | 19/21 (+1 N/A)  | 6/12            | **comment chỉ ghi được, không đọc** — xem dưới                                          |
| posts (events) | 7/7 (+1 N/A)    | **0/6**         | **toàn bộ Events không có UI**                                                          |
| security       | 13/17           | 13/18           | thiếu 4 endpoint OAuth (google/github url + callback)                                   |
| notifications  | 6/6             | **0/6**         | **cả domain có data layer, không có UI nào**                                            |
| knowledge      | 0/10            | —               | chưa động tới                                                                           |
| roadmap        | 0/8             | —               | chưa động tới                                                                           |
| github         | 0/5             | —               | chưa động tới                                                                           |
| matchmaking    | 0/5             | —               | chưa động tới                                                                           |
| chat           | 0/1             | —               | FE tự phát token qua `app/api/twilio/token`, không dùng `GET /v1/api/chat/token` của BE |
| reputation     | 0/1             | —               | chưa động tới                                                                           |

Cột "hook có UI dùng" đếm hook được import từ `app/` hoặc `components/`. 5 symbol của
`security` bị đếm là không-có-UI (`syncRoleFromProfile`, `clearRoleCookie`,
`getCachedRole`, `PROFILE_QUERY_KEY`, `toProfile`) thực ra là hạ tầng — `use-auth.ts` và
`middleware.ts` dùng chúng. Không phải code chết.

### Ba chỗ "đã wire" nhưng chưa thành tính năng

1. **`notifications` — 6/6 endpoint, 0 UI.** `src/lib/hooks/use-notifications.ts` không
   được file nào trong `app/` hay `components/` import. Chuông thông báo chưa tồn tại.
2. **Events — 7 endpoint, 0 UI.** Cả 6 hook trong `use-events.ts` không có consumer.
   `event-post-details.tsx` chỉ render `EventDetails` có sẵn trong payload post; không có
   RSVP, không có danh sách attendee, không có Google Calendar.
3. **Comment chỉ ghi, không đọc.** `post-card.tsx:66` dùng `useCreateComment` nhưng
   **không** dùng `useComments`; comment vừa gõ chỉ nằm trong state `sessionComments`.
   Reload là mất. `GET /posts/{postId}/comments` có hàm API, có hook, không ai gọi.

### Code phải xoá, không phải migrate

- `src/lib/api/social.ts` (7 hàm) + `src/lib/hooks/use-social.ts` (6 hook) — gọi
  `/v1/api/social/*`, **backend không có endpoint nào như vậy**. Kéo theo 2 StatCard
  follower/following trên `/dashboard` luôn rỗng.
  → cần quyết: BE làm follow/block, hay FE bỏ hẳn. Chưa quyết thì `/dashboard` (P3.3)
  chưa chốt được scope.
- `src/lib/mock/` — mock/dead code, xoá thẳng theo CLAUDE.md §2.

### Lệch shape đã biết (P0.3)

| endpoint                                                        | lệch                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET`/`PUT /v1/api/notifications/preferences`                   | FE khai `NotificationPreference.id: number` — entity BE không có field `id` (`@Id private Integer userId`). FE thiếu `updatedAt`. |
| `POST /v1/api/auth/login`, `POST /v1/api/auth/magic-link/login` | FE `LoginResponse` thiếu `isAutoLinked`, `isNewUser`                                                                              |
| `POST /v1/api/posts/locations/resolve`                          | FE thiếu `googleMapsUrl`                                                                                                          |

---

## 4. Nhật ký checkpoint

| ngày       | task        | nội dung                                                                                                                                                      |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-22 | P0.1 + P0.2 | Boot BE, verify `/v3/api-docs` → 200. Sinh `src/core/api/schema.gen.ts` (90 path / 101 operation / 108 schema).                                               |
| 2026-07-22 | P0.3        | Đối chiếu spec ↔ `src/lib/api/*`: 58 OK · 5 wire sai · 36 chưa có · 2 n/a · 7 FE thừa.                                                                        |
| 2026-07-22 | P0.4        | Bản đồ route → domain (mục 2), chốt domain chủ của `/dashboard`, đo độ phủ UI (mục 3).                                                                        |
| 2026-07-22 | P0.5        | `docs/design-tokens-map.md`. Phát hiện: app render bằng serif, dark mode là code chết, palette không có màu thương hiệu, alias DS đụng alias shadcn.          |
| 2026-07-24 | P1.1        | Scaffold `core/` `shared/` `features/` + tsconfig paths.                                                                                                      |
| 2026-07-24 | P1.2        | Move axios / Redux store / providers vào `core/`; tách `core/query/client.ts`.                                                                                |
| 2026-07-24 | P1.3        | Transcribe token DS vào `globals.css` (tiền tố `nx-`), sửa lỗi font serif, mount `ThemeProvider` theo `data-theme`, dựng 3 primitive `Button` `Input` `Card`. |
