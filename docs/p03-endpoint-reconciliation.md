# P0.3 — Đối chiếu OpenAPI spec ↔ `src/lib/api/*.ts`

> Sinh bằng `node scripts/p03-reconcile.mjs`. Đừng sửa tay — sửa script rồi chạy lại.

Nguồn: `http://localhost:8080/v3/api-docs` (90 path / 101 operation / 108 schema) đối chiếu với 17 file trong `src/lib/api/`.

| Nhóm         | Số  | Nghĩa                                  |
| ------------ | --- | -------------------------------------- |
| **OK**       | 58  | path + verb + tên field khớp spec      |
| **WIRE SAI** | 5   | có hàm FE, path đúng, nhưng shape lệch |
| **CHƯA CÓ**  | 36  | spec có, FE chưa gọi                   |
| **N/A**      | 2   | endpoint không dành cho FE gọi         |
| **FE THỪA**  | 7   | FE gọi path spec không định nghĩa      |
| Σ spec       | 101 |                                        |

## FE THỪA — nghiêm trọng nhất

`/v1/api/social/*` **không tồn tại trong backend**: không có trong spec, không có
`SocialController.java`, `grep` toàn bộ `src/main/java` không ra mapping nào.
Toàn bộ `src/lib/api/social.ts` (7 hàm) + `src/lib/hooks/use-social.ts` (6 hook) gọi
vào hư không.

| verb | path                         | file         |
| ---- | ---------------------------- | ------------ |
| POST | `/v1/api/social/follow/{}`   | social.ts:5  |
| POST | `/v1/api/social/unfollow/{}` | social.ts:7  |
| GET  | `/v1/api/social/following`   | social.ts:10 |
| GET  | `/v1/api/social/followers`   | social.ts:15 |
| POST | `/v1/api/social/block/{}`    | social.ts:19 |
| POST | `/v1/api/social/unblock/{}`  | social.ts:21 |
| GET  | `/v1/api/social/blocked`     | social.ts:24 |

**Đã chạm tới UI đang chạy:** `src/app/(main)/dashboard/page.tsx:51-52` gọi
`useFollowers()` / `useFollowing()` rồi render `followers?.totalElements` và
`following?.totalElements` vào 2 StatCard. Hai query này 404, `data` mãi `undefined`,
nên 2 ô số liệu trên dashboard luôn rỗng.

## WIRE SAI

| endpoint                                | file                | lệch chỗ nào                                                                              |
| --------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| `GET /v1/api/notifications/preferences` | notifications.ts:26 | FE `NotificationPreference.id: number` không tồn tại trên entity BE; FE thiếu `updatedAt` |
| `PUT /v1/api/notifications/preferences` | notifications.ts:29 | FE `NotificationPreference.id: number` không tồn tại trên entity BE; FE thiếu `updatedAt` |
| `POST /v1/api/posts/locations/resolve`  | location.ts:6       | FE `LocationResolutionResponse` thiếu field spec có: `googleMapsUrl`                      |
| `POST /v1/api/auth/login`               | auth.ts:42          | FE `LoginResponse` thiếu field spec có: `isAutoLinked`, `isNewUser`                       |
| `POST /v1/api/auth/magic-link/login`    | auth.ts:94          | FE `LoginResponse` thiếu field spec có: `isAutoLinked`, `isNewUser`                       |

`NotificationPreference.id` là field ma: `NotificationPreferenceEntity.java:27` khai
`@Id private Integer userId` — không có `id`. FE khai `id: number` **không optional**,
nên chỗ nào đọc `.id` cũng ra `undefined`.

Ghi chú BE: `/notifications/preferences` trả thẳng JPA entity
(`NotificationPreferenceEntity`) chứ không phải DTO — schema duy nhất trong spec có hậu
tố `Entity`. Không chặn FE, nhưng là chỗ nên nêu khi làm domain `notifications`.

## Độ phủ theo package

| package       | OK     | WIRE SAI | CHƯA CÓ | N/A   | Σ       |
| ------------- | ------ | -------- | ------- | ----- | ------- |
| posts         | 18     | 1        | 2       | 1     | 22      |
| security      | 11     | 2        | 4       | 0     | 17      |
| bookstore     | 10     | 0        | 0       | 1     | 11      |
| knowledge     | 0      | 0        | 10      | 0     | 10      |
| friendships   | 8      | 0        | 0       | 0     | 8       |
| roadmap       | 0      | 0        | 8       | 0     | 8       |
| notifications | 4      | 2        | 0       | 0     | 6       |
| github        | 0      | 0        | 5       | 0     | 5       |
| matchmaking   | 0      | 0        | 5       | 0     | 5       |
| moderation    | 4      | 0        | 0       | 0     | 4       |
| chat          | 0      | 0        | 1       | 0     | 1       |
| newsfeed      | 1      | 0        | 0       | 0     | 1       |
| reputation    | 0      | 0        | 1       | 0     | 1       |
| search        | 1      | 0        | 0       | 0     | 1       |
| trending      | 1      | 0        | 0       | 0     | 1       |
| **Σ**         | **58** | **5**    | **36**  | **2** | **101** |

## Toàn bộ 101 operation

| #   | package       | controller            | verb   | path                                                           | trạng thái | file FE / ghi chú                                                                                               |
| --- | ------------- | --------------------- | ------ | -------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | bookstore     | book                  | DELETE | `/v1/api/books/{bookId}`                                       | OK         | books.ts:16                                                                                                     |
| 2   | bookstore     | book                  | GET    | `/v1/api/books/{bookId}`                                       | OK         | books.ts:11                                                                                                     |
| 3   | bookstore     | book                  | GET    | `/v1/api/books/{bookId}/download`                              | OK         | books.ts:22                                                                                                     |
| 4   | bookstore     | book                  | GET    | `/v1/api/books/{bookId}/preview`                               | OK         | books.ts:19                                                                                                     |
| 5   | bookstore     | book                  | GET    | `/v1/api/books/{bookId}/reviews`                               | OK         | books.ts:24                                                                                                     |
| 6   | bookstore     | book                  | POST   | `/v1/api/books/{bookId}/reviews`                               | OK         | books.ts:27                                                                                                     |
| 7   | bookstore     | book                  | GET    | `/v1/api/books/{bookId}/reviews/breakdown`                     | OK         | books.ts:30                                                                                                     |
| 8   | bookstore     | book                  | GET    | `/v1/api/books/author/{authorId}`                              | OK         | books.ts:14                                                                                                     |
| 9   | bookstore     | payment               | POST   | `/v1/api/payments/{transactionRef}/sync`                       | OK         | payments.ts:8                                                                                                   |
| 10  | bookstore     | payment               | POST   | `/v1/api/payments/books/{bookId}`                              | OK         | payments.ts:5                                                                                                   |
| 11  | bookstore     | payment               | POST   | `/v1/api/payments/momo/webhook`                                | N/A        | MoMo gọi server-to-server (IPN). FE viết hàm gọi cái này là lỗi.                                                |
| 12  | chat          | chat                  | GET    | `/v1/api/chat/token`                                           | CHƯA CÓ    | —                                                                                                               |
| 13  | friendships   | friendship            | GET    | `/v1/api/friendships`                                          | OK         | friendship.ts:84                                                                                                |
| 14  | friendships   | friendship            | POST   | `/v1/api/friendships/requests/{addresseeId}`                   | OK         | friendship.ts:40                                                                                                |
| 15  | friendships   | friendship            | DELETE | `/v1/api/friendships/requests/{requestId}`                     | OK         | friendship.ts:45                                                                                                |
| 16  | friendships   | friendship            | POST   | `/v1/api/friendships/requests/{requestId}/accept`              | OK         | friendship.ts:50                                                                                                |
| 17  | friendships   | friendship            | POST   | `/v1/api/friendships/requests/{requestId}/reject`              | OK         | friendship.ts:55                                                                                                |
| 18  | friendships   | friendship            | GET    | `/v1/api/friendships/requests/pending`                         | OK         | friendship.ts:60                                                                                                |
| 19  | friendships   | friendship            | GET    | `/v1/api/friendships/requests/sent`                            | OK         | friendship.ts:65                                                                                                |
| 20  | friendships   | friendship            | GET    | `/v1/api/friendships/suggestions`                              | OK         | friendship.ts:89                                                                                                |
| 21  | github        | github                | POST   | `/v1/api/github/oauth/callback`                                | CHƯA CÓ    | —                                                                                                               |
| 22  | github        | github                | GET    | `/v1/api/github/oauth/url`                                     | CHƯA CÓ    | —                                                                                                               |
| 23  | github        | github                | GET    | `/v1/api/github/stats/{userId}`                                | CHƯA CÓ    | —                                                                                                               |
| 24  | github        | github                | POST   | `/v1/api/github/sync`                                          | CHƯA CÓ    | —                                                                                                               |
| 25  | github        | github                | DELETE | `/v1/api/github/unlink`                                        | CHƯA CÓ    | —                                                                                                               |
| 26  | knowledge     | explanation           | GET    | `/v1/api/knowledge/my-library`                                 | CHƯA CÓ    | —                                                                                                               |
| 27  | knowledge     | explanation           | POST   | `/v1/api/knowledge/posts/{postId}/explain`                     | CHƯA CÓ    | —                                                                                                               |
| 28  | knowledge     | explanation           | POST   | `/v1/api/knowledge/save`                                       | CHƯA CÓ    | —                                                                                                               |
| 29  | knowledge     | knowledge-sync        | GET    | `/v1/api/knowledge/sync/pull`                                  | CHƯA CÓ    | —                                                                                                               |
| 30  | knowledge     | knowledge-sync        | POST   | `/v1/api/knowledge/sync/push`                                  | CHƯA CÓ    | —                                                                                                               |
| 31  | knowledge     | professional-profile  | GET    | `/v1/api/profile/professional`                                 | CHƯA CÓ    | —                                                                                                               |
| 32  | knowledge     | professional-profile  | PUT    | `/v1/api/profile/professional`                                 | CHƯA CÓ    | —                                                                                                               |
| 33  | knowledge     | personal-access-token | GET    | `/v1/api/tokens`                                               | CHƯA CÓ    | —                                                                                                               |
| 34  | knowledge     | personal-access-token | POST   | `/v1/api/tokens`                                               | CHƯA CÓ    | —                                                                                                               |
| 35  | knowledge     | personal-access-token | DELETE | `/v1/api/tokens/{tokenId}`                                     | CHƯA CÓ    | —                                                                                                               |
| 36  | matchmaking   | project               | POST   | `/v1/api/projects`                                             | CHƯA CÓ    | —                                                                                                               |
| 37  | matchmaking   | project               | PUT    | `/v1/api/projects/applications/{applicationId}/accept`         | CHƯA CÓ    | —                                                                                                               |
| 38  | matchmaking   | project               | PUT    | `/v1/api/projects/applications/{applicationId}/reject`         | CHƯA CÓ    | —                                                                                                               |
| 39  | matchmaking   | project               | POST   | `/v1/api/projects/positions/{positionId}/apply`                | CHƯA CÓ    | —                                                                                                               |
| 40  | matchmaking   | project               | GET    | `/v1/api/projects/positions/{positionId}/suggested-candidates` | CHƯA CÓ    | —                                                                                                               |
| 41  | moderation    | admin-moderation      | GET    | `/v1/api/admin/moderation/banned-users`                        | OK         | moderation.ts:19                                                                                                |
| 42  | moderation    | admin-moderation      | GET    | `/v1/api/admin/moderation/logs`                                | OK         | moderation.ts:16                                                                                                |
| 43  | moderation    | admin-moderation      | GET    | `/v1/api/admin/moderation/posts`                               | OK         | moderation.ts:13                                                                                                |
| 44  | moderation    | admin-moderation      | POST   | `/v1/api/admin/moderation/posts/{postId}/review`               | OK         | moderation.ts:24                                                                                                |
| 45  | newsfeed      | newsfeed              | GET    | `/v1/api/feed`                                                 | OK         | newsfeed.ts:6                                                                                                   |
| 46  | notifications | notification          | GET    | `/v1/api/notifications`                                        | OK         | notifications.ts:12                                                                                             |
| 47  | notifications | notification          | POST   | `/v1/api/notifications/{id}/read`                              | OK         | notifications.ts:20                                                                                             |
| 48  | notifications | notification          | GET    | `/v1/api/notifications/preferences`                            | WIRE SAI   | notifications.ts:26 — FE `NotificationPreference.id: number` không tồn tại trên entity BE; FE thiếu `updatedAt` |
| 49  | notifications | notification          | PUT    | `/v1/api/notifications/preferences`                            | WIRE SAI   | notifications.ts:29 — FE `NotificationPreference.id: number` không tồn tại trên entity BE; FE thiếu `updatedAt` |
| 50  | notifications | notification          | POST   | `/v1/api/notifications/read-all`                               | OK         | notifications.ts:23                                                                                             |
| 51  | notifications | notification          | GET    | `/v1/api/notifications/unread-count`                           | OK         | notifications.ts:17                                                                                             |
| 52  | posts         | event                 | POST   | `/v1/api/events/{postId}/add-to-calendar`                      | OK         | events.ts:23                                                                                                    |
| 53  | posts         | event                 | GET    | `/v1/api/events/{postId}/attendees`                            | OK         | events.ts:17                                                                                                    |
| 54  | posts         | event                 | GET    | `/v1/api/events/{postId}/attendees/count`                      | OK         | events.ts:20                                                                                                    |
| 55  | posts         | event                 | GET    | `/v1/api/events/{postId}/export.ics`                           | OK         | events.ts:26 — dùng dạng URL, không phải call axios                                                             |
| 56  | posts         | event                 | POST   | `/v1/api/events/{postId}/rsvp`                                 | OK         | events.ts:12                                                                                                    |
| 57  | posts         | event                 | GET    | `/v1/api/events/google/auth-url`                               | OK         | events.ts:29                                                                                                    |
| 58  | posts         | event                 | GET    | `/v1/api/events/google/callback`                               | N/A        | Google redirect thẳng browser về BE (`GOOGLE_CALENDAR_REDIRECT_URI` trỏ :8080). FE không gọi.                   |
| 59  | posts         | event                 | GET    | `/v1/api/events/google/status`                                 | OK         | events.ts:32                                                                                                    |
| 60  | posts         | post                  | POST   | `/v1/api/posts`                                                | OK         | posts.ts:13                                                                                                     |
| 61  | posts         | post                  | DELETE | `/v1/api/posts/{postId}`                                       | OK         | posts.ts:29                                                                                                     |
| 62  | posts         | post                  | PUT    | `/v1/api/posts/{postId}`                                       | OK         | posts.ts:27                                                                                                     |
| 63  | posts         | comment               | GET    | `/v1/api/posts/{postId}/comments`                              | OK         | posts.ts:31                                                                                                     |
| 64  | posts         | comment               | POST   | `/v1/api/posts/{postId}/comments`                              | OK         | posts.ts:34                                                                                                     |
| 65  | posts         | comment               | DELETE | `/v1/api/posts/{postId}/comments/{commentId}`                  | OK         | posts.ts:40                                                                                                     |
| 66  | posts         | comment               | PUT    | `/v1/api/posts/{postId}/comments/{commentId}`                  | OK         | posts.ts:37                                                                                                     |
| 67  | posts         | post                  | PATCH  | `/v1/api/posts/{postId}/qna/accept-answer/{commentId}`         | CHƯA CÓ    | —                                                                                                               |
| 68  | posts         | quiz                  | POST   | `/v1/api/posts/{postId}/quiz/submit`                           | CHƯA CÓ    | —                                                                                                               |
| 69  | posts         | post-reaction         | DELETE | `/v1/api/posts/{postId}/reactions`                             | OK         | posts.ts:48                                                                                                     |
| 70  | posts         | post-reaction         | PUT    | `/v1/api/posts/{postId}/reactions`                             | OK         | posts.ts:46                                                                                                     |
| 71  | posts         | post-reaction         | GET    | `/v1/api/posts/{postId}/reactions/me`                          | OK         | posts.ts:43                                                                                                     |
| 72  | posts         | post                  | POST   | `/v1/api/posts/books`                                          | OK         | posts.ts:21                                                                                                     |
| 73  | posts         | location              | POST   | `/v1/api/posts/locations/resolve`                              | WIRE SAI   | location.ts:6 — FE `LocationResolutionResponse` thiếu field spec có: `googleMapsUrl`                            |
| 74  | reputation    | reputation            | GET    | `/v1/api/users/{userId}/reputation`                            | CHƯA CÓ    | —                                                                                                               |
| 75  | roadmap       | roadmap               | GET    | `/v1/api/roadmaps`                                             | CHƯA CÓ    | —                                                                                                               |
| 76  | roadmap       | roadmap               | POST   | `/v1/api/roadmaps`                                             | CHƯA CÓ    | —                                                                                                               |
| 77  | roadmap       | roadmap               | GET    | `/v1/api/roadmaps/{id}/nodes`                                  | CHƯA CÓ    | —                                                                                                               |
| 78  | roadmap       | roadmap               | POST   | `/v1/api/roadmaps/{id}/nodes`                                  | CHƯA CÓ    | —                                                                                                               |
| 79  | roadmap       | skill-verification    | POST   | `/v1/api/skills/approve/{progressId}`                          | CHƯA CÓ    | —                                                                                                               |
| 80  | roadmap       | skill-verification    | GET    | `/v1/api/skills/pending`                                       | CHƯA CÓ    | —                                                                                                               |
| 81  | roadmap       | skill-verification    | POST   | `/v1/api/skills/reject/{progressId}`                           | CHƯA CÓ    | —                                                                                                               |
| 82  | roadmap       | skill-verification    | POST   | `/v1/api/skills/verify`                                        | CHƯA CÓ    | —                                                                                                               |
| 83  | search        | search                | GET    | `/v1/api/search`                                               | OK         | search.ts:6                                                                                                     |
| 84  | security      | auth                  | POST   | `/v1/api/auth/forgot-password`                                 | OK         | auth.ts:61                                                                                                      |
| 85  | security      | auth                  | POST   | `/v1/api/auth/github/callback`                                 | CHƯA CÓ    | —                                                                                                               |
| 86  | security      | auth                  | GET    | `/v1/api/auth/github/url`                                      | CHƯA CÓ    | —                                                                                                               |
| 87  | security      | auth                  | POST   | `/v1/api/auth/google/callback`                                 | CHƯA CÓ    | —                                                                                                               |
| 88  | security      | auth                  | GET    | `/v1/api/auth/google/url`                                      | CHƯA CÓ    | —                                                                                                               |
| 89  | security      | auth                  | POST   | `/v1/api/auth/login`                                           | WIRE SAI   | auth.ts:42 — FE `LoginResponse` thiếu field spec có: `isAutoLinked`, `isNewUser`                                |
| 90  | security      | auth                  | POST   | `/v1/api/auth/logout`                                          | OK         | auth.ts:71                                                                                                      |
| 91  | security      | auth                  | POST   | `/v1/api/auth/magic-link`                                      | OK         | auth.ts:81                                                                                                      |
| 92  | security      | auth                  | POST   | `/v1/api/auth/magic-link/login`                                | WIRE SAI   | auth.ts:94 — FE `LoginResponse` thiếu field spec có: `isAutoLinked`, `isNewUser`                                |
| 93  | security      | auth                  | POST   | `/v1/api/auth/refresh`                                         | OK         | axios.ts:50                                                                                                     |
| 94  | security      | auth                  | POST   | `/v1/api/auth/register`                                        | OK         | auth.ts:56                                                                                                      |
| 95  | security      | auth                  | POST   | `/v1/api/auth/reset-password`                                  | OK         | auth.ts:66                                                                                                      |
| 96  | security      | auth                  | POST   | `/v1/api/auth/verify-email`                                    | OK         | auth.ts:76                                                                                                      |
| 97  | security      | profile               | PUT    | `/v1/api/profile`                                              | OK         | profile.ts:12                                                                                                   |
| 98  | security      | profile               | GET    | `/v1/api/profile/me`                                           | OK         | profile.ts:10                                                                                                   |
| 99  | security      | profile               | PUT    | `/v1/api/profile/password`                                     | OK         | profile.ts:14                                                                                                   |
| 100 | security      | profile               | PUT    | `/v1/api/profile/picture`                                      | OK         | profile.ts:19                                                                                                   |
| 101 | trending      | trending              | GET    | `/v1/api/trending`                                             | OK         | trending.ts:13                                                                                                  |
