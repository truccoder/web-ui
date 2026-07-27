# findings — `notifications`

Nợ kỹ thuật, cạm bẫy và quyết định đã chốt của domain `notifications`
(BE package `com.socialapp.notifications`, `NotificationController`, 6 endpoint).
Đọc file này **trước khi** làm P2.6cd.

Mở lần đầu ở **P2.6ab** (2026-07-27). Mọi mục dưới đây đã verify bằng đọc Java + smoke test
6/6 endpoint với seed user 9001, không suy từ tên endpoint.

---

## 1. BE KHÔNG có realtime — polling là đường duy nhất

Grep toàn bộ `DATN-backend/src/main/java` cho `WebSocketConfig`, `@EnableWebSocket`,
`@EnableWebSocketMessageBroker`, `SseEmitter`, `text/event-stream` → **không có kết quả nào**.
`NotificationService.send` là `@Async`: ghi Postgres + (tuỳ preference) gọi OneSignal / SMTP.
Không có gì đẩy về client.

→ `useUnreadNotificationCount` poll `refetchInterval: 30_000` (giữ nguyên con số của legacy).
→ **Đừng thiết kế socket client** cho domain này ở P2.6cd. "Realtime notification" là việc của BE
trước, không phải việc FE.

## 2. Phân trang lệch base: request 1-based, response 0-based

```java
@RequestParam(defaultValue = "1") @Positive int page   // controller
PageRequest.of(page - 1, size)                          // service
```

Đã verify: `?page=1` trả `"number": 0`; `?page=0` trả **400** (không phải trang đầu).
→ cursor của infinite query là `lastPage.number + 2`, **không phải `+ 1`**. Comment đã nằm cạnh
code ở `hooks/use-notification.ts`; đừng "sửa" thành `+1`.

Khác `newsfeed`: endpoint này là query DB thật, có `totalElements`/`totalPages`/`last` đáng tin —
không phải kiểu "hỏi tới khi `hasMore` false" của feed đọc Redis.

## 3. Spec khai sai `sort` của `Page<T>` — đã né, không sửa spec

`schema.gen.ts` khai `PageNotificationResponseDto.sort?: SortObject[]` (mảng), nhưng wire thật trả
**object**: `"sort":{"empty":true,"sorted":false,"unsorted":true}`. Đây là springdoc mô tả sai
kiểu serialize của `PageImpl`, không phải drift.

→ `NotificationPage` **`Pick` đúng 7 field** và bỏ hẳn `pageable` + `sort`. Ai cần sort phía FE
thì đọc lại mục này trước, đừng tin type sinh ra.

Cũng vì `Pick` chứ không `Omit`: `Pick` với key không tồn tại là **lỗi compile**, `Omit` thì im
lặng. Đó là chỗ bắt drift của file này.

## 4. Không có `Page<T>` dùng chung — chốt ở P2.6ab

Legacy có `lib/types/index.ts: interface Page<T>` dùng chung cho moderation + notifications +
social. Đó đúng là kiểu bucket xuyên domain mà CLAUDE.md §4 cấm. Generator đã sinh sẵn một schema
`Page<Dto>` cụ thể cho từng DTO (`PageNotificationResponseDto`, `PagePostModerationDetailDto`…),
nên **mỗi feature derive envelope của riêng nó**. P2.15 (moderation) làm y hệt từ
`PagePostModerationDetailDto`; đừng "gộp lại cho DRY" — gộp là dựng lại bucket.

## 5. Preference: shape legacy SAI, đã sửa (đóng dòng P0.3)

`ledger/legacy-inventory.md` mục "Lệch shape đã biết" ghi FE khai
`NotificationPreference.id: number` và thiếu `updatedAt`. Verify trên wire:

```json
{
  "userId": 9001,
  "pushEnabled": true,
  "emailEnabled": true,
  "onesignalPlayerId": null,
  "emailFrequency": "INSTANT",
  "mutedTypes": [],
  "updatedAt": "2026-07-25T08:05:25.794624Z"
}
```

**Không có `id`** (`@Id private Integer userId`), **có `updatedAt`** (`@UpdateTimestamp`).
`types/preference.ts` derive từ `schema.gen.ts` nên đã đúng. Đừng port lại type cũ.

`onesignalPlayerId: null` trên wire cũng là bằng chứng trực tiếp cho luật `| null` chứ không
`?:`: Jackson `ALWAYS` → **key có mặt, giá trị null**.

## 6. `emailFrequency` là setting CHẾT — phải công bố ở P2.6cd

Lưu được, echo lại được, và **không có gì đọc nó**. Không `@Scheduled` nào trong BE nhắc tới
`EmailFrequency` (5 scheduler đang có: github sync, post scoring, reputation reconcile, token
cleanup, trending crawl), và `shouldSendEmail` chỉ kiểm `emailEnabled`.

→ `DAILY_DIGEST` / `WEEKLY_DIGEST` không tồn tại; **`NONE` vẫn gửi mail ngay**.
→ P2.6cd: hoặc **cắt** control này (ghi DS deviation), hoặc render kèm nhãn nói rõ chưa có hiệu
lực. **Cấm** render một select trông như đang hoạt động. Đây là quyết định phải công bố ở đầu
bước cd.

## 7. `markAsRead` no-op im lặng — đừng optimistic update ẩu

```java
notificationRepository.findById(id).ifPresent(n -> { if (n.getRecipientId().equals(userId)) {...} });
```

Id không tồn tại → **200**. Notification của người khác → **200**. Đã verify: `POST /999999/read`
trả 200. Không có 404, không có 403.

→ hook hiện **invalidate** chứ không optimistic: lật cờ lạc quan sẽ hiển thị vĩnh viễn một thứ
sai mỗi khi lệnh ghi không ăn. Nếu P2.6cd thấy nhấp nháy thì thêm optimistic **kèm rollback
`onError`**, đừng chỉ xoá comment đi.

## 8. `GET /preferences` có tác dụng phụ ghi DB

`getPreference` → `getOrCreatePreference` → `INSERT` hàng mặc định nếu chưa có (push on, email on,
`INSTANT`, `mutedTypes` rỗng). Nên: **không bao giờ 404**, và **không có trạng thái "chưa cấu
hình"** cho UI phải xử lý. Một cú GET đầu tiên vừa đọc vừa tạo state.

## 9. 4/11 `NotificationType` không có nơi phát

Grep `NotificationType.` ngoài package notifications:

| type              | nơi phát              |
| ----------------- | --------------------- |
| `POST_LIKED`      | `PostReactionService` |
| `POST_COMMENTED`  | `CommentService`      |
| `POST_TAGGED`     | `NewsfeedService`     |
| `FRIEND_REQUEST`  | `FriendshipService`   |
| `FRIEND_ACCEPTED` | `FriendshipService`   |
| `BOOK_REVIEW`     | `BookReviewService`   |
| `BOOK_PURCHASED`  | `MomoService`         |
| `POST_SHARED`     | **không ai phát**     |
| `EVENT_RSVP`      | **không ai phát**     |
| `EVENT_REMINDER`  | **không ai phát**     |
| `SYSTEM`          | **không ai phát**     |

Union giữ đủ 11 (wire chở được), nhưng UI map cả 11 sang icon + copy là viết 4 nhánh không
fixture nào chạy tới. P2.6cd nên có nhánh fallback thay vì 11 case đầy đủ.

`referenceType` chỉ có 3 giá trị thật: `"POST"`, `"BOOK"`, `"FRIEND_REQUEST"` (cột free-form
`VARCHAR(50)`, type FE để `string | null`). Đây là thứ P2.6cd dùng để deep-link.

## 10. `mutedTypes`: response lỏng, request chặt — cố ý bất đối xứng

Cột `jsonb` free-form, `updatePreference` lưu nguyên list không validate, `isTypeMuted` so bằng
`List.contains(type.name())` → chuỗi rác chỉ đơn giản không khớp.

→ response khai `string[]` (đúng thứ BE bảo đảm), request khai `NotificationType[]` (siết phía
mình kiểm soát). Đừng "thống nhất" hai bên.

Getter viết tay `return mutedTypes == null ? List.of() : ...` → **field này không bao giờ null**,
mảng rỗng là cách biểu diễn "không mute gì".

## 11. `PUT /preferences` là partial update dù là `PUT`

Mọi field bọc `Objects.nonNull(...)`. Verify: gửi `{"emailEnabled":false}` → `pushEnabled` giữ
`true`, `updatedAt` đổi. **Không có cách nào set một field về null**; gửi `null` tường minh
không phân biệt được với bỏ trống.

→ đó là lý do `UpdatePreferenceInput` dùng `?:` — ngoại lệ duy nhất của luật cấm `?:` trong
feature này, vì luật đó nói về **response**, còn đây là **request**.
→ hook `setQueryData` từ response **và** invalidate: response là state sau ghi có thẩm quyền
(kể cả `updatedAt`), nhưng vì ghi là partial nên vẫn cần hội tụ lại.

## 12. Push cần OneSignal — local chưa cấu hình

`application.yml`: `onesignal.app-id: ${ONESIGNAL_APP_ID:}` — **rỗng ở local**, cùng loại nợ với
Google Calendar. `shouldSendPush` còn đòi `onesignalPlayerId != null`, mà field đó null cho mọi
user cho tới khi có browser đăng ký push thật.

→ P2.6cd **không verify end-to-end được** nhánh push. Toggle "push notifications" chỉ lưu được
preference. Ghi rõ giới hạn này trong report, đừng báo là đã verify.

---

## Quyết định còn treo cho P2.6cd

1. **Đặt surface ở đâu.** Chuông thông báo thuộc **app shell (P3.4)**; panel preference thuộc một
   mặt settings chưa tồn tại. **Công bố cách đặt ở ĐẦU bước cd**, trước khi viết component đầu
   tiên — không quyết giữa chừng.
2. **`emailFrequency`**: cắt hay render kèm nhãn (mục 6).
3. **Legacy chưa xoá** (Guardrail B, đúng như dự kiến): `src/lib/api/notifications.ts` +
   `src/lib/hooks/use-notifications.ts` vẫn còn ở P2.6ab vì domain này **0 UI** → không có
   consumer nào để rewire, mà xoá trước khi có consumer là mass-delete. **P2.6cd xoá cả hai.**
   Ngoài chúng, `lib/types/index.ts` còn `NotificationResponse` / `NotificationPreference` /
   `UpdatePreferenceRequest` / `UnreadCountResponse` — xoá cùng đợt; `Page<T>` thì **không**,
   `lib/api/moderation.ts` và `lib/api/social.ts` vẫn dùng (chết ở P2.15 / khi chốt số phận
   `social`).

## Trạng thái dev DB sau P2.6ab

Smoke test đã đổi state rồi **khôi phục**: 3 notification của 9001 (id 1, 2, 13 — đều
`FRIEND_REQUEST` sinh ra từ luồng friendships thật) bị `read-all` đánh dấu đã đọc, đã
`update socialapp.t_notifications set is_read = false where recipient_id = 9001;` → `count` về
lại 3. Preference `emailEnabled` bị lật false rồi trả về true qua chính API.
Chỉ `updated_at` của hàng preference là không hoàn nguyên được (`@UpdateTimestamp`) — vô hại.
