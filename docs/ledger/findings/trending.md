# findings — `trending`

BE package `com.socialapp.trending` (`TrendingController`, **1 endpoint**: `GET /v1/api/trending`).

Viết ở **P2.9** (2026-07-28), tier C — một checkpoint cho cả 4 lớp. Không vượt trần: 1 màn
(`/trending`), **3 component mới** (`TrendingCard`, `TrendingFilters`, `TrendingList`).

**Domain duy nhất mà nội dung không do người dùng của app viết ra.** Item được crawl từ Hacker
News / dev.to / GitHub / Reddit / Medium / HBR theo lịch, Gemini phân loại vào một category, rồi
lưu. App **không tạo, không sửa, không react, không bình luận** — mỗi card là một link **rời khỏi
app**, và đó là toàn bộ mô hình tương tác.

---

## 1. Hình dạng thật của endpoint (đo, không suy từ tên)

`GET /v1/api/trending?category=&timeRange=&page=&size=` → `{ items, page, size, totalElements,
totalPages, hasNext }`. **Đây là phân trang thật**, khác `search` (không cursor, không total).

| phép thử              | kết quả                                                 |
| --------------------- | ------------------------------------------------------- |
| mặc định              | 200 · `items=10` `total=108` `pages=11` `hasNext=true`  |
| `timeRange=today`     | 200 · `total=39`                                        |
| `timeRange=month`     | 200 · `total=110`                                       |
| `category=OPENSOURCE` | 200 · `total=34`                                        |
| `category=NOPE`       | **400** `Invalid value 'NOPE' for parameter 'category'` |
| `timeRange=decade`    | **200, im lặng trả về "week"** — không phải lỗi         |
| `page=0` / `size=0`   | **400** `Invalid request parameters or payload`         |

**Bất đối xứng đáng nhớ**: `category` bind vào enum Java nên gõ sai bị từ chối; `timeRange` là
**`String` thô** đưa vào `switch` có nhánh `default` nghĩa là "week", nên gõ sai **im lặng trả về
một tuần**. Vì vậy `TrendingTimeRange` là union đóng ở phía FE — FE là chỗ **duy nhất** bắt được
lỗi đó.

**Mã lỗi validation không thống nhất giữa hai domain**: `page=0` ở đây là **400**, cùng loại vi
phạm ở `search` là **422**. Hai controller đi hai đường validation khác nhau, nên code xử lý lỗi
không được giả định một mã.

`size` mặc định 10 (`Constants.DEFAULT_PAGINATION_PAGE_SIZE`), `page` **1-based** và được echo lại
đúng như gửi lên.

## 2. Yêu cầu gửi BE

### T1 — `tags` được khai, được Gemini trả về, rồi bị vứt đi

`TrendingItemDto` có `tags`. `TrendingClassificationService` **thật sự hỏi Gemini** đúng cấu trúc
`{"category": "...", "tags": ["tag1","tag2"]}`. Nhưng `TrendingCrawlScheduler` chỉ lấy lại
**category**:

```java
TrendingCategory category = categories.get(i);
saveItem(crawled, category);        // không có tags ở đâu cả
```

`saveItem` không bao giờ `setTags`. Đo trên **toàn bảng, không lấy mẫu**:

```sql
select count(*) total, count(*) filter (where tags is null or jsonb_array_length(tags)=0) empty_tags
  from socialapp.t_trending_items;
--  total | empty_tags
--    110 |        110
```

**110/110 rỗng.** Đây là **lỗi tốn tiền**: quota Gemini đã bị tiêu để sinh ra tags rồi ném đi.

**Sửa**: cho `classify` trả về cả tags và `saveItem` ghi xuống — không đổi DTO, không đổi endpoint.

FE **loại hẳn `tags` khỏi `TrendingItem`**, đúng cách đã làm với 6 khối details của `search`: một
field không bao giờ mang giá trị thì không phải dữ liệu để component đi rẽ nhánh. Card legacy có
hàng tags điều kiện **không thể hiện ra trên bất kỳ hàng nào trong 110 hàng**.

### T2 — 3 trong 6 crawler chưa từng sinh ra dữ liệu (quan sát, chưa chắc là lỗi)

```sql
select source, count(*) from socialapp.t_trending_items group by source;
--  HACKER_NEWS 43 · GITHUB 34 · DEV_TO 33
```

`REDDIT`, `MEDIUM`, `HBR`: **0 hàng**. Có thể là bị chặn/ratelimit chứ không phải lỗi code — chưa
điều tra. Tương tự, chỉ 6/8 category xuất hiện (thiếu `EVENT`, `MINDSET`). **Không phải lý do để
cắt filter**: bộ lọc vẫn chào đủ 8 category vì crawl ngày mai có thể lấp vào.

## 3. Quyết định FE đã chốt

1. **Bộ lọc là state của component, KHÔNG phải state của URL** — khác `/search` (từ khoá nằm ở
   `?q=`). Khác biệt nằm ở việc giá trị đó để làm gì: từ khoá là thứ người ta chia sẻ và quay lại,
   còn "mã nguồn mở, tuần này" là một cách lướt mà không ai gửi link. Đưa lên URL là thêm một mối
   lo routing để đổi lấy nút share không ai xin. Muốn deep-link thì nâng lên page đúng như đã làm
   với id hội thoại của chat.
2. **Category là chip, không phải `Tabs` thứ hai.** Chín lựa chọn (kể cả "Tất cả") thì hàng tab
   hoặc phải cuộn ngang hoặc bóp nát nhãn, và không cái nào đọc ra là ngang hàng với một control
   ba mục. Chip thì xuống dòng được.
3. **Cả card là link ra ngoài**, `target="_blank"` + `rel="noopener noreferrer"` + mũi tên chéo.
   App lưu tiêu đề/tóm tắt/URL và **không có** màn đọc nội dung người khác, nên nói thẳng ra thay
   vì làm card trông như bấm được trong app.
4. **`hasNext` của payload quyết định dừng**, không dùng mẹo "trang cuối trả về ngắn" — BE tính từ
   total thật nên vẫn đúng ở đúng biên mà mẹo kia sai (trang cuối vừa đầy).
5. **`staleTime` 5 phút**: dữ liệu nguồn không thể đổi nhanh hơn lịch crawl, refetch mỗi lần focus
   chỉ tốn request để vẽ lại y hệt.
6. **Nút "Thử lại" giữ lại kèm cảnh báo**, không giấu: ở P2.6cd nút retry trên query bị React Query
   park ở `paused` **không phát request nào** và chưa giải thích được
   (`findings/notifications.md` §14). Bỏ nút đi không sửa được điều đó mà lại lấy mất hành động
   duy nhất chạy đúng trong ca lỗi thông thường.

## 4. Chi tiết đáng giữ

- **`publishedAt` ở đây là `OffsetDateTime` và có `Z`** → `useRelativeTime` dùng chung đọc đúng,
  **không cần** workaround như `features/search` (xem S1 ở `findings/search.md`). Đã ghi ngay trong
  `TrendingCard` để người sau không copy nhầm cái workaround sang đây.
- **`score` không gắn nhãn** vì mỗi nguồn hiểu một kiểu (điểm Hacker News, sao GitHub) — hiện số
  trần kèm ngọn lửa thay vì gọi nó là một trong hai.
- **`summary` null trên 46/110 hàng** (repo GitHub không có abstract để crawl) — guard là thật,
  không phải phòng xa.
- **`aria-pressed` trên chip**: đây là toggle re-query tại chỗ, và trạng thái chọn với screen reader
  chỉ còn mỗi nó — màu thì không đọc được.
- Nhánh 3 trạng thái viết theo bài học P2.6cd: skeleton **chỉ khi** `status==='pending' &&
fetchStatus==='fetching'`, lỗi khi `status !== 'success'`, empty **chỉ khi** `status==='success'`.
- Type cũ trong `lib/types` chép tay **cả hai enum** (`TrendingSource`, `TrendingCategory`) — phải
  nhớ mà đồng bộ với Java bằng tay. Bản derive từ `schema.gen.ts` hết chuyện đó.

**Extraction test sạch nhất dự án**: `features/trending` không import feature nào khác — item crawl
về không có tác giả trong hệ thống nên không có identity row, không Elite Score, không đồ thị bạn bè.
Chỉ `core/`, `shared/` và `@/lib/i18n` (nợ chung từ P2.2c-2).

## 5. Cách verify

**Không phải dựng fixture** — đây là domain duy nhất có sẵn dữ liệu thật (110 hàng từ crawler).

Đã kiểm: card đủ badge nguồn + chủ đề, score, tiêu đề kèm mũi tên, tóm tắt (có và không có), tác
giả · thời gian tương đối · **lọc category ra đúng dây**: "Tất cả" gửi **không có** tham số
`category`, chọn chip gửi `category=OPENSOURCE` — đọc từ `performance.getEntriesByType('resource')`
· lọc timeRange gửi `timeRange=today` · **infinite scroll**: 20 → **34** card đúng bằng
`totalElements` của OPENSOURCE, rồi **dừng hẳn** (không có request thứ 4) và hiện "Bạn đã xem hết"
· `rel="noopener noreferrer"` · **empty state thật** bằng category `EVENT` (0 hàng trong bảng) ·
**nhánh lỗi** hiện "Không tải được xu hướng" **chứ không phải** "chưa có nội dung" · light + dark ·
console sạch.

**Đính chính một ghi chú cũ**: `findings/newsfeed.md` (P2.5) ghi "tab ẩn thì IntersectionObserver
KHÔNG chạy". Lần này IO **có chạy** dù `document.visibilityState === 'hidden'` — cuộn bằng thao tác
cuộn thật của extension thì sentinel vẫn kích hoạt và trang 2 vẫn nạp. Nên triệu chứng ở P2.5 nhiều
khả năng do nguyên nhân khác; đừng dùng "tab đang ẩn" làm lời giải thích mặc định, hãy đo lại.

**Mẹo đo nhánh lỗi** (dùng lại từ P2.8): patch `XMLHttpRequest.prototype.open` đổi URL sang 404 rồi
**đổi bộ lọc** để tạo query key mới — điều hướng bằng `navigate` sẽ reload và xoá mất patch, và
axios dùng **XHR chứ không dùng `fetch`**.

Dev DB **không bị đụng vào** ở checkpoint này.
