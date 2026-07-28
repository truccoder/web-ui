# Yêu cầu gửi Backend — bản gom

Trước đây mỗi phát hiện cần BE sửa nằm rải trong `findings/<domain>.md` của domain bắt được nó,
nên BE không có **một** chỗ để nhìn. File này gom lại. Tiền lệ đã chạy trơn: **R1–R8** của
`chat` (xem [mục "Đã sửa xong"](#đã-sửa-xong--tiền-lệ-r1r8-của-chat) cuối file).

**File này KHÔNG chép lại nội dung findings** — sổ cái tách file là có chủ đích (CLAUDE.md §3).
Mỗi mục ở đây là: vấn đề · mức chặn · **bằng chứng đo được** · sửa ở đâu · "xong khi". Bối cảnh
đầy đủ, các phương án đã cân nhắc và những gì FE đã né nằm ở link ngược về findings gốc.

Mọi con số dưới đây **đo lại ngày 2026-07-28** trên dev DB, trừ chỗ ghi rõ ngày khác.

| mức chặn       | nghĩa là                                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| **CHẶN**       | có lỗ bảo mật, mất dữ liệu người dùng, hoặc tốn tiền thật. Sửa trước.           |
| **CAO**        | tính năng FE đã dựng xong nhưng không chạy được vì thiếu dữ liệu từ BE.         |
| **TRUNG BÌNH** | sai/thiếu nhưng FE né được, và bản né phải gỡ khi BE sửa.                       |
| **THẤP**       | giới hạn đã biết, hoặc quan sát chưa kết luận. Ghi để không ai "phát hiện lại". |

---

## Tổng quan

| id          | vấn đề                                                              | mức            | domain        |
| ----------- | ------------------------------------------------------------------- | -------------- | ------------- |
| [B1](#b1)   | OAuth `state` = user id trần trên endpoint `permitAll`              | **CHẶN**       | posts         |
| [B2](#b2)   | `fanOutPost` không copy 6 khối details → **sửa bài là mất dữ liệu** | **CHẶN**       | posts         |
| [B3](#b3)   | `tags` Gemini trả về rồi bị vứt → **tốn quota**                     | **CHẶN**       | trending      |
| [B4](#b4)   | `coverImageUrl` presigned 24h lưu thẳng vào `t_books`               | **CHẶN**       | bookstore     |
| [B5](#b5)   | Đáp án quiz nằm sẵn trong payload feed                              | **CHẶN**       | posts         |
| [B6](#b6)   | Seed Neo4j không bao giờ chạy → mọi máy dev thấy bạn bè rỗng        | **CAO**        | friendships   |
| [B7](#b7)   | `likeCount` / `commentCount` trong feed vĩnh viễn 0                 | **CAO**        | posts         |
| [B8](#b8)   | `SearchService.toPostDtos` không điền 6 khối details (= S2)         | **CAO**        | search        |
| [B9](#b9)   | `search/dto/PostDto.createdAt` là `LocalDateTime` (= S1)            | **TRUNG BÌNH** | search        |
| [B10](#b10) | `acceptAnswer` không bao giờ set `isResolved`                       | **TRUNG BÌNH** | posts         |
| [B11](#b11) | File rác nằm lại MinIO khi tạo sách hỏng                            | **TRUNG BÌNH** | bookstore     |
| [B12](#b12) | ICS thiếu `UID` + `DTSTAMP` (RFC 5545 bắt buộc)                     | **THẤP**       | posts         |
| [B13](#b13) | `/attendees` trả thẳng JPA entity, không lọc trạng thái             | **THẤP**       | posts         |
| [B14](#b14) | 3/6 crawler chưa từng sinh dữ liệu (= T2)                           | **THẤP**       | trending      |
| [B15](#b15) | Reputation thiếu `currentLevelMin`; feed/search thiếu `levelName`   | **THẤP**       | reputation    |
| [B16](#b16) | 4/11 `NotificationType` không có nơi phát                           | **THẤP**       | notifications |
| [B17](#b17) | Không có realtime nào (không WebSocket, không SSE)                  | **THẤP**       | notifications |
| [B18](#b18) | `externalLinks` do Gemini sinh ra bị vứt khi lưu giải thích         | **CHẶN**       | knowledge     |

---

## CHẶN

### B1 — OAuth `state` là USER ID trần trên endpoint `permitAll` (lỗ chiếm quyền) {#b1}

> gốc: [`findings/posts.md`](findings/posts.md) — mục "LỖI BẢO MẬT BE: OAuth `state` là USER ID trần"

**Bằng chứng.** `GoogleCalendarService.getAuthorizationUrl(Integer userId)` đặt
`state = String.valueOf(userId)`. `/v1/api/events/google/callback` nằm trong danh sách
`permitAll` của `SecurityConfig`, và handler tin `state` là tài khoản để gắn token vào
(`Integer.parseInt(state)`). Không có nonce, không ràng buộc phiên, không kiểm chữ ký.

**Hệ quả.** Bất kỳ ai gọi callback với `state=<id nạn nhân>` và `code` OAuth **của mình** sẽ gắn
Google Calendar của mình vào tài khoản người khác. Endpoint public nên không cần đăng nhập.

**Sửa ở đâu.** `posts/service/GoogleCalendarService.java` (sinh state) +
`security/config/SecurityConfig.java` (nếu chuyển callback ra khỏi `permitAll`).
`state` phải là **nonce ngẫu nhiên gắn với phiên**, tra ngược ra userId ở server, dùng một lần,
có hạn.

**FE không vá được** — FE tự sinh `state` thì BE bỏ qua giá trị đó. Đừng chờ FE.

**Xong khi.** Gọi callback với `state` là một số nguyên đoán được (vd `9001`) mà **không** qua
luồng authorize hợp lệ → bị từ chối. Luồng nối lịch thật vẫn chạy hết được.
_Lưu ý:_ luồng E2E **chưa verify được ở local** vì `client_id` rỗng (`authUrl` đo được không có
client id) — cần cấu hình một OAuth client dev để kiểm nhánh này.

### B2 — `fanOutPost` không copy 6 khối details → sửa bài là MẤT DỮ LIỆU {#b2}

> gốc: [`findings/posts.md`](findings/posts.md) — mục "LỖI BE NẶNG NHẤT CỦA CHU KỲ 2"

**Bằng chứng.** `NewsfeedService.fanOutPost(Integer postId)` dựng `FeedPostDataDto` bằng builder
và chỉ set `eventDetails` + `book`. Sáu field `quizDetails`, `codeSnippetDetails`,
`articleDetails`, `qnaDetails`, `pollDetails`, `linkDetails` **không có dòng nào set**. Mọi đường
publish đều đi qua đúng hàm này (`PostService.createPost`, `updatePost`,
`ModerationEventListener`, `AdminModerationService.reviewPost`) → **không tồn tại bài nào trong
feed có 6 field đó khác null**. Đo trực tiếp trong Redis: bài QNA có `qna_details` đầy đủ trong
Postgres, entry cache là `"qnaDetails": null`.

**Hệ quả nặng nhất không phải là hiển thị, mà là mất dữ liệu.** `updatePost` dùng
`BeanUtils.copyProperties` copy **cả null**, mà client chỉ gửi lại được thứ payload đưa cho nó.
Đo thật ở P2.4′c-4: một lần sửa bài đã **xoá sạch `quiz_details` và reset `acceptedAnswerId`** của
post 121. Cùng cơ chế cũng làm `images` và `taggedUserIds` null sau mọi lần sửa (hai field này có
trong `UpdatePostRequest` nhưng `FeedPostDataDto` không echo).

**Sửa ở đâu.** `newsfeed/service/NewsfeedService.java` — thêm 6 dòng
`.xxxDetails(post.getXxxDetails())` vào builder trong `fanOutPost`, cộng `images` và
`taggedUserIds`. Không đổi DTO, không thêm endpoint.

**Xong khi.** Đăng một bài mỗi loại (QNA, POLL, CODE_SNIPPET, ARTICLE, LINK, + một bài có quiz
đính kèm) → `GET /v1/api/newsfeed` trả về 6 field đó **khác null**. Rồi sửa nội dung một bài QNA
có quiz → `select quiz_details, qna_details from socialapp.t_posts where id=<id>` vẫn còn nguyên.

**FE sẽ gỡ gì khi xong.** Prop `PostMenu.canEdit` (đang tắt nút Sửa cho 5 loại để chặn mất dữ
liệu) và `CommentThread.acceptedInSession`. Code map 5 khối body + `QuizTaker` đã dựng đúng và sẽ
sống dậy nguyên vẹn, **không cần sửa lại FE**.

### B3 — `tags` được Gemini trả về rồi bị vứt đi (tốn quota thật) {#b3}

> gốc: [`findings/trending.md`](findings/trending.md) §2 — T1

**Bằng chứng.** `TrendingClassificationService` **thật sự hỏi Gemini** đúng cấu trúc
`{"category": "...", "tags": ["tag1","tag2"]}` và Gemini **có trả về tags**. Nhưng
`TrendingCrawlScheduler` chỉ lấy lại `category`; `saveItem` không bao giờ `setTags`. Đo trên
**toàn bảng, không lấy mẫu** (chạy lại 2026-07-28):

```sql
select count(*) total, count(*) filter (where tags is null or jsonb_array_length(tags)=0) empty_tags
  from socialapp.t_trending_items;
--  total | empty_tags
--    110 |        110
```

**110/110 rỗng.** Đây là lý do mục này xếp **CHẶN** dù không ai bị hỏng màn hình: **quota Gemini
đã bị tiêu để sinh ra tags rồi ném đi**, mỗi lần crawler chạy lại tốn thêm. Đây là hoá đơn, không
phải thẩm mỹ.

**Sửa ở đâu.** `trending/service/TrendingCrawlScheduler.java` — cho `classify` trả về cả tags và
`saveItem` ghi xuống. Không đổi DTO (`TrendingItemDto` đã khai `tags`), không đổi endpoint.

**Xong khi.** Chạy crawler một vòng → truy vấn SQL trên trả `empty_tags` nhỏ hơn hẳn `total`.

**FE sẽ thêm lại gì.** FE đang **loại hẳn `tags` khỏi `TrendingItem`** (một field không bao giờ
mang giá trị thì không phải dữ liệu để component rẽ nhánh). BE điền vào thì FE thêm lại field +
hàng chip tags trên card.

### B4 — `coverImageUrl` là presigned URL 24h nhưng bị lưu thẳng vào `t_books` {#b4}

> gốc: [`findings/posts.md`](findings/posts.md) — mục "LỖI BE: `coverImageUrl` của sách là presigned URL 24h"

**Bằng chứng.** `BookStorageService.uploadCover` trả `getPresignedUrl(...)` với
`URL_EXPIRY_HOURS = 24`; chuỗi đó được `buildAndSaveBook` **ghi thẳng vào `t_books`** rồi
`FeedPostDataDto` echo lại mãi mãi → **mọi ảnh bìa sách chết sau 1 ngày**.

**Điều đáng nói.** Javadoc của `FeedBookSummaryDto` giải thích rất kỹ vì sao **cố ý loại**
`downloadUrl`/`previewUrl` khỏi payload feed — đúng lý do này (presign 24h ngắn hơn cache feed 7
ngày). `coverImageUrl` mắc đúng cái bẫy mà tài liệu ngay cạnh nó đã cảnh báo.

**Sửa ở đâu.** `bookstore/service/BookStorageService.java` + `buildAndSaveBook`: **lưu object
key, presign lúc đọc**, y như đường download đang làm.

**Xong khi.** `select cover_image_url from socialapp.t_books` trả về **object key**, không phải
URL có `X-Amz-Signature`. Ảnh bìa của một sách tạo hơn 24h trước vẫn hiện.

**Lưu ý lịch.** FE **đang làm bookstore ở P2.10** — mục này ảnh hưởng trực tiếp tầng type đang
thiết kế. Ưu tiên cao nhất trong nhóm bookstore.

### B5 — Đáp án quiz nằm sẵn trong payload feed, lộ TRƯỚC khi nộp {#b5}

> gốc: [`findings/posts.md`](findings/posts.md) — mục "Đáp án quiz lộ TRƯỚC khi nộp"

**Bằng chứng.** `QuizQuestion.correctOptionIndex` nằm **trong chính payload feed**, nên mở
devtools là biết đáp án trước khi trả lời. `QuizResultResponseDto.correctAnswers` chỉ là lần lộ
thứ hai (sau khi nộp — cái này chấp nhận được).

**Sửa ở đâu.** Tách DTO đọc của quiz: payload feed không mang `correctOptionIndex`; chấm điểm ở
server khi nộp.

**FE không bịt được cả hai.** `QuizTaker` vì vậy không diễn trò giấu đáp án — giấu ở client là
giả vờ an toàn.

**Xong khi.** `GET /v1/api/newsfeed` trên một bài có quiz → không có key `correctOptionIndex` ở
bất kỳ đâu trong response.

---

### B18 — `externalLinks` được Gemini sinh ra rồi bị vứt khi lưu (tốn tiền thật) {#b18}

> gốc: [`findings/knowledge.md`](findings/knowledge.md) §7d

**Cùng đúng một họ lỗi với [B3](#b3)** (tags của trending): hỏi model, trả tiền cho câu trả lời,
rồi ném đi một phần.

**Bằng chứng.** `ExplanationService.explainPost` parse được `externalLinks` từ Gemini và trả về
trong `ExplanationResponseDto`. Nhưng:

- `ExplanationEntity` **không có field nào** cho nó (grep `externalLinks` trong entity → rỗng);
- `SaveExplanationRequestDto` **không có field nào** để client gửi lên;
- `toResponseDto` (đường đọc `/my-library`) **không set** `externalLinks`.

Đo trên UI thật với một lần gọi Gemini thật: bản vừa sinh có mục "Đọc thêm" kèm link + lý do; bấm
Lưu rồi đọc `/my-library` thì **mất sạch** — `libHasLinks: false`, trong khi `concepts` và
`version` vẫn còn.

**Vì sao xếp CHẶN**: quota đã bị tiêu để sinh ra phần đó, và **người dùng nhìn thấy nó** trước khi
lưu rồi mất — tệ hơn trending (nơi tags chưa bao giờ hiện ra). Hiện FE phải cảnh báo trước mặt
người dùng rằng bấm Lưu sẽ mất mấy cái link đang hiện.

**Sửa ở đâu.** `knowledge/entity/ExplanationEntity.java` (thêm cột `jsonb`),
`dto/SaveExplanationRequestDto.java` (nhận lại), `ExplanationService.saveExplanation` +
`toResponseDto` (ghi và echo). Có đổi DTO → **báo trước để FE chạy drift check cùng nhịp**.

**Xong khi.** Giải thích một bài có link → Lưu → `GET /v1/api/knowledge/my-library` trả
`externalLinks` khác rỗng.

**FE sẽ gỡ gì.** Dòng cảnh báo `knowledge.explain.linksNotSaved` trong `ExplainPostAction` —
`ExplanationCard` đã render link sẵn nên phần hiển thị **không phải sửa gì**.

## CAO

### B6 — Seed Neo4j có sẵn nhưng KHÔNG BAO GIỜ CHẠY → mọi máy dev thấy danh sách bạn rỗng {#b6}

> gốc: [`findings/friendships.md`](findings/friendships.md) — mục "SỰ CỐ DỮ LIỆU DEV — lần thứ ba"

**Đây là yêu cầu ghi từ P2.2 mà chưa từng gửi thành yêu cầu chính thức. Đồ thị đã biến mất 3 lần.**

**Bằng chứng.** Lời mời kết bạn nằm ở **Postgres** (`t_friend_requests`) nhưng
`FriendshipService.getFriends()` / `getSuggestions()` đọc từ **Neo4j**
(`FriendshipRepository extends Neo4jRepository`). Migration Flyway chỉ đổ Postgres. Đo lúc mở
phiên 2026-07-28, sau một lần reset dev DB:

```
Postgres: 32 user · 13 dòng ACCEPTED (12 cặp phân biệt)
Neo4j:     2 node User · 1 quan hệ FRIENDS_WITH
→ GET /v1/api/friendships trả totalCount = 0 cho 9001 (12 bạn theo Postgres)
```

**Phần quan trọng nhất: script seed ĐÃ TỒN TẠI, chỉ là không ai chạy nó.**

```
DATN-backend/docker/neo4j/seed/friend-graph.cypher              (50 quan hệ FRIENDS_WITH)
DATN-backend/docker/neo4j/seed/friend-graph-nguyen-truc.cypher  (12, trong đó 4 trùng → 8 mới)
```

Grep toàn repo BE (`*.yml`, `*.yaml`, `*.sh`, `*.java`, `*.gradle`, `*.md`) cho `friend-graph`
hoặc `neo4j/seed` → **không có kết quả nào ngoài chính hai file đó**. Service `neo4j` trong
`docker-compose.yml` chỉ mount `data/` và `logs/`, không có volume import, không có bước init.
Header của chính file cypher ghi lệnh chạy **bằng tay**. Nên: `docker compose down -v` một cái là
graph biến mất và không có gì dựng lại.

**Sửa ở đâu.** `DATN-backend/docker-compose.yml` — mount `./docker/neo4j/seed` vào container và
chạy hai file sau khi Neo4j sẵn sàng (init container, entrypoint wrapper, hoặc một
`ApplicationRunner` chỉ bật ở profile `dev`). Bất kỳ cách nào cũng được, miễn là **tự động**.
Cả hai file toàn `MERGE` nên chạy lại nhiều lần vô hại.

**Xong khi.** `docker compose down -v && docker compose up -d` rồi bootRun → đăng nhập
`nguyen.truc@test.com` → `GET /v1/api/friendships` trả **12 bạn có tên thật**, và
`GET /v1/api/friendships/suggestions` trả **khác rỗng** — không phải chạy một lệnh tay nào.

**Tiện ích kèm theo.** `friend-graph.cypher` có 50 quan hệ, tức là giữa các seed user với nhau
chứ không riêng 9001. Nối nó vào sẽ **đồng thời sửa luôn gợi ý kết bạn rỗng**: hiện
`findFriendSuggestions` chạy `(u)-[:FRIENDS_WITH]-(mutual)-[:FRIENDS_WITH]-(suggestion)` mà seed
Postgres chỉ có quan hệ của riêng 9001 nên không ai có bạn chung → `GET /suggestions` trả `[]`
(đo hôm nay: `count = 0`) **kể cả sau khi graph khớp Postgres**. Không cần yêu cầu riêng cho việc
đó — nó là hệ quả của B6.

**Lưu ý cho người sửa.** Hai nguồn seed **cố ý không cùng phạm vi**: Postgres seed _lời mời_,
Neo4j seed _đồ thị bạn bè_. Đừng "sửa" bằng cách sinh graph từ `t_friend_requests` rồi bỏ
`friend-graph.cypher` — làm vậy là mất phần FoF.

**FE đang làm gì.** Dựng lại graph bằng tay ở mỗi phiên bị reset (công thức trong findings). Đây
là **việc của BE, không phải chi phí thường trực của FE**.

### B7 — `likeCount` và `commentCount` trong feed vĩnh viễn 0 {#b7}

> gốc: [`findings/posts.md`](findings/posts.md) — mục "LỖI BE: `likeCount` và `commentCount`"

**Bằng chứng.** Không phải "không cập nhật ngay" — **không ai từng ghi hai field đó**.
`fanOutPost` không set (nên nhận giá trị mặc định của `int`), và `updatePostCache` — hàm **duy
nhất** trong BE có thể sửa entry đã cache — **không có caller nào trong toàn bộ codebase**. Đo
thật: đăng một bình luận thành công xong, entry Redis vẫn `"commentCount": 0`. Refetch bao nhiêu
lần cũng vẫn 0.

**Sửa ở đâu.** `newsfeed/service/NewsfeedService.java` — set hai field trong `fanOutPost`, và gọi
`updatePostCache` từ `PostReactionService` / `CommentService`.

**Xong khi.** Thả tim + bình luận một bài → `GET /v1/api/newsfeed` trả `likeCount >= 1` và
`commentCount >= 1`.

**FE sẽ thêm lại gì.** Hiện FE **không render con số nào** (ds-deviation #19) — hiển thị "0 bình
luận" dưới một bài có bình luận là nói dối người dùng. BE sửa thì FE thêm lại số.

### B8 — `SearchService.toPostDtos` không bao giờ điền 6 khối details {#b8}

> gốc: [`findings/search.md`](findings/search.md) §2 — S2

**Bằng chứng.** `search/dto/PostDto` khai `quizDetails`, `codeSnippetDetails`, `articleDetails`,
`qnaDetails`, `pollDetails`, `linkDetails`. `SearchService.toPostDtos` dựng DTO bằng builder chỉ
set `id`, `content`, `eventName`, các field tác giả, `visibility`, `createdAt`, `book` — **không
set cái nào trong 6 cái đó**. Đo: mọi post trong response đều có đủ 6 key với giá trị `null`.

**Đây đúng là [B2](#b2), ở service thứ hai.** Sửa `fanOutPost` mà quên chỗ này thì lỗi vẫn còn
một nửa. Hệ quả UI: bài quiz / poll / code trong kết quả tìm kiếm chỉ hiện được chữ.

**Sửa ở đâu.** `search/service/SearchService.java` — `toPostDtos`.

**Xong khi.** Tìm một từ khoá khớp bài QNA → response có `qnaDetails` khác null.

**FE sẽ thêm lại gì.** FE **loại hẳn 6 key khỏi type `SearchPost`**, cùng nguyên tắc với B3. BE
điền thì thêm lại.

---

## TRUNG BÌNH

### B9 — `search/dto/PostDto.createdAt` là `LocalDateTime`, làm lệch giờ mọi kết quả {#b9}

> gốc: [`findings/search.md`](findings/search.md) §2 — S1

**Bằng chứng.** Đây là DTO `createdAt` **duy nhất trong toàn bộ backend** khai `LocalDateTime`;
mọi DTO khác dùng `OffsetDateTime` và gửi kèm `Z`. Grep cả `src/main/java`:

```
private LocalDateTime  createdAt  → chỉ search/dto/PostDto.java
private OffsetDateTime createdAt  → bookstore, friendships, github, knowledge, … (mọi chỗ còn lại)
```

Hệ quả đo được: bài vừa tạo hiện **"7 giờ trước"** trên máy UTC+7 — lệch **đúng bằng offset
máy**, nên máy ở UTC sẽ không thấy gì bất thường. DB lưu `timestamptz +00`,
`OffsetDateTime.toLocalDateTime()` trả giờ tường UTC, Jackson gửi `2026-07-27T18:24:54` **không
zone**, và `new Date(...)` đọc chuỗi trần là **giờ địa phương**. So sánh:
`GET /v1/api/notifications` trả `2026-07-27T15:45:14.362961Z` — đúng dạng.

**Sửa ở đâu.** `search/dto/PostDto.java` — đổi `LocalDateTime` → `OffsetDateTime`. **Một từ**,
khớp lại 30+ DTO còn lại.

**Xong khi.** `GET /v1/api/search?q=...` trả `createdAt` có hậu tố `Z`.

**FE PHẢI XOÁ GÌ KHI XONG — đừng bỏ qua dòng này.** FE đang né bằng `withAssumedUtc` ở
`src/features/search/components/post-result-card.tsx:105`, gắn `Z` khi chuỗi không có zone. Đó là
**workaround có giả định** (DB lưu UTC — đã kiểm), không phải bản sửa. BE sửa xong thì hàm đó
thành no-op (guard đã bỏ qua chuỗi có zone sẵn) và **phải xoá cả hàm lẫn chỗ gọi**, nếu không nó
sẽ nằm lại vĩnh viễn như một quy tắc không ai dám đụng.

### B10 — `acceptAnswer` không bao giờ set `isResolved` {#b10}

> gốc: [`findings/posts.md`](findings/posts.md) — mục "`acceptAnswer` KHÔNG BAO GIỜ set `isResolved`"

**Bằng chứng.** `PostService.acceptAnswer` chỉ `qnaDetails.setAcceptedAnswerId(commentId)`. Đo
trên DB ngay sau khi bấm: `{"isResolved": false, "acceptedAnswerId": 61}`. Mà bài QNA luôn được
tạo với `isResolved: false` và **không đường nào khác ghi field đó** → `isResolved` vĩnh viễn
false, tức **mọi câu hỏi đã có đáp án vẫn bị gắn nhãn "Chưa có đáp án"**.

**Sửa ở đâu.** `posts/service/PostService.java` — `acceptAnswer` set luôn `isResolved = true`.

Kèm theo, cùng chỗ: **không có endpoint gỡ hoặc đổi đáp án đã chọn**. `acceptAnswer` ném
_"An answer has already been accepted for this post"_ khi `acceptedAnswerId` đã có. Nếu "chọn một
lần, không đổi" là cố ý thì bỏ qua; nếu không thì cần một endpoint gỡ.

**Xong khi.** Chọn đáp án → `select qna_details from socialapp.t_posts where id=<id>` cho
`"isResolved": true`.

**FE sẽ gỡ gì.** Suy giá trị `resolved = isResolved === true || acceptedAnswerId != null` — giữ
được sau khi BE sửa, nhưng vế thứ hai thành thừa.

### B11 — File rác nằm lại MinIO khi tạo sách hỏng {#b11}

> gốc: [`findings/posts.md`](findings/posts.md) — mục "LỖI BE: file rác nằm lại MinIO"

**Bằng chứng.** `buildAndSaveBook` upload file (và bìa) lên MinIO **trước** khi kiểm
`previewPages`. `createBookPost` có `@Transactional` nên hàng `t_posts` / `t_books` rollback đúng
(đã verify: 3 lần gọi hỏng → **0 post mồ côi**), nhưng MinIO không nằm trong transaction → đo
được **4 object trong MinIO / 2 sách trong DB**. Redis cũng không rollback: lần gọi hỏng vẫn ăn
một suất rate-limit và vẫn ghi content-hash.

**Sửa ở đâu.** `bookstore/service/BookStorageService.java` + `buildAndSaveBook` — validate hết
rồi mới upload, hoặc dọn bù khi ném lỗi.

**Xong khi.** Gọi tạo sách với `previewPages` không hợp lệ 3 lần → số object trong bucket MinIO
không đổi.

---

## THẤP

### B12 — ICS thiếu `UID` và `DTSTAMP` {#b12}

> gốc: [`findings/posts.md`](findings/posts.md)

BE dựng file ICS bằng tay. Đo được thân file: chỉ có
`VERSION / PRODID / DTSTART / DTEND / SUMMARY / DESCRIPTION / LOCATION`. RFC 5545 bắt buộc cả
`UID` lẫn `DTSTAMP`; importer chặt có thể từ chối. **Xong khi**: tải file `.ics` của một sự kiện
→ có đủ hai dòng đó.

### B13 — `/attendees` trả thẳng JPA entity và không lọc trạng thái {#b13}

> gốc: [`findings/posts.md`](findings/posts.md)

Trả `List<EventRsvpEntity>`, không DTO — chỉ có `userId`, **không tên, không avatar**. Mà BE
không có endpoint tra người theo id (chỉ `/profile/me`) → **danh sách người tham gia không hiển
thị được danh tính**. Thêm nữa `findByPostId` **không lọc**: `NOT_GOING` và `INTERESTED` nằm chung
danh sách; chỉ `/attendees/count` mới thu về `GOING`.

Cùng họ giới hạn với "không deep-link được profile người khác" (CLAUDE.md Phase 3.1). **Xong
khi**: `/attendees` trả DTO có tên + avatar và có tham số lọc theo trạng thái.

Ghi kèm, chưa thành yêu cầu: **không có endpoint "tôi RSVP gì"** và **không có đường huỷ RSVP** —
khác reaction (có đường gỡ). Cần biết đây là cố ý hay thiếu.

### B14 — 3 trong 6 crawler chưa từng sinh dữ liệu (QUAN SÁT, CHƯA KẾT LUẬN) {#b14}

> gốc: [`findings/trending.md`](findings/trending.md) §2 — T2

**Đây không phải bug đã xác minh** — ghi lại để BE tự kết luận. Đo lại 2026-07-28:

```sql
select source, count(*) from socialapp.t_trending_items group by source;
--  HACKER_NEWS 43 · GITHUB 34 · DEV_TO 33
```

`REDDIT`, `MEDIUM`, `HBR`: **0 hàng**. Có thể là bị chặn / rate-limit ở đầu nguồn chứ không phải
lỗi code — **chưa điều tra**. Tương tự, chỉ 6/8 category xuất hiện (thiếu `EVENT`, `MINDSET`).

**Không phải lý do để FE cắt bộ lọc**: FE vẫn chào đủ 8 category vì crawl ngày mai có thể lấp
vào. **Xong khi**: BE xác nhận đây là hành vi mong đợi, hoặc 3 nguồn đó có hàng.

### B15 — Reputation: thiếu `currentLevelMin`; feed/search thiếu `levelName` {#b15}

> gốc: [`findings/reputation.md`](findings/reputation.md)

Hai giới hạn dữ liệu, **không phải bug**, ghi để BE biết cái giá:

1. Response reputation có `nextLevelMin` nhưng **không có sàn của cấp hiện tại** → thanh tiến
   trình phải chạy `0 → nextLevelMin` thay vì `sàn-cấp → trần-cấp`. FE **không hardcode bảng
   ngưỡng** để vá, vì đó là chép nguồn sự thật lần thứ ba (đã có ở `RepScore.d.ts` và enum
   `RepLevel` của BE — CLAUDE.md §1 three-way sync). Muốn thanh "trong cấp" thì BE trả thêm
   `currentLevelMin`.
2. Payload feed / search có `eliteScore` nhưng **không có `levelName`** → chip ở feed và kết quả
   tìm kiếm hiện số trần, không hậu tố cấp.

**Xong khi.** Hai field đó có mặt trong DTO tương ứng.

### B16 — 4/11 `NotificationType` không có nơi phát {#b16}

> gốc: [`findings/notifications.md`](findings/notifications.md) §9

Grep `NotificationType.` ngoài package `notifications`: `POST_SHARED`, `EVENT_RSVP`,
`EVENT_REMINDER`, `SYSTEM` — **không ai phát**. FE giữ đủ 11 trong union (wire chở được) nhưng
dùng nhánh fallback thay vì viết 4 case không fixture nào chạy tới.

**Xong khi.** BE xác nhận 4 loại này là dự phòng có chủ đích, **hoặc** nối nơi phát cho chúng.

### B17 — Không có realtime nào {#b17}

> gốc: [`findings/notifications.md`](findings/notifications.md) §1

Grep toàn bộ `DATN-backend/src/main/java` cho `WebSocketConfig`, `@EnableWebSocket`,
`@EnableWebSocketMessageBroker`, `SseEmitter`, `text/event-stream` → **không có kết quả nào**.
`NotificationService.send` là `@Async`: ghi Postgres + (tuỳ preference) gọi OneSignal / SMTP.
Không có gì đẩy về client.

→ FE poll `refetchInterval: 30_000` cho badge chưa đọc. Đây là **giới hạn kiến trúc, không phải
lỗi**; ghi ở đây để "realtime notification" không bị giao nhầm cho FE. Chat **không** vướng chỗ
này (Stream Chat tự lo socket).

**Xong khi.** Nếu quyết làm: có WebSocket hoặc SSE đẩy notification. Nếu quyết không làm: ghi vào
tài liệu BE để không ai hỏi lại.

---

## Đã sửa xong — tiền lệ R1–R8 của chat

> gốc: [`findings/chat.md`](findings/chat.md)

Để BE thấy quy trình này đã chạy trơn một vòng, và thấy dạng bằng chứng "xong khi" mà FE dùng để
đóng một yêu cầu. R1–R8 gửi ngày 2026-07-26, BE sửa xong, FE verify lại 2026-07-27 **trên BE +
Stream thật**, rồi domain `chat` đóng ở P2.7d.

| yêu cầu | nội dung                                 | verify của FE (bằng chứng đo được)                                                                                                                                                                                                                                   |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1**  | Cấu hình credentials Stream (CHẶN)       | `GET /v1/api/chat/token` → **200** (trước là **503**)                                                                                                                                                                                                                |
| **R2**  | Token phải ký HS256                      | header token = `{"alg":"HS256"}` — nghi ngờ hoá ra đúng, đây từng là lỗi thật                                                                                                                                                                                        |
| **R3**  | Response phải trả kèm `apiKey` (CHẶN)    | response có `apiKey` (`fub6apdcr47y`)                                                                                                                                                                                                                                |
| **R4**  | Token có `iat` + `exp`; response nói hạn | payload có `iat` + `exp`; response có `expiresAt` (TTL 24h, đọc từ `stream.chat.token-ttl`)                                                                                                                                                                          |
| **R5**  | Đồng bộ user sang Stream (tên + avatar)  | `StreamChatClient.upsertUser` gọi best-effort trong `issueToken`; trên UI hiện **"Backend Vũ Thảo"** thay vì `9004`                                                                                                                                                  |
| **R6**  | Chốt ai được nhắn ai, ai tạo channel     | chọn (a): không endpoint mới → FE tạo channel client-side. **Tổng endpoint vẫn 101**                                                                                                                                                                                 |
| **R7**  | Xoá package `chat` khỏi BE nếu bỏ Stream | không áp dụng — đã chốt giữ Stream                                                                                                                                                                                                                                   |
| **R8**  | Upsert cả bạn bè khi cấp token           | `upsertUsers(Collection)` chia lô 100, `FriendshipService.getFriendIds` (public, **đúng ranh giới package** — `chat` không với thẳng vào repository của `friendships`). Đo: nhắn được bạn chưa từng đăng nhập; người ngoài danh sách bạn vẫn lỗi (**đúng mong đợi**) |

**Hai điều đáng học từ vòng đó, mong lặp lại:**

1. **`drift check` ra RỖNG.** R5 và R8 sửa hành vi mà **không đổi DTO, không thêm endpoint** —
   `npx openapi-typescript` trên `/v3/api-docs` cho diff rỗng, nên FE không phải chỉnh gì ở tầng
   type. Hầu hết yêu cầu trong file này (B2, B3, B6, B7, B8, B10, B11) cũng **không cần đổi hợp
   đồng API** — mong giữ được tính chất đó; mục nào buộc đổi DTO (B5, B9, B15) thì báo trước để
   FE chạy drift check cùng nhịp.
2. **Sync hồ sơ không được phép làm hỏng việc cấp token.** `syncProfileBestEffort` nuốt lỗi và vẫn
   trả token — sync hỏng thì chat xuống cấp thành id số, còn token hỏng thì mất chat hoàn toàn.
   Lý do nằm trong javadoc, ngay cạnh code. Đó đúng là thứ tài liệu này muốn nhân rộng.
