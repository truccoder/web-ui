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

## Quyết định đã chốt ở P2.6cd (ba câu hỏi treo từ ab, đều đã trả lời)

1. **Surface: route mới `/notifications`**, domain chủ là `notifications`, không domain nào góp
   mặt. Không rewire trang nào vì không trang nào giữ chức năng của domain này. **Chuông + badge
   KHÔNG dựng** — thuộc app shell, P3.4; dựng trước một component chưa có shell để gắn là đúng
   thứ CLAUDE.md §Phase 1.3 cấm. `unread-count` lấy consumer ở header của chính trang này, nên
   không endpoint nào phải chờ P3.4.
2. **`emailFrequency`: CẮT.** DS deviation #20. Nhãn "chưa có hiệu lực" vẫn là mời người dùng
   chọn rồi lưu một giá trị nói dối. `pushEnabled`/`emailEnabled` thì giữ — cả hai được
   `shouldSendPush`/`shouldSendEmail` đọc thật.
3. **Legacy đã xoá** (Guardrail B thoả: có consumer thật rồi mới xoá): `lib/api/notifications.ts`,
   `lib/hooks/use-notifications.ts`, 2 dòng barrel, và khối `// ─── Notifications ───` trong
   `lib/types/index.ts` (7 type). **`Page<T>` giữ lại** — `lib/api/moderation.ts` và
   `lib/api/social.ts` vẫn dùng (chết ở P2.15 / khi chốt số phận `social`).

## 13. Bẫy `isError` không bắt hết trạng thái hỏng — lỗi thật, bắt được khi verify

Nhánh render quen thuộc `isLoading ? skeleton : isError ? error : empty` **có lỗ**. React Query
có trạng thái `status: 'pending'` + `fetchStatus: 'paused'`, trong đó **`isLoading` false và
`isError` cũng false** → rơi thẳng vào nhánh empty. Đo được tại chỗ khi verify P2.6cd (gắn
`data-debug` tạm vào DOM): request list đang hỏng mà UI báo **"Chưa có thông báo nào"** — tức
app tự bịa ra kết luận "bạn không có thông báo nào" trong khi nó còn chưa hỏi được.

→ `NotificationList` đổi sang: skeleton khi `isPending && fetchStatus === 'fetching'`; error khi
`status !== 'success'`; empty **chỉ khi** `status === 'success'`. "Không có gì" là khẳng định chỉ
server mới được phép đưa ra.

→ **`features/newsfeed/components/newsfeed.tsx` có ĐÚNG cùng lỗ này** (`isLoading` → `isError` →
empty). Chưa sửa ở checkpoint này vì thuộc domain khác; **sửa ở P3.1** khi assemble `/newsfeed`.
Triệu chứng sẽ là "Chưa có bài viết nào" trong khi feed thực ra không tải được.

## 14. ~~CHƯA GIẢI THÍCH ĐƯỢC~~ — ĐÃ TÁI HIỆN VÀ XÁC ĐỊNH ĐƯỢC CƠ CHẾ (2026-07-28, P2.10c-1)

**Không còn là bí ẩn.** Tái hiện được **ổn định, trên mọi lần tải trang**, ở một domain khác
(`bookstore`) bằng một query đơn giản trỏ vào `GET /v1/api/books/999999` (404 thật, xem
[`findings/bookstore.md`](bookstore.md)). Đo bằng cách render thẳng state của query ra màn hình:

```json
{
  "status": "pending",
  "fetchStatus": "paused",
  "isPending": true,
  "isError": false,
  "failureCount": 1,
  "error": null
}
```

**Cơ chế**: query **thất bại lần đầu** (404 về tới nơi, `failureCount` lên 1), rồi lần **retry**
bị React Query **park lại** thay vì chạy → query đứng vĩnh viễn ở `pending`/`paused`. Đợi 44 giây
vẫn y nguyên, và chỉ có **đúng 1** request rời trình duyệt.

**Bằng chứng quyết định** (khác kết quả ghi ở lần đo cũ — lần này gỡ được):

```js
window.dispatchEvent(new Event('online'));
// → fetchStatus: 'paused'  →  'fetching'   (sau ~2s)
// → status: 'error', isError: true, failureCount: 2, error: "Request failed with status code 404"
```

Tức là **retry bị treo, và một sự kiện `online` thả nó ra**. `navigator.onLine` vẫn trả `true`
suốt quá trình, nên đây là trạng thái nội bộ của `onlineManager` chứ không phải trạng thái thật
của máy — cũng là lý do lần đo trước tưởng đã loại trừ giả thuyết này.

**Ba hệ quả, tất cả đều là lỗi thật chứ không phải nhiễu môi trường:**

1. **`isError` KHÔNG BAO GIỜ true** cho một query đã hỏng → đúng cái lỗ đã ghi ở §13 và đang còn
   nợ ở `features/newsfeed/components/newsfeed.tsx`. Nhánh lỗi không bao giờ chạy tới.
2. **Nút "Thử lại" không phát request** vì `refetch()` trên query paused cũng bị park.
3. **UI đứng ở trạng thái loading vĩnh viễn.** Bắt được ở P2.10c-1: `BookPurchaseButton` với một
   sách 404 giữ nguyên nút spinner disabled mãi mãi.

**Cách sửa vẫn như đề xuất cũ, giờ có cơ sở**: `networkMode: 'always'` ở
`core/query/client.ts` — query hỏng sẽ đi thẳng tới `error` thay vì bị park, và ba hệ quả trên
biến mất cùng lúc. **Vẫn là thay đổi hạ tầng dùng chung cho mọi domain → checkpoint riêng, không
nhét vào một checkpoint domain.** Ghi nợ này lên đầu hàng đợi P3.1.

Ghi chú cũ giữ nguyên bên dưới để đối chiếu (phần "chưa xác định được" nay đã có lời giải):

### Ghi chú gốc (P2.6cd)

Đo hai lần, hai kiểu lỗi khác nhau (path 500 và `page=0` → 400 trên đúng endpoint thật): sau khi
list vào trạng thái lỗi, bấm "Thử lại" → `refetch()` chạy nhưng **0 request rời trình duyệt**
(đọc network sau khi clear, rỗng hoàn toàn). Dispatch thủ công `new Event('online')` cũng không
gỡ được.

Khớp với việc React Query đang giữ query ở `fetchStatus: 'paused'` (đo được ở mục 13) —
`networkMode: 'online'` mặc định thì query paused sẽ không fetch, kể cả khi gọi `refetch()` tay.
Vì sao RQ cho là offline thì **chưa xác định được**: `navigator.onLine` trả `true`, và CORS trên
response 500/400 có đủ header (kiểm bằng curl với `Origin`).

**Đã xác nhận app hồi phục**: reload trang (không patch) thì list tải lại đủ 3 dòng. Trạng thái
parked chỉ sống trong phiên đó.

Chưa kết luận đây là lỗi của FE hay của môi trường automation. **Việc cần làm trước khi tin nút
này**: bấm "Thử lại" bằng tay trên một lỗi thật (tắt BE rồi bật lại), và nếu tái hiện thì cân
nhắc `networkMode: 'always'` cho query client ở `core/query/client.ts` — nhưng đó là đổi hạ tầng
dùng chung cho mọi domain, không phải quyết định của một checkpoint domain.

## 15. Deep-link: chỉ 2 trong 11 loại đi được đâu đó

`referenceType` có 3 giá trị (`POST`, `BOOK`, `FRIEND_REQUEST`) nhưng app **không có route trang
bài viết đơn lẻ và không có route chi tiết sách** — feed là nơi duy nhất bài viết được render, mà
feed phân trang từ Redis nên không nhảy tới một mục được. Làm link `/posts/{id}` ở đây là ship
một link 404, đúng thứ đã bị loại một lần cho profile (CLAUDE.md Phase 3.1).

→ chỉ `FRIEND_REQUEST` → `/friends/requests` và `FRIEND_ACCEPTED` → `/friends/all` là link thật.
Link theo **`type`** chứ không theo `referenceType`: lời mời đã được chấp nhận thì không còn nằm
ở màn requests nữa. Dòng không link được vẫn bấm được (để đánh dấu đã đọc) nếu chưa đọc, và là
`<div>` trơ nếu đã đọc — không phải `<button disabled>`, vì nó không còn là control.

Mở được trang bài viết / trang sách ở P2.10 hay P3.x thì quay lại nới `hrefFor`.

## Trạng thái dev DB sau P2.6cd

Verify bằng trình duyệt đã đổi state rồi **khôi phục hết**: 3 notification về `is_read=false`,
`muted_types` về `[]` (lúc verify có mute `POST_LIKED` qua UI thật), `push_enabled`/`email_enabled`
về `true`. Chỉ `updated_at` không hoàn nguyên được (`@UpdateTimestamp`) — vô hại.

## Trạng thái dev DB sau P2.6ab

Smoke test đã đổi state rồi **khôi phục**: 3 notification của 9001 (id 1, 2, 13 — đều
`FRIEND_REQUEST` sinh ra từ luồng friendships thật) bị `read-all` đánh dấu đã đọc, đã
`update socialapp.t_notifications set is_read = false where recipient_id = 9001;` → `count` về
lại 3. Preference `emailEnabled` bị lật false rồi trả về true qua chính API.
Chỉ `updated_at` của hàng preference là không hoàn nguyên được (`@UpdateTimestamp`) — vô hại.
