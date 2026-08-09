# findings — `search`

BE package `com.socialapp.search` (`SearchController`, **1 endpoint**: `GET /v1/api/search`).

Viết ở **P2.8** (2026-07-28), tier C — một checkpoint cho cả 4 lớp. Không vượt trần: 1 màn
(`/search`) + ô tìm kiếm của shell, **4 component mới** (trần là 5).

---

## 1. Hình dạng thật của endpoint (đo, không suy từ tên)

`GET /v1/api/search?q=&size=` → `{ users: UserDto[], posts: PostDto[] }`. Không cursor, không
`totalHits`, không trang 2. `SearchResult<T>` (có `totalHits`/`page`/`size`) **tồn tại trong BE
nhưng không bao giờ ra tới response** — controller gọi `.getItems()` rồi vứt phần bọc đi.

| phép thử             | kết quả                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `?q=` (rỗng)         | **422** `search.q: must not be blank`                                  |
| thiếu `q`            | **400** `Missing required parameter 'q'`                               |
| `size=0` / `-1`      | **422** `search.size: must be greater than 0`                          |
| không truyền `size`  | 200, mặc định **10** (`Constants.DEFAULT_PAGINATION_SEARCH_PAGE_SIZE`) |
| `q=%`                | 200, **0 kết quả** — `SearchQuerySanitizer` escape wildcard của LIKE   |
| `q=tran` vs `q=Trần` | **cùng 3 người** — `unaccent(...)` hai phía, không dấu vẫn khớp        |

Hai điều đáng nhớ: **422 chứ không phải 400** cho lỗi validation (khác thói quen), và `size` là
**trần của TỪNG danh sách**, nên `size=20` có thể trả 20 người **và** 20 bài.

**Không có xếp hạng.** Match là substring `unaccent(...) LIKE` trên 3 bảng Postgres, không index
tìm kiếm, không scoring, không sửa lỗi chính tả. UI vì thế **không được** ngụ ý có thứ hạng: không
"kết quả hàng đầu", không điều khiển phân trang. Thứ tự section cố định (người → bài) là cách trình
bày trung thực cho một tập kết quả không xếp hạng.

**Sách không phải danh sách thứ ba.** Sách khớp thì nổi lên dưới dạng **bài viết** gắn nó, với
`book` đính kèm. Sách **không gắn post nào thì không bao giờ xuất hiện** — đo được: `t_books` có
`post_id = null` thì mất hút khỏi kết quả dù title khớp.

## 2. Yêu cầu gửi BE

### S1 — `PostDto.createdAt` là `LocalDateTime`, làm lệch giờ mọi kết quả (ĐÃ NÉ Ở FE)

`search/dto/PostDto` là **DTO `createdAt` duy nhất trong toàn bộ backend** khai `LocalDateTime`;
mọi DTO khác dùng `OffsetDateTime` và gửi kèm `Z`. Kiểm bằng grep cả `src/main/java`:

```
private LocalDateTime createdAt   → chỉ search/dto/PostDto.java
private OffsetDateTime createdAt  → bookstore, friendships, github, knowledge, … (mọi chỗ còn lại)
```

Hệ quả đo được, không phải suy đoán: bài vừa insert xong hiện **"7 giờ trước"** trên máy UTC+7.
DB lưu `timestamptz` `+00`, `OffsetDateTime.toLocalDateTime()` trả giờ tường UTC, Jackson gửi
`2026-07-27T18:24:54` **không zone**, và `new Date(...)` đọc chuỗi trần là **giờ địa phương**.

**Sửa đúng**: đổi `LocalDateTime` → `OffsetDateTime` trong `PostDto` (một từ, khớp 30+ DTO còn
lại). So sánh: `GET /notifications` trả `2026-07-27T15:45:14.362961Z` — đúng dạng.

**FE đang né**: `withAssumedUtc` trong `post-result-card.tsx` gắn `Z` khi chuỗi không có zone.
Đó là **workaround có giả định** (DB lưu UTC — đã kiểm), không phải bản sửa. BE sửa xong thì hàm
đó thành no-op (guard đã bỏ qua chuỗi có zone sẵn) và **phải xoá**.

### S2 — 6 khối details được khai nhưng không bao giờ được điền

`PostDto` khai `quizDetails`, `codeSnippetDetails`, `articleDetails`, `qnaDetails`, `pollDetails`,
`linkDetails`. `SearchService.toPostDtos` dựng DTO bằng builder chỉ set `id`, `content`,
`eventName`, các field tác giả, `visibility`, `createdAt`, `book` — **không set cái nào trong 6
cái đó**. Đo: mọi post trong response đều có đủ 6 key với giá trị `null`.

**Đây là đúng lỗi `fanOutPost` của `findings/posts.md`, ở service thứ hai.** Hệ quả UI: bài quiz /
poll / code trong kết quả chỉ hiện được chữ, không hiện được nội dung đặc thù.

FE **loại hẳn 6 key khỏi `SearchPost`** thay vì khai always-null: một key không bao giờ mang giá
trị không phải dữ liệu để component đi rẽ nhánh. BE điền vào thì thêm lại.

## 3. Quyết định FE đã chốt

1. **Kết quả là ngõ cụt, có chủ đích.** Không bấm được vào người (BE chỉ có `GET /profile/me`,
   không có endpoint profile công khai) lẫn bài (app không có route chi tiết bài). CLAUDE.md Phase 3
   nói thẳng: thiết kế theo giới hạn đó, đừng ship link 404. Ghi ở cả hai component để người sau
   không tưởng là quên.
2. **Ô tìm kiếm của shell thuộc `features/search`, không thuộc `shared/`.** "Tìm kiếm" là khái niệm
   domain; để nó trong `shared/` là mở đầu cho cái bucket toàn cục kế tiếp (§4).
3. **Submit bằng Enter, KHÔNG search-as-you-type.** Mỗi phím là một truy vấn DB (`LIKE` trên 3
   bảng, không index) và kết quả vẫn cần chỗ để hiện. Dropdown sống là **command palette**, thuộc
   P3.4. Giữ đúng hành vi bản legacy (Guardrail C).
4. **`useDebouncedValue` + `useDebouncedSearch` XOÁ HẲN, không migrate** — grep ra **0 caller**.
   Code chết thì xoá chứ không dọn sang nhà mới (Constraint #2). Ngày có search-as-you-type thì
   viết debounce theo đúng caller lúc đó.
5. **Ô tìm kiếm không tự điền lại từ URL.** Vào thẳng `/search?q=foo` thì ô vẫn rỗng — đúng như
   bản legacy. Sửa được, nhưng cần `useSearchParams` trong layout (kéo theo Suspense cho cả shell),
   nên để P3.4 làm cùng lúc dựng lại shell.

## 4. Chi tiết đáng giữ

- **Nút xoá KHÔNG truyền qua prop `suffix` của `Input`.** `Input` bọc adornment trong span
  `aria-hidden` — đúng cho icon trang trí như DS mô tả, **sai cho một control**: nó sẽ vô hình với
  screen reader mà vẫn ăn một tab stop. Nên nút được đặt tuyệt đối đè lên field, và `pr-9` chừa chỗ
  để chữ không chạy xuống dưới nó.
- **`Input` của `shared/` nay nhận `ref`** — prop thường, React 19 không cần `forwardRef` nữa. Thêm
  vì có caller thật: Escape thì blur, xoá xong thì trả focus, cả hai đều cần tay cầm vào element.
- **Nhánh 3 trạng thái viết theo bài học P2.6cd**: skeleton khi `status==='pending' &&
fetchStatus==='fetching'`, lỗi khi `status !== 'success'`, "không có kết quả" **chỉ khi**
  `status === 'success'`. Kiểu `isLoading ? … : isError ? … : empty` bỏ sót query bị park ở
  `paused` và khiến app tự khẳng định một điều chỉ server mới được phép khẳng định.
- **"Nhập gì đó" quyết bởi TỪ KHOÁ, không phải trạng thái query.** Query bị `enabled: false` nằm ở
  `pending` vĩnh viễn, đọc `isPending` sẽ hiện skeleton mãi trên ô tìm kiếm rỗng.
- **`avgRating`/`price` phải guard.** Trang legacy gọi `book.avgRating.toFixed(1)` và
  `book.price.toLocaleString()` không guard — sách chưa ai đánh giá là `null` và làm **vỡ cả danh
  sách kết quả**. Đã dựng fixture đúng ca đó (sách miễn phí, `avg_rating = null`) và đo.
- **Enter có guard `isComposing`** như `MessageComposer`: bộ gõ telex/VNI bắn Enter để chốt từ.
- Type cũ trong `lib/types` sai 3 chỗ, ghi trong bia mộ ở chính file đó: thiếu `eliteScore`, khai
  mọi field non-nullable, và bỏ 6 khối details.

**Quan sát chưa xử lý** (không thuộc domain này): `features/newsfeed/types/feed.ts` dùng
`Schemas[...][K] | null` nên value type vẫn còn `| undefined` lọt vào — cùng chỗ P2.8 phải sửa
thành `Required<Schemas[...]>[K] | null` mới compile được. Feed chưa vấp vì chưa gọi method trên
field nullable. Nên rà lại ở P3.1.

## 5. Cách verify (dựng lại được)

Dev DB sau lần reset chỉ còn **2 bài, 0 sách**, nên phải dựng fixture bằng insert thẳng
(`t_posts` + `t_books`, đúng đường đã ghi ở session-constants — **không chạm Gemini**):
1 bài thường tiếng Việt có dấu · 1 bài EVENT (`event_details.eventTitle`) · 2 bài BOOK, một sách
có giá + rating `4.5`, một sách **miễn phí và `avg_rating = null`**.

Kiểm được: 4 loại card · sách hiện inline · sách chưa đánh giá **không** hiện sao và không vỡ ·
`q=kien truc` khớp "kiến trúc" · `q=tran` khớp "Trần" · người hiện handle + `RepScore` · empty
state · **nhánh lỗi** (patch `XMLHttpRequest.prototype.open` đổi URL sang 404 rồi điều hướng
**client-side** qua chính ô tìm kiếm — reload sẽ xoá mất patch, và axios dùng XHR chứ không dùng
`fetch`) · light + dark · console sạch.

**Đã dọn**: xoá hết post/sách fixture, DB về đúng 2 post / 0 sách như trước checkpoint.
