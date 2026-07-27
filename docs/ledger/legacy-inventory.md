# Thực trạng legacy (đo 2026-07-22, P0.3 + P0.4)

Bảng tiến độ ở [`fe-migration-ledger.md`](../fe-migration-ledger.md) nói về `features/`. File này
ghi lại code **đang chạy** trong `src/lib/` + `src/components/`, để bước `d` của mỗi domain biết
mình đang xoá cái gì.

Chi tiết từng endpoint: [`p03-endpoint-reconciliation.md`](../p03-endpoint-reconciliation.md)
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
| reputation     | 0/1             | —               | chưa từng có code legacy → P2.3 dựng thẳng trong `features/`, không có gì để xoá        |

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

### Code phải xoá, không phải migrate

- `src/lib/api/social.ts` (7 hàm) + `src/lib/hooks/use-social.ts` (6 hook) — gọi
  `/v1/api/social/*`, **backend không có endpoint nào như vậy**. Kéo theo 2 StatCard
  follower/following trên `/dashboard` luôn rỗng.
  → cần quyết: BE làm follow/block, hay FE bỏ hẳn. Chưa quyết thì `/dashboard` (P3.3)
  chưa chốt được scope.
- ~~`src/lib/mock/`~~ — **ĐÃ XOÁ ở P2.2d.** Consumer duy nhất là `lib/api/friendship.ts`
  (nhánh `NEXT_PUBLIC_USE_MOCK`), nên nó chết cùng lúc dọn legacy friendships.

### Lệch shape đã biết (P0.3)

| endpoint                                                        | lệch                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET`/`PUT /v1/api/notifications/preferences`                   | FE khai `NotificationPreference.id: number` — entity BE không có field `id` (`@Id private Integer userId`). FE thiếu `updatedAt`. |
| `POST /v1/api/auth/login`, `POST /v1/api/auth/magic-link/login` | FE `LoginResponse` thiếu `isAutoLinked`, `isNewUser`                                                                              |
| `POST /v1/api/posts/locations/resolve`                          | ~~FE thiếu `googleMapsUrl`~~ — **đã đóng ở P2.4a** (type mới derive từ spec, field có đủ và xác nhận nullable)                    |

---
