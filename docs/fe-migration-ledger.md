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

| domain        | BE package                    | #ep | boundary note                                                                                                                                                                 | types        | api          | store/hooks  | UI                           | wired       | legacy removed                                | verified    |
| ------------- | ----------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ------------ | ---------------------------- | ----------- | --------------------------------------------- | ----------- |
| posts         | `com.socialapp.posts`         | 22  | `EventController` (`/events`) nằm trong package `posts` — mirror theo package, không tách `features/events/`                                                                  | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| security      | `com.socialapp.security`      | 17  | `/profile/professional` (GET+PUT) **không** thuộc security — `ProfessionalProfileController` nằm trong package `knowledge`. Lọc path `/v1/api/profile*` sẽ ra 19, đúng là 17. | done (17/17) | done (17/17) | done (17/17) | done (all surfaces)          | done        | 1+2+3 (shell còn dùng useProfile+role → P3.4) | done        |
| bookstore     | `com.socialapp.bookstore`     | 11  | `PaymentController` (`/payments`) nằm trong `bookstore`; route `/payment/success` đứng riêng                                                                                  | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| knowledge     | `com.socialapp.knowledge`     | 10  | `PersonalAccessTokenController` (`/tokens`) và `ProfessionalProfileController` (`/profile/professional`) nằm trong `knowledge` dù path trông như security                     | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| friendships   | `com.socialapp.friendships`   | 8   |                                                                                                                                                                               | done (8/8)   | done (8/8)   | done (8/8)   | in progress (all + requests) | not started | not started                                   | not started |
| roadmap       | `com.socialapp.roadmap`       | 8   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| notifications | `com.socialapp.notifications` | 6   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| github        | `com.socialapp.github`        | 5   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| matchmaking   | `com.socialapp.matchmaking`   | 5   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| moderation    | `com.socialapp.moderation`    | 4   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| chat          | `com.socialapp.chat`          | 1   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| newsfeed      | `com.socialapp.newsfeed`      | 1   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| reputation    | `com.socialapp.reputation`    | 1   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| search        | `com.socialapp.search`        | 1   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |
| trending      | `com.socialapp.trending`      | 1   |                                                                                                                                                                               | not started  | not started  | not started  | not started                  | not started | not started                                   | not started |

Σ 15 domain · 101 endpoint. `cloud` và `common` không có REST controller → không thành
FE feature.

**Mục tiêu thật là 99, không phải 101:** 2 endpoint không dành cho FE gọi
(`POST /v1/api/payments/momo/webhook` — MoMo gọi server-to-server;
`GET /v1/api/events/google/callback` — Google redirect thẳng về BE). Xem P4.7.

### DS deviation

Ghi mọi chi tiết trong bản Design System bị **cắt** vì BE không có dữ liệu, kèm lý do.
Cấm chế số liệu giả cho giống mockup. Ghi luôn chỗ nào cố tình làm khác bản DS.

| #   | chỗ lệch                         | DS nói                                                                                      | làm gì                                     | lý do                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | focus ring của `Input`           | `Input.prompt.md`: "amber focus ring"                                                       | **xanh** (`--nx-focus-ring` = blue-500)    | Constitution §1.3 giữ amber riêng cho reputation, §1.2 giao focus cho xanh, và chính `tokens/base.css` của DS đặt `outline: 2px solid var(--focus-ring)` toàn cục với focus-ring = blue-500. §0: constitution thắng khi mâu thuẫn.                                                                         |
| 2   | `Card selected`                  | `Card.d.ts`: "Amber border for selected state"                                              | **viền + nền xanh**                        | Như trên. §2.1 định nghĩa selected = "blue tint + accent edge".                                                                                                                                                                                                                                            |
| 3   | `Button variant="primary"`       | `colors-neutrals` nói nút chính là ink `#101820`; `colors-accent` nói nút chính là blue-600 | **ink fill**                               | Hai guideline mâu thuẫn nhau. §1.2 cho phép cả hai ("reads blue or ink"), nên theo `Button.d.ts` — spec riêng của component thì cụ thể hơn.                                                                                                                                                                |
| 4   | hover/pressed của bề mặt inverse | DS không có alias nào cho việc này                                                          | thêm `--nx-surface-inverse-hover/-pressed` | DS có tint 4%/8% cho surface sáng nhưng không có cho surface đảo, mà nút primary ink lại cần. Lấy đúng nấc kế tiếp trên thang ink (gray-800/700, dark thì gray-100/200) chứ không bịa màu mới.                                                                                                             |
| 5   | `Avatar` initials fallback       | `Avatar.prompt.md`: "initials fallback on a name-stable color"                              | **một nền neutral cố định**                | Token layer chỉ expose alias làm utility, không expose ramp thô. Màu theo tên sẽ cần hex thô (§10 cấm) hoặc mở ramp (mời gọi màu trang trí §1). Dùng `bg-nx-surface-sunken` — ink là cấu trúc §1.1. Mở lại khi thật sự cần màu theo tên.                                                                   |
| 6   | brand mark trên trang auth       | `guidelines/brand-mark.html` có glyph riêng                                                 | **ô ink chữ "N" mono**                     | Glyph thật nằm trong `.jsx` (Constraint #1 cấm mở). Dựng tile ink an toàn theo constitution (§1.1 ink, §7.1 mono) nhưng **không** phải bản port pixel. Thay khi app có asset logo dùng chung.                                                                                                              |
| 7   | route `/friends/birthdays`       | legacy có trang sinh nhật bạn bè                                                            | **CẮT cả route** (thực thi ở P2.2d)        | `UserProfileDto` **không có field ngày sinh**. Trang legacy **bịa** ngày sinh bằng hash id+name (`getBirthday`) — đúng thứ CLAUDE.md §2/WBS cấm ("cấm chế số liệu giả cho giống mockup"). Không có BE data → cắt, không port. Nav link birthdays (shell) gỡ khi shell migrate P3.4.                        |
| 8   | chỉ báo tab đang chọn (`Tabs`)   | `Tabs.d.ts` + `Tabs.prompt.md`: "amber active indicator"                                    | **xanh** (`--nx-accent`)                   | Cùng loại với #1/#2, nhưng lần này **specimen của chính DS phản bác spec**: `navigation.card.html` render `border-bottom: 2px solid var(--accent)` — xanh, không amber. Tab đang chọn là trạng thái tương tác (§1.2 = xanh), amber dành riêng cho uy tín (§1.3). Specimen + constitution cùng phía → xanh. |

Bốn dòng 1–4 + dòng 5 chỗ đầu + dòng 8 là **mâu thuẫn nội bộ của DS** (hoặc giới hạn token), không
phải BE thiếu dữ liệu — nên báo ngược lại cho chủ Design System, đừng để mỗi người tự
quyết một kiểu.

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

| ngày       | task        | nội dung                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-22 | P0.1 + P0.2 | Boot BE, verify `/v3/api-docs` → 200. Sinh `src/core/api/schema.gen.ts` (90 path / 101 operation / 108 schema).                                                                                                                                                                                                                                                                                                 |
| 2026-07-22 | P0.3        | Đối chiếu spec ↔ `src/lib/api/*`: 58 OK · 5 wire sai · 36 chưa có · 2 n/a · 7 FE thừa.                                                                                                                                                                                                                                                                                                                          |
| 2026-07-22 | P0.4        | Bản đồ route → domain (mục 2), chốt domain chủ của `/dashboard`, đo độ phủ UI (mục 3).                                                                                                                                                                                                                                                                                                                          |
| 2026-07-22 | P0.5        | `docs/design-tokens-map.md`. Phát hiện: app render bằng serif, dark mode là code chết, palette không có màu thương hiệu, alias DS đụng alias shadcn.                                                                                                                                                                                                                                                            |
| 2026-07-24 | P1.1        | Scaffold `core/` `shared/` `features/` + tsconfig paths.                                                                                                                                                                                                                                                                                                                                                        |
| 2026-07-24 | P1.2        | Move axios / Redux store / providers vào `core/`; tách `core/query/client.ts`.                                                                                                                                                                                                                                                                                                                                  |
| 2026-07-24 | P1.3        | Transcribe token DS vào `globals.css` (tiền tố `nx-`), sửa lỗi font serif, mount `ThemeProvider` theo `data-theme`, dựng 3 primitive `Button` `Input` `Card`.                                                                                                                                                                                                                                                   |
| 2026-07-24 | P2.1a       | `features/security/` types + api, chu kỳ 1/3 (session + OAuth, 8/8 endpoint). Phát hiện drift alarm của `schema.gen.ts` đang hỏng — xem mục 5.                                                                                                                                                                                                                                                                  |
| 2026-07-24 | drift fix   | `.prettierignore` + `springdoc.writer-with-order-by-keys` (BE) + reset baseline. Verify: sinh lại qua restart JVM ra file byte-identical, diff rỗng.                                                                                                                                                                                                                                                            |
| 2026-07-24 | P2.1b       | `features/security/hooks/` — query key namespace, session establish/clear, `useLogin` `useRegister` `useLogout` `useOAuthUrl` `useOAuthCallback`.                                                                                                                                                                                                                                                               |
| 2026-07-24 | P2.1c-1     | UI login + register: `LoginForm` `RegisterForm` từ `shared/`, primitive `Avatar`, `shared/lib/api-error`, validation in-feature. Sửa thiếu `--radius-nx-full`. Verify preview: light/dark, validation, DS Input khớp specimen.                                                                                                                                                                                  |
| 2026-07-24 | P2.1c-2     | OAuth: `OAuthButtons` (Google/GitHub, prefetch URL) gắn vào login+register; `OAuthCallback` (đổi code→token). Verify preview: nút + divider, denied + exchange-error states, prefetch fires. Phát hiện env swap client_id — xem mục 6.                                                                                                                                                                          |
| 2026-07-24 | P2.1d       | Wire `/login` `/register` + route mới `/oauth/[provider]/callback` (compose feature). Bridge role-sync legacy ở route layer. Xoá legacy login+register (api/hooks/schema). `(auth)` layout bỏ gradient. `.env.local` (gitignored) trỏ FE→:8080. **Verify BE thật**: login `nguyen.truc@test.com/12345678`→/dashboard (role USER, redirect bridge chạy); sai mật khẩu→401 inline; oauth denied; provider lạ→404. |
| 2026-07-24 | P2.1'a      | Recovery data layer (chu kỳ 2): `types/recovery.ts` + `api/recovery.ts` (`recoveryApi`, 5/5 endpoint). Drift check trước khi làm: diff `schema.gen.ts` rỗng.                                                                                                                                                                                                                                                    |
| 2026-07-24 | P2.1'b      | Recovery state layer: `hooks/use-recovery.ts` — `useForgotPassword` `useResetPassword` `useVerifyEmail` `useRequestMagicLink` `useMagicLinkLogin` (reuse `useEstablishSession`).                                                                                                                                                                                                                                |
| 2026-07-24 | P2.1'c-1    | Recovery UI (chu kỳ 2, tách 1/3): `RequestLinkForm` dùng chung cho forgot-password + magic-link (variant prop). Thêm i18n `auth.magicLink`. Verify preview: 2 variant, submit thật→200→success state, light/dark.                                                                                                                                                                                               |
| 2026-07-24 | P2.1'c-2    | Recovery UI (tách 2/3): `VerifyEmailStatus` (terminal card) + `MagicLoginCallback` (session+redirect, twin của OAuthCallback). i18n `auth.verifyEmail`/`auth.magicLogin`. Verify BE thật: no-token→invalid, ?token=fake→401→error states (verify hiện msg BE, magic hiện invalid card); dark tokens remap. Screenshot không chụp được (pane không composite) — verify bằng page-text+network+computed style.    |
| 2026-07-24 | P2.1'c-3    | Recovery UI (tách 3/3): `ResetPasswordForm` (token từ URL + mật khẩu mới + xác nhận, refine khớp). i18n `auth.resetPassword`. Verify BE thật: no-token→invalid; mismatch→lỗi client; submit khớp→401→error banner; light/dark. **Chu kỳ 2 UI xong.**                                                                                                                                                            |
| 2026-07-24 | P2.1'd      | Wire 5 route recovery (forgot/magic-link → RequestLinkForm; reset/verify/magic-login → component tương ứng, Suspense; magic-login qua role bridge). Xoá legacy: `lib/schemas/auth.ts` (cả file), recovery fns/hooks trong `lib/api/auth.ts`+`lib/hooks/use-auth.ts` (còn mỗi logout cho shell). Verify BE thật: 5 route render, verify/magic-login fire→401. **Chu kỳ 2 xong.**                                 |
| 2026-07-24 | P2.1"a      | Profile data layer (chu kỳ 3): `types/profile.ts` + `api/profile.ts` (`profileApi`, 4/4). Nullability xác nhận từ Java: `username`+`profilePictureUrl` nullable, `role` luôn có. **types+api security xong 17/17.** Drift check rỗng.                                                                                                                                                                           |
| 2026-07-24 | P2.1"b      | Profile state layer: `hooks/use-profile.ts` — `useMyProfile` (query) + update/changePassword/changePicture (mutation, setQueryData patch). Query key `security.profile()` để role bridge chia sẻ ở 2"d. **hooks security xong 17/17.**                                                                                                                                                                          |
| 2026-07-24 | P2.1"c      | Profile UI: `ProfileIdentityCard` (avatar+upload+name/email), `ProfileInfoForm`, `ChangePasswordForm` từ shared/. i18n profile.\* (thêm saved/updated, sửa min 8→6). Verify BE thật (login seed): GET /profile/me→200 render, PUT /profile→200 'Đã lưu', mismatch mật khẩu→lỗi client; light/dark. **1 màn, security-owned; phần đa domain là P3.2.**                                                           |
| 2026-07-24 | P2.1"d      | Wire /profile → 3 feature component; xoá legacy chỉ /profile dùng (3 hook edit trong use-user, cả file lib/schemas/user.ts). **GIỮ useProfile + use-admin-role + post-auth-redirect + lib/api/profile** — shell/dashboard/chats/posts còn dùng, chết ở P2.4/P2.7/P3.4. Verify BE thật: /profile render trong shell, GET /profile/me×2 (feature+shell key)→200. **SECURITY DOMAIN XONG (mọi surface).**          |
| 2026-07-24 | P2.2a       | friendships data layer: `features/friendships/{types,api}` (`friendshipApi`, 8/8 endpoint). Nullability từ Java: `nextCursor`/`username`/`profilePictureUrl` nullable; `friends` là list (non-null). Extraction test SẠCH (chỉ core/). Drift rỗng.                                                                                                                                                              |
| 2026-07-24 | P2.2b       | friendships state layer: `hooks/use-friendship.ts` — friends (one-shot + infinite), suggestions, pending, sent + 4 mutation. Invalidate tường minh: accept→pending+friends, send→sent+suggestions, reject→pending, cancel→sent. Hooks không toast (UI lo). Bỏ mock/toUserSummary legacy.                                                                                                                        |
| 2026-07-25 | P2.2c-2     | UI 2 màn (tách 2/3): `FriendsList` (`/friends/all`) + `FriendRequests` (`/friends/requests`, tab nhận/gửi), primitive `Tabs`. Sửa lỗi hạ tầng `cn()` nuốt class cỡ chữ DS (xem mục 6). Verify BE thật: 13 bạn (cursor 3 trang), accept→pending 2→1 + friends 12→13, reject→empty state, cancel→rời tab gửi; tab xanh 2px + pill mono, arrow-key nav, dark remap. Phát hiện Neo4j rỗng — xem mục 6.              |
| 2026-07-24 | P2.2c-1     | UI primitives (tách 1/3): shared `Badge` `Skeleton` `EmptyState` (từ DS .d.ts+specimen), feature `FriendListItem`. Thêm keyframes DS (nx-shimmer/blink/enter/fade) vào globals. Verify preview: khớp DS specimen, animation chạy, cursor amber, light/dark. birthdays sẽ **CẮT** ở 2d (dữ liệu bịa).                                                                                                            |

---

## 5. Cảnh báo drift của `schema.gen.ts` — đã hỏng, ĐÃ SỬA (2026-07-24)

> **Trạng thái: đã sửa và verify.** Regenerate hai lần qua một lần restart JVM cho ra
> file **byte-identical**; regenerate đè lên baseline mới cho **diff rỗng**. Chi tiết ở
> cuối mục.

### Vấn đề (phát hiện ở P2.1a)

`git diff src/core/api/schema.gen.ts` **không dùng được làm chuông báo drift** như
CLAUDE.md Phase 4.1 giả định. Chạy lại lệnh sinh ở P2.1a cho diff 12.881 dòng thêm /
12.951 dòng bớt, trong khi backend **không đổi gì** — đã chứng minh bằng cách so hai
file dưới dạng multiset các dòng: giống hệt nhau, không field nào thêm/mất/đổi tên.

Hai nguyên nhân cộng dồn:

1. **`lint-staged` chạy `prettier --write` trên `*.ts`**, nên file được commit không bao
   giờ là thứ generator sinh ra: 12.894 dòng → 12.964 dòng, nháy kép → nháy đơn, thụt
   lề 4 → 2. CLAUDE.md cấm sửa tay file này; prettier sửa hộ cũng là sửa.
2. **springdoc xuất property trong schema theo thứ tự không ổn định** — `first`, `last`,
   `pageNumber` đổi chỗ giữa hai lần chạy dù nội dung y hệt.

Hệ quả: mỗi lần regenerate đều ra ~13k dòng nhiễu, nên drift thật sẽ chìm nghỉm. Đây
đúng là loại lệch âm thầm mà springdoc được đưa vào để chống.

### Đã sửa thế nào

- **FE** — tạo `.prettierignore` với `src/core/api/schema.gen.ts`. Verify: `prettier
--write` lên file này giữ nguyên 12.894 dòng (trước đó thành 12.964); `eslint --fix`
  cũng không đổi byte nào (md5 trước/sau khớp). `lint-staged` gọi cả hai công cụ này nên
  cả hai đều phải im.
- **BE** — `springdoc.writer-with-order-by-keys: true` trong `application.yml`. Sau khi
  bật: tên schema, key path, **và property trong từng schema** đều sắp xếp alphabet
  (0 schema còn property lệch thứ tự). Thứ tự sắp xếp là duy nhất nên không còn phụ
  thuộc thứ tự reflection của từng lần chạy JVM.
- **Baseline** — commit lại `schema.gen.ts` đúng bản thô generator sinh ra từ spec đã
  sắp xếp. Đây là commit **một lần** ~12.9k dòng, thuần định dạng + thứ tự: đã chứng
  minh nội dung không đổi so với HEAD bằng cách so multiset dòng sau khi chuẩn hoá
  (không field nào thêm/mất/đổi tên; vẫn 101 operation / 90 path / 108 schema).

### Bằng chứng

| kiểm tra                                             | kết quả                                     |
| ---------------------------------------------------- | ------------------------------------------- |
| sinh 2 lần trong **cùng** một JVM (trước khi sửa)    | giống hệt → ổn định trong một lần chạy      |
| sinh 2 lần qua **restart** JVM (sau khi sửa)         | **byte-identical** → hết phụ thuộc lần chạy |
| sinh đè lên baseline mới                             | **diff rỗng**                               |
| nội dung mới vs HEAD (chuẩn hoá quote/indent/thứ tự) | trùng khớp hoàn toàn                        |

Từ giờ `git diff` trên file này rỗng khi contract không đổi, và khác rỗng **chỉ khi**
backend thật sự đổi — tức P4.1 mới có ý nghĩa. Chạy lại trước mỗi domain theo quy trình
chống drift trong `docs/prompts/be-fe-integration.md`.

⚠️ Bản `application.yml` của BE đang sửa nhưng **chưa commit** — commit bên repo BE với
convention `[<id>]: [BE] …`, nếu không thì `git checkout` bên đó là thứ tự lại loạn.

---

## 6. Nợ kỹ thuật & phát hiện, mở theo domain

### hạ tầng shared (không thuộc domain nào)

- **`cn()` nuốt class cỡ chữ của DS — LỖI THẬT, ĐÃ SỬA ở P2.2c-2.**
  `shared/lib/cn.ts` dùng `twMerge` mặc định. tailwind-merge không biết `text-nx-ui` là
  **cỡ chữ** còn `text-nx-text-primary` là **màu chữ**: nó xếp cả hai vào nhóm
  `text-color` rồi bỏ cái đứng trước. Hệ quả: mọi component gộp cỡ + màu trong **một**
  lời gọi `cn()` bị mất cỡ chữ và rơi về 16px kế thừa.
  Đo được trong browser: `Button size="sm"` render **16px** thay vì 13px
  (`text-nx-body-sm` không có trong `className` cuối) — lỗi này đã tồn tại từ P1.3, ảnh
  hưởng **mọi Button trong app**, không riêng checkpoint này. `FriendListItem` không dính
  vì viết class bằng chuỗi literal, không qua `cn()`.
  Sửa: `extendTailwindMerge` khai báo 12 cỡ `--text-nx-*` vào nhóm `font-size`. Verify
  sau khi sửa: tab = 14px, Button sm = 13px, màu chữ vẫn đúng.
  → Nếu sau này thêm cỡ chữ mới vào `@theme`, **phải** thêm vào `NX_FONT_SIZES` trong
  `cn.ts`, nếu không lỗi này quay lại âm thầm.

### friendships

- **Neo4j rỗng — danh sách bạn bè và gợi ý luôn trả rỗng dù Postgres có dữ liệu**
  (phát hiện 2026-07-25, P2.2c-2). `FriendshipService.getFriends()` và `getSuggestions()`
  đọc từ **Neo4j** (`FriendshipRepository extends Neo4jRepository`, quan hệ
  `FRIENDS_WITH`), trong khi lời mời kết bạn nằm ở **Postgres** (`t_friend_requests`).
  Seed data chỉ đổ vào Postgres: 9001 có 12 dòng `ACCEPTED` nhưng Neo4j có **0 node,
  0 quan hệ** → `GET /friendships` trả `{friends: [], totalCount: 0}`.
  Đây là **lệch dữ liệu seed của BE**, không phải lỗi FE.
  Để verify được UI, local Neo4j đã được dựng lại **khớp Postgres** (32 node `User`,
  12 quan hệ `FRIENDS_WITH` sinh từ chính các dòng `ACCEPTED`) — không bịa quan hệ mới.
  Cần BE bổ sung bước seed graph, nếu không mọi máy dev mới đều thấy danh sách bạn rỗng.

- **Seed user ngoài `nguyen.truc` đều chưa verify email** → không đăng nhập bằng mật
  khẩu được (`admin1@socialapp.com` trong ghi chú vận hành cũng **sai/401**). Muốn tạo
  lời mời đến để test, P2.2c-2 tạm bật `email_verified` cho 9004/9005, gọi API, rồi
  **tắt lại**. Trạng thái dev DB để lại: request 21 `REJECTED`, 31 `CANCELLED`,
  41 `PENDING` (9001→Bob), 42 `PENDING` (9004→9001), và 9005 thành bạn của 9001
  (13 bạn). **API không có endpoint huỷ kết bạn**, nên quan hệ với 9005 chỉ gỡ được
  bằng SQL/Cypher.

- **Phân trang > 1 trang chỉ verify được bằng cách hạ tạm `limit`.** Seed chỉ có 13 bạn,
  dưới `PAGE_SIZE = 20`. Đã verify thật bằng cách tạm để `useInfiniteFriends(5)`:
  `limit=5` → `cursor=9007` → `cursor=9019` → dừng, đủ 13 dòng, hiện "đã xem hết". Sau
  đó trả lại mặc định.

- **`@/lib/i18n` giờ cũng là cạnh legacy của friendships** (từ P2.2c-2). Trước đó
  friendships sạch tuyệt đối. Hai màn mới cần chuỗi dịch nên dùng `useT`/`useI18n` như
  security. Không hạ chuẩn extraction test — chỉ dồn thêm lý do cho checkpoint hạ tầng
  chuyển `i18n` sang `core/`, lúc đó cả security lẫn friendships sạch cùng lúc.

### security

- **Legacy còn sống sau khi security "done" — thuộc shell/domain khác, không phải nợ của
  security** (chốt 2026-07-24, P2.1"d). Mọi surface CỦA security đã lên feature. Nhưng
  4 chỗ legacy vẫn còn vì **consumer ngoài security** dùng:

  | legacy còn lại                                                           | ai dùng                                                                                     | chết ở                                                          |
  | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
  | `lib/hooks/use-user.ts` (`useProfile`, `toProfile`, `PROFILE_QUERY_KEY`) | shell (main/admin layout), dashboard, chats, `create-post-form`, `post-card`, chat provider | posts P2.4, chat P2.7, shell **P3.4**                           |
  | `lib/hooks/use-admin-role.ts` (role cookie + `syncRoleFromProfile`)      | shell (admin gate), `post-auth-redirect`, `useLogout`                                       | shell **P3.4**                                                  |
  | `src/app/(auth)/post-auth-redirect.ts` (role bridge)                     | login/oauth/magic-login routes                                                              | khi role logic vào feature (cần shell migrate trước) — **P3.4** |
  | `lib/api/profile.ts` (legacy `profileApi`)                               | `use-user`, `use-admin-role`                                                                | cùng lúc 2 cái trên                                             |
  | `lib/hooks/use-auth.ts` (`useLogout`)                                    | shell logout button                                                                         | shell **P3.4**                                                  |

  Hệ quả tạm thời: trang `/profile` gọi `GET /profile/me` **hai lần** (query key feature
  `['security','profile','me']` + key legacy `['profile','me']` của shell). Tự hết khi
  shell migrate. Đây là lý do **role bridge KHÔNG retire ở P2.1"d** như báo cáo trước
  hứa nhầm — nó ràng với shell + middleware, phải đợi Phase 3.4.

- **OAuth không có tham số `state`** (phát hiện 2026-07-24, P2.1b).
  `GoogleApiClient.getOAuthUrl()` và `GithubApiClient.getOAuthUrl()` ghép URL chỉ từ
  `client_id` + `redirect_uri` + `scope`, **không có `state`**. Thiếu `state` là thiếu
  chống CSRF cho luồng OAuth: kẻ tấn công có thể ép nạn nhân hoàn tất luồng bằng
  `code` của tài khoản kẻ tấn công (login CSRF), hoặc dùng lại `code` bắt được.
  Sửa được thì phải sửa **cả hai đầu**: BE sinh `state` ngẫu nhiên gắn với session và
  kiểm lại ở callback, FE giữ và gửi kèm. Chưa làm — cần quyết định phía BE.
  Ghi ở đây để không ai tưởng FE "quên" gửi `state`.

- **`GOOGLE_OAUTH_CLIENT_ID` và `GITHUB_OAUTH_CLIENT_ID` bị hoán đổi ở env local**
  (phát hiện 2026-07-24, P2.1c-2). `GET /auth/google/url` trả URL chứa client_id kiểu
  GitHub (`Iv23li…`), còn `GET /auth/github/url` trả client_id kiểu Google
  (`…apps.googleusercontent.com`). Đây là **lỗi cấu hình env của BE**, không phải FE —
  FE redirect đúng theo URL mà BE trả. Sửa: đổi lại hai biến env bên BE. Không chặn
  P2.1c-2 vì FE chỉ chuyển hướng, nhưng luồng OAuth thật sẽ hỏng tới khi env sửa.

- **Điều hướng theo role — bridge legacy tạm thời** (P2.1b → giải quyết tạm ở P2.1d).
  Role không nằm trong JWT, không có endpoint role riêng, nên sau đăng nhập client probe
  `GET /profile/me` rồi cache vào cookie `role`. `/profile/me` thuộc **chu kỳ 3**.
  **Quyết định (user duyệt 2026-07-24): giữ role-sync legacy làm bridge.**
  `src/app/(auth)/post-auth-redirect.ts` gọi `syncRoleFromProfile` (legacy
  `lib/hooks/use-admin-role`) — đặt ở **route layer**, không trong feature, để feature
  chỉ còn đúng một cạnh ngoài biên là `@/lib/i18n`. File này **xoá ở chu kỳ 3** khi
  profile vào feature và role routing thành hook của feature. Verify thật: login USER →
  `/dashboard`, cookie `role=USER`.

- **`useLogout` legacy vẫn còn, cố ý** (P2.1d).
  App shell (`(admin)/layout.tsx`, `(main)/layout.tsx`) vẫn dùng
  `useLogout` + `authApi.logout` legacy. Feature đã có `useLogout` riêng nhưng chưa ai
  wire — shell migrate ở **Phase 3.4**. Hai bản logout song song tới lúc đó. Không xoá
  `authApi.logout` / legacy `useLogout` checkpoint này.

- **`.env.local` (gitignored) trỏ FE → `http://localhost:8080`** (tạo ở P2.1d).
  Trước đó `NEXT_PUBLIC_API_URL` chưa set nên browser gọi same-origin :3000 → 404: FE
  **chưa từng** nói chuyện được với BE trong browser. Tạo `.env.local` để verify happy
  path thật. File gitignored (`.env*`), chỉ có ở máy local — giữ lại thì app local chạy
  đúng với BE, xoá cũng được. CORS BE mặc định cho phép `http://localhost:3000`.

- **Token ghi hai chỗ** (không phải lỗi, ghi để khỏi "dọn nhầm").
  `setTokens()` ghi thẳng localStorage vì interceptor của axios đọc đồng bộ ở đó;
  `StoreProvider` cũng ghi lại cùng key khi Redux đổi. Bỏ lời gọi tường minh thì
  request đầu tiên ngay sau login sẽ phụ thuộc thời điểm store subscriber chạy.
