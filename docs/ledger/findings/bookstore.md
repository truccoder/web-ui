# Nợ kỹ thuật & phát hiện — bookstore

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md). Yêu cầu gửi BE gom ở
[`be-requests.md`](../be-requests.md).

Mọi con số dưới đây **đo trên BE thật ngày 2026-07-28** (P2.10a), không suy từ tên. Dữ liệu đo
là 2 sách probe insert thẳng vào `t_books` (id 11 free của 9001, id 12 paid của 9002) — **đã xoá
sạch sau khi đo**, `t_books` và `t_book_reviews` trở lại 0 hàng.

## 1. Hình dạng thật của 11 endpoint

`BookController` 8 + `PaymentController` 3. `PaymentController` (`/payments`) **nằm trong package
`bookstore`** — mirror theo package, không tách `features/payments/` (CLAUDE.md §4, đã ghi ở
boundary note của ledger).

`POST /v1/api/posts/books` (`createBookPost`) **không thuộc domain này** — nó ở `PostController`,
đã tính trong 22 endpoint của `posts`. Lọc theo path `books|payment` trên spec ra **12**, đúng là
**11**.

| endpoint                               | ghi chú đo được                                                             |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `GET /books/{id}`                      | 200 · 404 nếu không có · **503 nếu MinIO chưa có bucket** (xem §3)          |
| `GET /books/author/{id}`               | 200 · **`[]` cho tác giả không tồn tại**, không phải 404 · không phân trang |
| `GET /books/{id}/download`             | 200 `{url}` · 403 nếu chưa mua · **CÓ TÁC DỤNG PHỤ GHI DB** (§4)            |
| `GET /books/{id}/preview`              | 200 `{url}` · không kiểm quyền                                              |
| `DELETE /books/{id}`                   | 200 · 403 nếu không phải tác giả                                            |
| `POST /books/{id}/reviews`             | 200 · **là UPSERT dù tên là create** (§5) · 422 khi rating sai (§2)         |
| `GET /books/{id}/reviews`              | 200 `[]` · 404 nếu sách không tồn tại (kiểm sách trước)                     |
| `GET /books/{id}/reviews/breakdown`    | 200 · sách không review trả đủ 6 số bằng 0, không phải rỗng                 |
| `POST /payments/books/{id}`            | 200 · **400 nếu sách miễn phí** ("This book is free, no payment required")  |
| `POST /payments/{transactionRef}/sync` | 200 `{transactionRef, paid}` · 404 nếu ref không tồn tại                    |
| `POST /payments/momo/webhook`          | **MoMo gọi server-to-server — FE KHÔNG gọi.** Không viết hàm API (§7)       |

Không có endpoint nào **liệt kê sách** (không `GET /books`). Đường duy nhất tới một cuốn sách là
`GET /books/author/{authorId}` hoặc qua bài viết gắn nó trong feed/search. Cùng họ giới hạn với
"không có `GET /posts`" của `posts` và "không có profile công khai".

## 2. Mã lỗi validation: bookstore trả **422**, cùng phe với `search`

Đây đúng là thứ prompt dặn phải đo chứ đừng suy — `search` trả 422, `trending` trả 400 cho cùng
loại vi phạm. Bookstore đo được:

| gửi gì                             | mã      | body                                                               |
| ---------------------------------- | ------- | ------------------------------------------------------------------ |
| `{rating: 6}`                      | **422** | `details: ["Property rating: must be less than or equal to 5"]`    |
| `{rating: 0}`                      | **422** | `details: ["Property rating: must be greater than or equal to 1"]` |
| `{feedback: "..."}` (thiếu rating) | **422** | `details: ["Property rating: must not be null"]`                   |
| `{rating: "ba"}` (sai kiểu)        | **400** | `"Malformed request body"`, `details: null`                        |
| `GET /books/abc`                   | **400** | `"Invalid value 'abc' for parameter 'bookId'"`                     |

**Ranh giới thật là bean-validation vs deserialization, không phải controller.** Vi phạm ràng
buộc (`@Min`/`@Max`/`@NotNull`) → **422 có `details` là mảng chuỗi đọc được**. Sai kiểu / JSON hỏng
→ **400, `details: null`**. Nên UI hiện lỗi cạnh field phải đọc `details` của **422**; 400 không
bao giờ nói được field nào.

## 3. `GET /books/{id}` trả **503** khi bucket MinIO chưa tồn tại — cả mặt đọc chết theo

Vấp thật lúc đo lần đầu, không phải giả định:

```
[503] GET /v1/api/books/11        {"message":"Failed to generate download URL"}
[503] GET /v1/api/books/author/9001
[503] GET /v1/api/books/12/preview
```

`ls /data` trong container `minio` → chỉ có `.minio.sys`, **không bucket nào**. MinIO bị xoá cùng
lần reset dev DB (cùng sự cố với đồ thị Neo4j, [`findings/friendships.md`](friendships.md)).

**Vì sao 503 chứ không phải URL hỏng:** `BookStorageService.getPresignedUrl` bắt mọi exception rồi
ném `StorageException`. Java SDK khi presign phải tra region của bucket → bucket không tồn tại là
ném. Mà `toResponseDto` **luôn** presign một trong hai (`downloadUrl` hoặc `previewUrl`) → **toàn
bộ DTO chết**, kể cả khi caller chỉ muốn title/price/rating. `getBooksByAuthor` map qua từng cuốn
nên **một object hỏng giết cả danh sách**.

`MinIOService` chỉ tạo bucket **lúc upload** (`bucketExists` → `makeBucket`), đường đọc không bao
giờ tạo. Nên **môi trường mới, chưa ai upload → mọi lệnh đọc sách 503**.

Cách gỡ đã dùng (giữ lại, MinIO đang trống là trạng thái mặc định sau reset):

```bash
docker run --rm --network datn-backend_backend-network --entrypoint sh minio/mc -c \
  "mc alias set m http://minio:9000 minio_admin minio_admin_password && mc mb --ignore-existing m/books m/book-covers"
```

Hai bucket này **cố ý để lại** sau khi dọn probe — xoá đi là mọi lệnh đọc sách 503 trở lại.

**Hệ quả cho FE (nhánh lỗi phải dựng, không phải lo xa):** 503 ở đây **không phải "server sập"** mà
là "một cuốn sách có object hỏng". UI không được nuốt im lặng.

## 4. `GET /books/{id}/download` là một **lệnh GHI** đội lốt GET

`BookService.getFullDownloadUrl` chạy `book.setDownloadCount(count + 1)` + `bookRepository.save`
**trước khi** trả URL. Đo: gọi 2 lần → đọc lại sách thấy `downloadCount: 0 → 2`.

→ **Bắt buộc là `useMutation`, không bao giờ `useQuery`.** Một `useQuery` sẽ **tự tăng số lượt
tải** qua những đường không ai chủ ý: refetch lúc mount khi đã stale · refetch lúc reconnect ·
refetch khi có `invalidateQueries` chạm key · và `retry: 1` của query client dùng chung phát lại
request mà BE có thể đã đếm rồi mới lỗi. (**Đính chính**: refetch-khi-focus-lại-cửa-sổ thì _không_
— `makeQueryClient` đặt `refetchOnWindowFocus: false` toàn app. Mọi đường còn lại vẫn sống.)
Cùng họ với `GET /notifications/preferences` có tác dụng phụ ghi DB
([`findings/notifications.md`](notifications.md) §8), nhưng nặng hơn vì đây là số đếm người dùng
nhìn thấy.

Hook legacy `useDownloadBook` **tình cờ đã đúng** (là mutation) nhưng comment ghi lý do khác — "hành
động một lần, không phải panel". Lý do thật là **nó ghi DB**. Bản mới ghi đúng lý do.

`GET /preview` thì **không** có tác dụng phụ → query bình thường.

## 5. `POST /books/{id}/reviews` là **UPSERT**, và tự đánh giá sách mình được

`BookController.createReview` gọi `reviewService.createOrUpdateReview` — tên endpoint nói "create",
hành vi là upsert. Đo:

```
POST {rating:4, feedback:"Đánh giá tiếng Việt có dấu"} → {"id":1, "rating":4, "createdAt":"...50.369804Z"}
POST {rating:2, feedback:"sua lai"}                    → {"id":1, "rating":2, "createdAt":"...50.369804Z"}  ← cùng id, cùng createdAt
GET  /reviews                                          → đúng 1 phần tử
```

Ba hệ quả:

- **Không có "đã đánh giá rồi" là trạng thái lỗi.** UI không cần chặn, không cần endpoint sửa
  riêng — gửi lại là sửa.
- **`createdAt` KHÔNG đổi khi sửa**, và **không có `updatedAt`** trong DTO → hiện "đánh giá lúc
  ..." sẽ là mốc lần đầu, không phải lần sửa gần nhất. Giới hạn dữ liệu, ghi để không ai tưởng lỗi.
- **Tự đánh giá sách của chính mình được** (đo: 9001 review sách 11 của chính 9001 → 200). BE không
  chặn. Không phải việc FE bịt — bịt ở client là giả vờ.

Tiếng Việt có dấu đi/về nguyên vẹn qua `fetch` trong node (`"Đánh giá tiếng Việt có dấu"`).

## 6. HAI BẪY CỦA `BookResponseDto` — đọc trước khi viết bất kỳ UI nào

### 6.1 `purchased` KHÔNG phải "tôi đọc được cuốn này"

```java
boolean purchased = !book.getIsFree() && requesterId != null
    && (book.getAuthorId().equals(requesterId) || purchaseRepository.exists...(COMPLETED));
```

Vế `!isFree` đứng đầu → **sách miễn phí LUÔN trả `purchased: false`, kể cả với chính tác giả**.
Đo thật trên sách 11 (free, tác giả là chính người gọi):

```json
{
  "isFree": true,
  "purchased": false,
  "downloadUrl": "http://localhost:9000/books/...X-Amz-Signature=..."
}
```

Component nào rẽ nhánh theo `purchased` sẽ **giấu nút Đọc trên mọi cuốn sách miễn phí**.

### 6.2 `downloadUrl` và `previewUrl` LOẠI TRỪ NHAU — và đó chính là câu trả lời

`toResponseDto` là một `if/else`: `isFree || purchased` → set `downloadUrl`, `previewUrl = null`;
ngược lại → set `previewUrl`, `downloadUrl = null`. **Đúng một trong hai khác null, không bao giờ
cả hai, không bao giờ không cái nào.** Đo trên cả hai sách probe, khớp.

→ **Luật của FE: dùng `downloadUrl != null` để quyết "đọc được toàn văn hay chỉ xem thử". KHÔNG
dùng `purchased`.** BE đã tính sẵn (miễn phí ∨ đã mua ∨ là tác giả) và gói kết quả vào đúng field
này; tính lại ở FE là chép luật lần thứ hai và sẽ lệch. `purchased` chỉ dùng đúng một việc: quyết
hiện nút **Mua** hay không, và cả khi đó vẫn phải `!isFree && !purchased`.

### 6.3 `coverImageUrl` — presigned 24h lưu thẳng vào DB ([B4](../be-requests.md#b4))

Field này **được echo raw từ cột `t_books.cover_image_url`**, không presign lúc đọc như hai field
kia. Probe insert một object key trần và API trả lại đúng chuỗi đó (`"covers/probe.png"`) — tức
FE **không thể biết chuỗi nhận được là key hay là URL**. Đường ghi thật của BE lưu presigned URL
24h vào cột này → mọi ảnh bìa chết sau 1 ngày.

Trớ trêu: javadoc của `FeedBookSummaryDto` giải thích rất kỹ vì sao **cố ý loại**
`downloadUrl`/`previewUrl` khỏi payload feed — đúng lý do presign-ngắn-hơn-cache — mà
`coverImageUrl` mắc đúng cái bẫy đó.

→ Tầng type để `coverImageUrl: string | null` và **UI phải có nhánh `onError`** hạ xuống ô
placeholder sạch (đã làm ở `book-post-summary` legacy). Không "sửa" bằng cách ghép base URL ở FE.

## 7. `POST /payments/momo/webhook` — không viết hàm API

MoMo gọi server-to-server (IPN). FE gọi vào chỉ có thể là giả mạo thanh toán. Đây là 1 trong 2
endpoint mà ledger đã ghi "mục tiêu thật là 99, không phải 101" (cùng
`GET /events/google/callback`). **Cố ý không có hàm tương ứng** — ghi ở đây để P4.7 không đếm nhầm
thành thiếu sót.

## 7b. Quyết định của tầng state (P2.10b)

- **`useDownloadBook` là mutation, `useBookPreviewUrl` là query.** Lý do ở §4 — `/download` ghi DB,
  `/preview` thì không. Hook **không** tự `window.open` như bản legacy: điều hướng là việc của màn
  hình (quy ước chung với `friendships`/`posts`: hook không toast, không navigate), và popup mở từ
  callback của promise còn phụ thuộc cửa sổ transient-activation của trình duyệt. Hook trả URL,
  P2.10c-1 quyết cách đưa cho người dùng.
- **Key gom theo tiền tố `['bookstore','book',id]`** để **một** lần invalidate sau khi đánh giá làm
  mới cả 3 thứ cùng đổi: danh sách review, breakdown, **và `avgRating`/`reviewCount` nằm trên chính
  `BookResponseDto`** (đo ở §5: một review đẩy `avgRating` 0 → 5). Tách nhánh riêng sẽ để lại điểm
  trung bình cũ nằm ngay trên danh sách review mới.
- **Không optimistic update cho review.** Server tự tính lại trung bình; đoán ở FE là hoặc hiện số
  sẽ đổi dưới tay người dùng, hoặc chép lại phép tính tổng hợp — cùng lý do đã giữ reaction chỉ
  optimistic trên `myReaction` ở `posts`.
- **Không đụng query key của `newsfeed`/`search`** dù book summary nhúng trong payload của chúng.
  Với quy ước đã chốt ở `posts` ("invalidate xuyên domain: bên compose truyền vào"), reach sang key
  của feature khác là đúng thứ CLAUDE.md §4 cấm. Hệ quả tạm: rating trong feed cũ tới khi feed tự
  refetch.
- **`useDeleteBook` dùng `removeQueries`, không `invalidateQueries`** cho nhánh của cuốn sách:
  refetch một id vừa bị xoá chỉ ra 404 và một trạng thái lỗi cho thứ người dùng vừa cố ý huỷ.
- **`useSyncPaymentStatus` là mutation dù nghe như đọc trạng thái.** `MomoService.syncPaymentStatus`
  gọi MoMo rồi chạy `applyResult` — **hoàn tất giao dịch**, ghi `gatewayTransactionNo`, `paidAt` và
  **thông báo cho tác giả**. Nó chính là đường kết thúc thanh toán khi webhook server-to-server chưa
  kịp về (webhook đua với redirect trình duyệt).
  **Poll được là bảo đảm của BE, không phải giả định của FE**: `applyResult` thoát sớm khi purchase
  đã `COMPLETED`, không ghi lại, không thông báo lại — có comment nói rõ trong code BE. Vẫn để là
  mutation chứ không phải `useQuery` + `refetchInterval` vì như thế là giao thời điểm của một lệnh
  **ghi hoàn tất thanh toán** cho chính sách refetch của React Query (mount / reconnect / retry).
  Vòng lặp có giới hạn nằm ở **P2.10d**, cạnh UI giải thích nó.

## 7c. P2.10c-1 — mặt đọc + mua (2026-07-28)

Ba component: `BookActions` (lấp slot `actions` của `BookBody`), `BookPurchaseButton`,
`BookReaderDialog`. Cộng **một primitive dùng chung mới**: `shared/components/dialog.tsx` — DS có
spec `Dialog` nhưng `shared/` chưa từng dựng, và không có primitive overlay nào khác trong dự án.
4 component ≤ trần 5.

### `react-pdf` GIỮ LẠI, nhưng worker **tự host** — chốt 2026-07-28

P2.4c-4 cắt `pdf-preview.tsx` với 3 lý do, lý do (2) là worker pdf.js lấy từ **`unpkg.com` lúc
chạy**, đặt CDN bên thứ ba vào đường đi chính của app. Ghi chú đó hoãn quyết định về trình đọc
sang "domain bookstore" — tức là đây. **User chọn: giữ trình đọc, bỏ CDN.**

```js
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
```

Bundler tự resolve khỏi `node_modules` và phát thành asset của app. **Đã verify bằng
`performance.getEntriesByType('resource')` trên trang thật**:

```
worker  → http://localhost:3000/_next/static/media/pdf.worker.min.0wghn0~9oxou6.mjs
unpkg/cdnjs/jsdelivr/cloudflare → []      (rỗng)
origin bên thứ ba duy nhất → chat.stream-io-api.com  (của app shell, đúng mong đợi)
```

Không chọn phương án bỏ react-pdf: trình đọc phân trang là **tính năng thật**, bỏ đi là hồi quy
(Guardrail C), không phải dọn dẹp.

### LỖI THẬT bắt được nhờ verify: nút Mua rơi vào nhánh sai khi tra sách hỏng

Bản đầu của `BookPurchaseButton` là `canRead → Đọc` · `isLoadingBook → spinner` · **còn lại →
Mua**. Nghĩa là khi `GET /books/{id}` **lỗi**, nó mời mua: với 404 là trả tiền cho thứ không tồn
tại, với **503** (§3 — object storage hỏng) là trả tiền cho file không ai giao được. Lỗi ≠ "chưa
mua"; lỗi nghĩa là **không biết**. Đã thêm nhánh `isError` → nút disabled `post.book.unavailable`.

### Verify trên BE + MinIO thật (route preview tạm, đã xoá)

| trạng thái                        | kết quả đo                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| sách 11 — PDF, **miễn phí**       | "Xem trước" + **"Tải xuống"** ✔ (`isFree` đủ kết luận)                                                                  |
| sách 12 — EPUB, trả phí, chưa mua | "Xem trước" + **"Mua"** ✔ (`downloadUrl` null)                                                                          |
| sách 999999 — không tồn tại       | xem mục dưới — query bị park, chưa tới nhánh `isError`                                                                  |
| trình đọc PDF                     | trang 1 render thật, "Trang 1 / 2", "Trước" disabled; bấm "Sau" → trang 2, "Sau" disabled ✔                             |
| `Dialog` vs specimen DS           | so bằng mắt với `overlays.card.html`: panel trắng bo 12px, tiêu đề 16px/600, mô tả muted, footer phải + Cancel/Delete ✔ |
| dark mode                         | panel + footer đổi theo `data-theme="dark"`; trang PDF vẫn trắng (đúng — đó là tài liệu) ✔                              |

Dữ liệu probe (2 sách + 1 PDF thật trong MinIO) **đã dọn sạch**; `t_books` về 0 hàng, object
`books/probe-free.pdf` đã xoá. **Hai bucket `books` + `book-covers` cố ý giữ** (§3).

### Query bị park ở `paused` — bắt được ở đây, gốc rễ ghi ở notifications §14

Nhánh sách-không-tồn-tại **không hiện được nút disabled** vì query không bao giờ tới `error`:

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

Đây chính là nợ "chưa giải thích được" ở [`findings/notifications.md`](notifications.md) §14 —
lần này **tái hiện ổn định** và xác định được cơ chế: retry sau lần hỏng đầu bị park, và
`dispatchEvent(new Event('online'))` thả nó ra → query đi tiếp tới `status:'error'`. Chi tiết đầy
đủ ở §14 đã cập nhật. **Cách sửa (`networkMode:'always'` ở `core/query/client.ts`) là hạ tầng dùng
chung → checkpoint riêng, KHÔNG sửa trong P2.10.** Nhánh `isError` của `BookPurchaseButton` viết
đúng và sẽ sống dậy khi hạ tầng được sửa.

## 7d. P2.10c-2 — mặt đánh giá (2026-07-28)

Bốn component: `StarRating` (hiển thị, fill theo phân số) · `BookRatingSummary` · `BookReviewList`
· `BookReviewForm`. 4 ≤ trần 5. Bộ chọn sao **không tách thành component riêng** — nó là chi tiết
bên trong của form, tách ra chỉ để đếm cho đủ là chia nhỏ giả tạo.

Thêm `getErrorDetails` vào `shared/lib/api-error.ts` (xem dưới) — domain-agnostic nên đúng chỗ.

### `getErrorDetails`: vì sao `getErrorMessage` không đủ

Đo ở §2: vi phạm bean-validation trả **422** với `message` là chuỗi chung vô dụng _"Invalid request
parameters or payload"_, còn phần đáng hiện nằm ở `details`. Dùng `getErrorMessage` cho 422 là in
đúng chuỗi vô dụng đó ra cạnh ô nhập.

**Verify bằng 422 THẬT**, không giả lập response: patch `XMLHttpRequest.prototype.send` đổi body
của đúng request POST `/reviews` thành `{"rating":6}` rồi bấm Gửi (patch `window.fetch` **vô
dụng** — axios đi bằng XHR). Kết quả hiện trên form, nguyên văn:

```
Property rating: must be less than or equal to 5
```

`details` rỗng (trường hợp 400 body hỏng) thì rơi về `getErrorMessage` — vì 400 **không bao giờ**
chỉ được ra field nào.

### Form là MỘT, vì endpoint là upsert

Không có nhánh "đã đánh giá rồi", không có mutation sửa riêng. **Không pre-fill đánh giá cũ**:
`GET /reviews` chỉ trả `userId`, FE không có đường biết cái nào là của mình (`/profile/me` là lệnh
gọi của domain security, và đoán sai thì hiện chữ của người khác trong ô của mình). Gửi lại vẫn
ghi đè đúng; chỉ thiếu pre-fill. Mở lại khi BE có "review của tôi cho sách này".

### `BookRatingSummary` tự tính trung bình từ histogram, KHÔNG đọc `Book.avgRating`

Vì component chỉ nhận `bookId`, kéo cả `GET /books/{id}` về chỉ để lấy một số sẽ **thừa hưởng
luôn bẫy 503** của §3 — một lỗi ký URL sẽ xoá trắng phần đánh giá của cuốn sách mà đánh giá của
nó hoàn toàn bình thường. Endpoint breakdown không đụng storage.

### Verify chạy thật trên BE (route preview tạm, đã xoá)

Fixture: sách 11 với 3 review (5 · 4 không feedback · 2), sách 12 không review.

| việc                                       | kết quả đo                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| trung bình + histogram                     | **3.7** · "3 đánh giá" · 5:1 4:1 3:0 2:1 1:0 ✔                                                                                                                                 |
| review không có feedback                   | chỉ hiện sao, không hiện dòng trống ✔                                                                                                                                          |
| 422 thật (rating 6)                        | `Property rating: must be less than or equal to 5` hiện cạnh field ✔                                                                                                           |
| gửi review thật (3 sao, tiếng Việt có dấu) | **một lần invalidate `book(bookId)` làm mới cả 3**: trung bình 3.7 → **3.5**, "3 đánh giá" → **4 đánh giá**, histogram mọc cột 3 sao, review mới lên đầu list, ô nhập tự xoá ✔ |
| DB                                         | `select ... where user_id=9001` → `3                                                                                                                                           | Đánh giá thật từ P2.10c-2` — UTF-8 nguyên vẹn ✔ |
| sách không review                          | summary và list đều nói "Chưa có đánh giá nào" ✔                                                                                                                               |
| dark mode                                  | sao đầy/rỗng, thanh histogram, textarea đều đảo theo token ✔                                                                                                                   |

**Đây cũng là lần chạy thật đầu tiên chứng minh quyết định gom key ở P2.10b** (`detail` + `reviews`

- `breakdown` chung tiền tố `['bookstore','book',id]`) — thứ mà báo cáo P2.10b đã nói rõ là _chưa_
  verify runtime.

Dữ liệu probe đã dọn sạch: `t_books` và `t_book_reviews` về 0 hàng.

### Lưu ý cho P2.10d

Đặt `BookRatingSummary` **và** `BookReviewList` cạnh nhau trên một cuốn sách chưa có đánh giá sẽ
hiện **hai** lần "Chưa có đánh giá nào" (thấy trên route preview). Cả hai đều đúng khi đứng một
mình; việc của `d` là chỉ dựng một trong hai cho trạng thái rỗng.

## 8. Cách tách checkpoint (công bố ở P2.10a, trước khi viết code)

11 endpoint **< trần 12** của lớp data/state → `a` và `b` mỗi lớp một checkpoint, không tách thêm.
Lớp UI trần **2 màn hoặc 5 component mới** nên phải tách:

| checkpoint   | nội dung                                                                                                                                                                                                                        | đếm theo trần     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **P2.10a**   | `types/` + `api/` — 11 endpoint (10 hàm + webhook cố ý không có)                                                                                                                                                                | 11 ≤ 12 ✔         |
| **P2.10b**   | `hooks/` trên tầng api                                                                                                                                                                                                          | 11 ≤ 12 ✔         |
| **P2.10c-1** | mặt **đọc + mua**: `BookActions` (slot của feed) · `BookPurchasePanel` · `BookReaderDialog`                                                                                                                                     | 3 component ≤ 5 ✔ |
| **P2.10c-2** | mặt **đánh giá**: `BookRatingSummary` (breakdown) · `BookReviewList` · `BookReviewForm`                                                                                                                                         | 3 component ≤ 5 ✔ |
| **P2.10d**   | wiring + xoá legacy: `/newsfeed` bỏ prop `renderBookActions` · dựng lại `/payment/success` bằng feature · xoá 2 file cầu tạm + `lib/api/books.ts` + `lib/api/payments.ts` + `lib/hooks/use-books.ts` + `use-payments.ts` + type | 1 màn ≤ 2 ✔       |

**Vì sao `/payment/success` nằm ở `d` chứ không ở `c`:** nó là một **route đã tồn tại** thuộc
domain bookstore, nên dựng lại nó chính là công việc rewire của Guardrail C, không phải dựng
component mới. `d` vì thế có 1 màn — vẫn dưới trần 2 màn của lớp wiring.

**Cầu tạm xoá ở `d`, không sớm hơn (Guardrail B).**
`src/components/posts/book-post-actions.tsx` + `book-reader-dialog.tsx` chỉ được xoá **sau khi**
`features/bookstore` đã dựng xong và build-verified. `/newsfeed` truyền cầu tạm vào qua render prop
`renderBookActions` — `features/newsfeed` **không** import nó (nếu import thì đó là legacy path nằm
trong feature, hỏng extraction test §4). `d` đổi prop sang component của `features/bookstore` rồi
mới bỏ prop.
