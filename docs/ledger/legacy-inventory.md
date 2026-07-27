# Thực trạng legacy (đo 2026-07-22, P0.3 + P0.4)

Bảng tiến độ ở [`fe-migration-ledger.md`](../fe-migration-ledger.md) nói về `features/`. File này
ghi lại code **đang chạy** trong `src/lib/` + `src/components/`, để bước `d` của mỗi domain biết
mình đang xoá cái gì.

Chi tiết từng endpoint: [`p03-endpoint-reconciliation.md`](../p03-endpoint-reconciliation.md)
(sinh lại bằng `node scripts/p03-reconcile.mjs`).

| domain         | endpoint đã gọi | hook có UI dùng | ghi chú                                                                                                           |
| -------------- | --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| friendships    | 8/8             | 9/9             | lớp data đủ và đúng                                                                                               |
| moderation     | 4/4             | 4/4             | lớp data đủ và đúng                                                                                               |
| newsfeed       | 1/1             | —               | feed gọi trong `use-posts.ts`, không phải file riêng                                                              |
| search         | 1/1             | 1/3             | 2 hook còn lại là tiện ích debounce                                                                               |
| trending       | 1/1             | 1/1             |                                                                                                                   |
| bookstore      | 10/10 (+1 N/A)  | 7/10            | thiếu UI: `useBooksByAuthor`, `useDeleteBook`, `useRatingBreakdown`                                               |
| posts          | 19/21 (+1 N/A)  | 6/12            | **comment chỉ ghi được, không đọc** — xem dưới                                                                    |
| posts (events) | 7/7 (+1 N/A)    | ~~0/6~~ → done  | ~~toàn bộ Events không có UI~~ — **đã đóng ở P2.4″d**: RSVP + đếm + ICS + Google Calendar                         |
| security       | 13/17           | 13/18           | thiếu 4 endpoint OAuth (google/github url + callback)                                                             |
| notifications  | 6/6             | ~~0/6~~ → done  | ~~cả domain có data layer, không có UI nào~~ — **đã đóng ở P2.6cd**: route `/notifications`                       |
| knowledge      | 0/10            | —               | chưa động tới                                                                                                     |
| roadmap        | 0/8             | —               | chưa động tới                                                                                                     |
| github         | 0/5             | —               | chưa động tới                                                                                                     |
| matchmaking    | 0/5             | —               | chưa động tới                                                                                                     |
| chat           | **1/1**         | **P2.7d**       | ~~FE tự phát token qua `app/api/twilio/token`~~ — Twilio xoá hẳn ở P2.7d, FE dùng `GET /v1/api/chat/token` của BE |
| reputation     | 0/1             | —               | chưa từng có code legacy → P2.3 dựng thẳng trong `features/`, không có gì để xoá                                  |

Cột "hook có UI dùng" đếm hook được import từ `app/` hoặc `components/`. 5 symbol của
`security` bị đếm là không-có-UI (`syncRoleFromProfile`, `clearRoleCookie`,
`getCachedRole`, `PROFILE_QUERY_KEY`, `toProfile`) thực ra là hạ tầng — `use-auth.ts` và
`middleware.ts` dùng chúng. Không phải code chết.

### Ba chỗ "đã wire" nhưng chưa thành tính năng

1. ~~**`notifications` — 6/6 endpoint, 0 UI.**~~ — **ĐÃ ĐÓNG ở P2.6cd.** `NotificationList` +
   `NotificationPreferences` trên route mới `/notifications` phủ cả 6 endpoint.
   **Còn lại, có chủ đích**: chuông + badge trên topbar thuộc **app shell → P3.4**; nó sẽ mount
   `useUnreadNotificationCount` của riêng nó và link về `/notifications`.
2. ~~**Events — 7 endpoint, 0 UI.**~~ — **ĐÃ ĐÓNG ở P2.4″d.** `EventRsvpBar` +
   `EventCalendarActions` phủ RSVP, số người tham gia, ICS và Google Calendar.
   **Giới hạn còn lại, không phải nợ FE**: danh sách attendee chỉ có `userId` (BE trả JPA
   entity, không có endpoint tra người theo id) nên hiện được **số** chứ không hiện được **ai**.
3. ~~**Comment chỉ ghi, không đọc.**~~ — **ĐÃ ĐÓNG ở P2.4′d.** `CommentThread` đọc thật
   `GET /posts/{postId}/comments`; `SessionComment` (comment chỉ sống trong state, mất khi
   reload) đã bị xoá cùng card legacy.

### Đã xoá ở P2.4d (composer của posts, chu kỳ 1)

`/newsfeed` render `PostComposer` của `features/posts`. Xoá theo đó:

| file / symbol                                                                                                                                                   | vì sao xoá được                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `components/posts/create-post-form.tsx`                                                                                                                         | thay bằng `PostComposer`; nhánh EVENT được giữ lại (xem dưới), phần còn lại chết   |
| `components/posts/pdf-preview.tsx`                                                                                                                              | đã quyết CẮT ở P2.4c-4 (react-pdf + worker CDN unpkg), 0 consumer sau khi xoá form |
| `components/posts/location-picker.tsx`                                                                                                                          | thay bằng `LocationPicker` của `features/posts`                                    |
| `components/posts/location-badge.tsx`                                                                                                                           | code chết từ trước (0 consumer), tự dựng lại URL Maps ở client                     |
| `lib/hooks/use-posts.ts`: `useCreatePost` `useCreateBookPost` `useUpdatePost` `useDeletePost` + `toCreatePostRequest` + `CreatePostInput`/`CreateBookPostInput` | thay bằng hook cùng tên ở `features/posts`                                         |
| `lib/api/posts.ts`: `createPost` `createBookPost` `updatePost` `deletePost`                                                                                     | thay bằng `features/posts/api/post.ts`                                             |

**GIỮ LẠI có chủ đích, không phải sót:**

- `components/posts/create-event-form.tsx` — **file mới, là cầu tạm**. `PostComposer` mới làm
  7/8 loại; `EVENT` thuộc chu kỳ 3 (`P2.4″`). Xoá trọn form cũ sẽ **mất đường tạo post EVENT**
  trong toàn app, nên nhánh EVENT được rút ra thành card riêng nằm dưới composer. Nó gọi
  **hook và LocationPicker của `features/posts`** (đó là thứ cho phép xoá bản legacy cùng lúc);
  chỉ các ô nhập còn là legacy. **P2.4″d xoá file này** cùng `event-datetime-picker.tsx`,
  `event-location-input.tsx`, `event-datepicker.css`.
- ~~`lib/hooks/use-posts.ts` phần reaction + comment~~ — **đã xoá ở P2.4′d** (xem mục dưới).
  `useNewsfeed` vẫn ở lại: domain `newsfeed`, P2.5.
- `lib/types`: `PostLocation` nay không còn consumer ngoài `lib/types` nhưng vẫn bị `Post` và
  `CreatePostPayload` (legacy, deprecated) tham chiếu. Dọn cùng đợt tháo `lib/types` khi posts
  chu kỳ 2 xong, không tách lẻ ở đây.

### Đã xoá ở P2.4′d (comment + reaction của posts, chu kỳ 2)

`/newsfeed` render `FeedPost` (adapter mới) thay card legacy. Xoá theo đó:

| file / symbol                                                                                                                                             | vì sao xoá được                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `components/posts/post-card.tsx`                                                                                                                          | thay bằng `PostCard` + 7 khối body + `ReactionBar` + `CommentThread` + `PostMenu`/`PostEditor`/`QuizTaker` |
| `components/posts/event-post-details.tsx`                                                                                                                 | thay bằng `EventBody`                                                                                      |
| `components/posts/book-post-summary.tsx`                                                                                                                  | nửa trình bày thay bằng `BookBody`; nửa tương tác **rút ra `book-post-actions.tsx`** (xem dưới)            |
| `lib/api/posts.ts` — **cả file**                                                                                                                          | 7 hàm còn lại đều là comment/reaction → `features/posts/api/comment.ts` + `api/reaction.ts`                |
| `lib/hooks/use-posts.ts`: `useMyReaction` `useUpsertReaction` `useRemoveReaction` `useComments` `useCreateComment` `useUpdateComment` `useDeleteComment`  | thay bằng hook cùng tên ở `features/posts`                                                                 |
| `lib/types`: `ReactionType` `UpsertReactionRequest` `MyReactionResponse` `CreateCommentRequest` `UpdateCommentRequest` `CommentResponse` `SessionComment` | `features/posts/types` sở hữu, derive từ `schema.gen.ts`                                                   |
| i18n `post.like` `post.comment` `post.share` `post.olderCommentsHidden`                                                                                   | card legacy là consumer duy nhất                                                                           |

**GIỮ LẠI có chủ đích:**

- `components/posts/newsfeed.tsx` + `lib/api/newsfeed.ts` + `useNewsfeed`/`NEWSFEED_QUERY_KEY` — domain
  **newsfeed**, P2.5. `use-posts.ts` giờ chỉ còn đúng hai thứ này.
- `components/posts/feed-post.tsx` — **file mới, cầu tạm**: đoạn map `FeedPostDataDto` → props của
  `PostCard`. Card cố ý không nhận DTO của feed (§4), nên chỗ map phải nằm ở bên giữ payload. Bên đó
  _lẽ ra_ là `features/newsfeed`, chưa tồn tại. **P2.5 chuyển file này vào `features/newsfeed/components`**
  gần như nguyên vẹn.
- `components/posts/book-post-actions.tsx` — **file mới, cầu tạm**, cùng loại với `create-event-form.tsx`.
  `BookBody` cố ý không có nút mua/đọc (thuộc package `bookstore`, §4) mà mở slot `actions`. Xoá trọn
  `book-post-summary.tsx` sẽ **mất đường mua / tải / xem trước / đánh giá sách duy nhất của app** — hồi
  quy, không phải dọn dẹp (Guardrail C). Nên nửa tương tác được rút ra đặt vào đúng slot đó.
  **P2.10 xoá file này**, `features/bookstore` cấp slot.
- `components/posts/create-event-form.tsx` + `event-datetime-picker.tsx` + `event-location-input.tsx` +
  `event-datepicker.css` — cầu tạm EVENT, **P2.4″d** (không đổi từ P2.4d).
- `components/posts/book-reader-dialog.tsx` — bookstore, P2.10.

### Đã xoá ở P2.4″d (events — posts đóng domain)

`PostComposer` làm đủ **8/8 loại**, feed render RSVP + lịch. Xoá theo đó:

| file / symbol                                                                                                                                                                | vì sao xoá được                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/posts/create-event-form.tsx`                                                                                                                                     | cầu tạm EVENT hết lý do tồn tại — composer nhận loại EVENT                                                                                            |
| `components/posts/event-datetime-picker.tsx` + `event-datepicker.css`                                                                                                        | thay bằng `datetime-local` native trong `EventFields`; **gỡ luôn `react-datepicker`** khỏi `package.json` (0 consumer còn lại)                        |
| `components/posts/event-location-input.tsx`                                                                                                                                  | `EventDetails.location` là nhãn tự do → ô text thường; địa điểm có cấu trúc đã có `LocationPicker`                                                    |
| `lib/api/events.ts` + `lib/hooks/use-events.ts` — **cả hai file**                                                                                                            | thay bằng `features/posts/api/event.ts` + `hooks/use-event.ts`                                                                                        |
| `lib/api/location.ts` + `lib/hooks/use-location.ts` — **cả hai file**                                                                                                        | consumer cuối là `event-location-input`; `features/posts` đã có `useResolveLocation`                                                                  |
| `lib/types`: `RsvpStatus` `EventRsvp` `AttendeeCountResponse` `AuthUrlResponse` `CalendarStatusResponse`                                                                     | `features/posts/types/event.ts` sở hữu, derive từ `schema.gen.ts`                                                                                     |
| `lib/types`: `CreatePostRequest` `UpdatePostRequest` `Post` `PostAuthor` `CreatePostPayload` `CreatePostResponse` `PostLocation` `LocationResolutionResponse` `EventDetails` | mặt ghi của posts, mồ côi từ khi cầu tạm EVENT chết. `EventDetails` giờ **import từ `features/posts`** cho `FeedPostData`, một định nghĩa thay vì hai |
| i18n `createPost.event.endMode.*` `endTimeAuto` `cancel` `bridgeNote` `contentPlaceholder` `locationError`                                                                   | thuộc riêng cầu tạm / picker cũ                                                                                                                       |

**`src/lib/api/` còn 13 file, `src/lib/hooks/` còn 13 file — không còn file nào của posts.**

**GIỮ LẠI có chủ đích:**

- `components/posts/newsfeed.tsx` + `feed-post.tsx` + `lib/api/newsfeed.ts` + `use-posts.ts` (chỉ còn
  `useNewsfeed` + `NEWSFEED_QUERY_KEY`) + `FeedPostData`/`FeedResponse`/`FeedBookSummary` trong
  `lib/types` — **domain newsfeed, P2.5**.
- `components/posts/book-post-actions.tsx` + `book-reader-dialog.tsx` — **bookstore, P2.10**.

### Đã xoá ở P2.5 (domain newsfeed)

| file / symbol                                                      | vì sao xoá được                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `lib/api/newsfeed.ts`                                              | thay bằng `features/newsfeed/api/feed.ts`                                            |
| `lib/hooks/use-posts.ts` — **cả file**                             | phần cuối cùng (`useNewsfeed` + `NEWSFEED_QUERY_KEY`) sang `features/newsfeed/hooks` |
| `components/posts/newsfeed.tsx` → `features/newsfeed/components/`  | dựng lại bằng `shared/components` (skeleton/empty/error), không còn shadcn           |
| `components/posts/feed-post.tsx` → `features/newsfeed/components/` | chuyển nguyên; bỏ import cầu tạm bookstore, nhận qua render prop                     |
| `lib/types`: `FeedPostData` `FeedResponse` `FeedBookSummary`       | `features/newsfeed/types/feed.ts` sở hữu, derive từ `schema.gen.ts`                  |

**`src/components/posts/` giờ chỉ còn 2 file, cả hai đều là bookstore** (`book-post-actions.tsx`,
`book-reader-dialog.tsx`) — xoá ở P2.10.

**Ranh giới đáng ghi**: `features/newsfeed` **không** import cầu tạm bookstore (sẽ là legacy path
nằm trong feature, hỏng extraction test §4). Page `/newsfeed` — chỗ duy nhất được biết cả hai —
truyền xuống qua prop `renderBookActions`. P2.10 đổi prop này sang component của
`features/bookstore` rồi bỏ prop.

### Code phải xoá, không phải migrate

- `src/lib/api/social.ts` (7 hàm) + `src/lib/hooks/use-social.ts` (6 hook) — gọi
  `/v1/api/social/*`, **backend không có endpoint nào như vậy**. Kéo theo 2 StatCard
  follower/following trên `/dashboard` luôn rỗng.
  → cần quyết: BE làm follow/block, hay FE bỏ hẳn. Chưa quyết thì `/dashboard` (P3.3)
  chưa chốt được scope.
- ~~`src/lib/mock/`~~ — **ĐÃ XOÁ ở P2.2d.** Consumer duy nhất là `lib/api/friendship.ts`
  (nhánh `NEXT_PUBLIC_USE_MOCK`), nên nó chết cùng lúc dọn legacy friendships.

### Lệch shape đã biết (P0.3)

| endpoint                                                        | lệch                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`/`PUT /v1/api/notifications/preferences`                   | ~~FE khai `NotificationPreference.id: number` — entity BE không có field `id` (`@Id private Integer userId`). FE thiếu `updatedAt`.~~ — **đã đóng ở P2.6ab** (type mới derive từ spec, verify trên wire: không có `id`, có `updatedAt`). Type legacy sai vẫn còn trong `lib/types` tới P2.6cd |
| `POST /v1/api/auth/login`, `POST /v1/api/auth/magic-link/login` | FE `LoginResponse` thiếu `isAutoLinked`, `isNewUser`                                                                                                                                                                                                                                          |
| `POST /v1/api/posts/locations/resolve`                          | ~~FE thiếu `googleMapsUrl`~~ — **đã đóng ở P2.4a** (type mới derive từ spec, field có đủ và xác nhận nullable)                                                                                                                                                                                |

---

### Đã xoá ở P2.6cd (domain notifications)

Route mới `/notifications` render `NotificationList` + `NotificationPreferences` của
`features/notifications`. Xoá theo đó:

| file / symbol                                                                                                                                                          | vì sao xoá được                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `lib/api/notifications.ts` — **cả file**                                                                                                                               | thay bằng `features/notifications/api/notification.ts` + `api/preference.ts`               |
| `lib/hooks/use-notifications.ts` — **cả file**                                                                                                                         | thay bằng `features/notifications/hooks` (6 hook cùng tên + `notificationKeys`)            |
| `lib/types`: `NotificationType` `NotificationChannel` `EmailFrequency` `NotificationResponse` `UnreadCountResponse` `NotificationPreference` `UpdatePreferenceRequest` | `features/notifications/types` sở hữu, derive từ `schema.gen.ts`; bản cũ còn khai sai `id` |

**GIỮ LẠI có chủ đích:**

- `lib/types`: `Page<T>` — **không** thuộc riêng notifications. `lib/api/moderation.ts` (3 chỗ) và
  `lib/api/social.ts` (3 chỗ) vẫn dùng. `features/notifications` không dùng nó nữa: envelope
  phân trang được derive riêng từ `PageNotificationResponseDto` (lý do ở `findings/notifications.md`
  §4). Chết ở **P2.15** cùng moderation, hoặc sớm hơn nếu chốt bỏ `social`.

**Không phải xoá mà là DI CHUYỂN, cùng checkpoint:**

| từ                                                   | tới                    | vì sao                                                                                                                                                                                            |
| ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/posts/lib/format.ts` (cả file)             | `shared/lib/format.ts` | chính file đó tự hẹn "promote khi domain thứ hai cần"; notifications là domain thứ hai. Thư mục `features/posts/lib/` giờ rỗng                                                                    |
| `useRelativeTime` (hàm cục bộ trong `post-card.tsx`) | `shared/lib/format.ts` | cùng lý do, comment trong `post-card.tsx` cũng đã hẹn sẵn                                                                                                                                         |
| i18n `post.justNow/minutesAgo/hoursAgo/daysAgo`      | `time.*`               | nhãn thời gian không thuộc domain post nữa. **2 file legacy phải sửa theo**: ~~`components/chat/conversation-list.tsx`~~ (đã chết ở P2.7d), `components/trending/trending-card.tsx` (chết ở P2.9) |

**`src/lib/api/` còn 11 file, `src/lib/hooks/` còn 11 file.**

---

### Đã xoá ở P2.7d (domain chat — Twilio chết hẳn)

`/chats` render `ChatMessenger` và app shell render `ChatClientProvider` + `ChatDock` của
`features/chat`. Đây là lần xoá lớn nhất tính theo dòng của cả cuộc di trú (~1830 dòng), và là lần
duy nhất xoá **một backend nằm trong FE**.

| file / symbol                                                                                                                                           | vì sao xoá được                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `components/chat/` — **cả 6 file** (`chat-box` `chat-window` `communication-provider` `conversation-list` `messenger-sidebar` `messenger-conversation`) | thay bằng `features/chat/components` (`ChatDock` `FloatingChatWindow` `ChatMessenger` `ConversationSidebar` `ConversationView` …) |
| `lib/twilio/` — **cả 4 file** (`index` `token` `types` `use-conversations`)                                                                             | thay bằng `features/chat/{api,hooks,types}` trên Stream                                                                           |
| `app/api/twilio/token/route.ts` + thư mục `app/api/`                                                                                                    | **FE không còn cấp token cho ai.** BE `GET /v1/api/chat/token` là nguồn duy nhất                                                  |
| `package.json`: `twilio@^6`, `@twilio/conversations@^3`                                                                                                 | 0 consumer sau khi xoá 10 file trên                                                                                               |
| i18n `chat.activeNow`, `chat.you`                                                                                                                       | key duy nhất của legacy: `activeNow` là presence bịa (vẽ cứng), `you` không còn nơi gọi                                           |

**Vì sao route handler quan trọng hơn con số dòng**: `app/api/twilio/token` tự ký JWT bằng
`TWILIO_API_KEY_SECRET` — tức FE vừa giữ secret vừa cấp quyền, đúng thứ mục tiêu
microservices-ready (CLAUDE.md §4) cấm. Ghi từ P2.7 R7; nay đóng.

**`src/app/api/` không còn tồn tại** — mọi route dưới `src/app` giờ đều là page.

**`src/lib/api/` còn 11 file, `src/lib/hooks/` còn 11 file** (chat chưa từng có file trong hai
bucket đó — nó sống ở `lib/twilio/`, nên hai con số này không đổi).
