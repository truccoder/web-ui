# Kế hoạch backend — Elite Nexus

> **TRẠNG THÁI 24/08/2026 — TOÀN BỘ ĐÃ ĐÓNG.** Backend báo đã trả xong **B1–B21 và S1–S10**
> (biên bản trả nợ, nhánh `task/Iq7tLIt0`, commit `ee89d77`: 72 file đổi, 163 test mới,
> line coverage 91,50%). Từ đây tài liệu này là **hồ sơ lịch sử** — nó ghi lại các khoảng
> trống đã từng tồn tại và lý lẽ đằng sau từng đề nghị, **không còn là danh sách việc cần làm**.
> Đừng đọc nó như một hàng chờ.
>
> **Việc còn lại thuộc về frontend:** contract OpenAPI đã đổi, nên phải **regenerate
> `src/core/api/schema.gen.ts`** trước khi dựng tiếp. Những gì thay đổi: ba endpoint mới
> (`POST /v1/api/media`, `POST /v1/api/link-preview`, `GET …/comments/{id}/reactions`),
> `reactionSummary` trên `FeedPostDataDto`/`PostDto`/`CommentResponseDto` (null = _chưa biết_,
> không phải bằng 0), `coverImageUrl` trên `UserResponse`/`UpdateProfileRequest`/
> `PublicProfileResponse` (chuỗi rỗng là tín hiệu **gỡ**, null là _giữ nguyên_),
> `TrendingItemDto.imageUrl`, `ExplainRequestDto.language` (BCP-47), và giá trị enum
> `USER_MENTIONED` trong `NotificationType`.
>
> Mỗi mục bên dưới giữ nguyên như lúc viết. Chỗ nào ghi "FE trong lúc chờ" thì đường vòng đó
> **đã hết cần thiết** — nhưng đừng gỡ trước khi `schema.gen.ts` được sinh lại và màn tương ứng
> được đối chiếu với dữ liệu thật.

Viết ngày 19/08/2026 từ phía frontend, sau khi đối chiếu `schema.gen.ts`, UI kit round 15
và mã nguồn backend. **Chỉ đọc backend, không sửa** — đây là đề nghị, không phải thay đổi.

## Nguyên tắc

Frontend không chờ mục nào trong này. Mỗi mục ghi rõ FE đang xoay xở ra sao, nên backend
sửa lúc nào cũng được mà không làm hỏng bản đang chạy. Thứ tự dưới đây xếp theo **mức ảnh
hưởng tới buổi bảo vệ**, không theo độ khó.

---

## Đợt 1 — nên có trước 23/08

### B1 · Đường seed cho môi trường dev

**Chặn toàn bộ việc kiểm chứng.** Không có dữ liệu thì không màn nào đối chiếu được.

Hai rào cản đã xác minh trong mã nguồn:

- `security/service/AuthService.java:322` — đăng nhập bằng mật khẩu bắt buộc
  `emailVerified = true`. Đăng ký qua API xong là không đăng nhập được, mà `docker-compose`
  không có mail catcher nào.
- `security/entity/UserEntity.java:44` — `private UserRole role = UserRole.USER`. Không có
  endpoint nào phong `ADMIN`, trong khi `/admin/*` và `POST /roadmaps` đều
  `@PreAuthorize("hasRole('ADMIN')")`.

**Đề xuất:** một seeder chạy dưới Spring profile `dev`, tạo sẵn vài tài khoản đã verify,
một tài khoản `ADMIN`, bài đủ 8 loại, một lộ trình, một sách trả phí, vài bài chờ kiểm duyệt.

**Cách gỡ tạm không cần sửa code:**

```sql
UPDATE socialapp.t_users SET email_verified = true;
UPDATE socialapp.t_users SET role = 'ADMIN' WHERE email = '<tài khoản admin>';
```

**FE trong lúc chờ:** không làm gì được. Đây là mục trả lại nhiều nhất.

---

### B2 · Hồ sơ công khai trả đủ dữ liệu

`GET /v1/api/users/{username}/profile` hiện trả `PublicUserResponse`, chỉ gồm
`id · username · fullName · profilePictureUrl · eliteScore · createdAt`.

Thiếu `levelName`. Luật của design system cấm suy cấp độ từ điểm ở client, nên màn
`/u/[username]` phải in gạch ngang ngay chỗ luận điểm trung tâm của sản phẩm.

**ĐỪNG thêm trường vào `PublicUserResponse`.** Record này dùng chung ở 7 nơi:

```
blocks/controller/BlockController.java      blocks/service/BlockService.java
posts/dto/ReactorPageResponseDto.java       posts/service/PostReactionService.java
security/controller/PublicProfileController.java
security/service/ProfileService.java
```

Danh sách người thả cảm xúc cũng dùng nó — thêm tra cứu cấp độ vào đây là tự tạo N+1 trên
một danh sách có thể rất dài.

**Đề xuất:** tạo `PublicProfileResponse` riêng cho `PublicProfileController`, gồm thêm
`levelName`, `nextLevelMin`, `verifiedSkills`. `PublicUserResponse` giữ nguyên mỏng.

Máy móc đã có sẵn: `reputation/RepLevel.java` + `reputation/service/ReputationService.java`,
và `newsfeed/service/FeedPostDataMapper.java` đã giải tên cấp độ cho từng tác giả trong
feed — tức là đã chạy được ở quy mô cả cột bảng tin.

**FE trong lúc chờ:** gọi thêm `GET /users/{id}/reputation`. Tốn một round-trip.

---

### B3 · `SearchResponse` thêm nhánh sách

```java
// search/dto/SearchResponse.java — hiện tại
public record SearchResponse(List<UserDto> users, List<PostDto> posts) {}
```

Mô tả đề tài ghi "tìm bài viết, người dùng **và sách**". Nhánh sách không tồn tại.

**Đề xuất:** thêm `List<BookDto> books` vào record; việc thật nằm ở `search/service/SearchService.java`
— thêm truy vấn không dấu, theo chuỗi con, trên `t_books.title`, cùng kiểu với hai nhánh kia.

**FE trong lúc chờ:** `/search` ship 2 tab. Vẽ tab thứ ba là vẽ thứ bấm vào không ra gì.

---

### B4 · `FeedPostDataDto` thêm `updatedAt`

Hiện chỉ có `createdAt`, nên bài viết sửa lặng lẽ.

Điều này quan trọng hơn vẻ ngoài của nó: **ba thứ trong hệ trỏ vào nội dung một bài** —
bằng chứng xác minh kỹ năng, giải thích Gemini đã lưu trong kho, và Elite Score của tác
giả. Bài đổi mà không nói thì cả ba hỏng âm thầm.

**File:** `newsfeed/dto/FeedPostDataDto.java` + `newsfeed/service/FeedPostDataMapper.java`.
Cần kiểm xem `t_posts` đã có cột `updated_at` chưa; nếu entity có audit thì nhiều khả năng đã có.

**FE trong lúc chờ:** chuỗi `edited: 'đã sửa'` đã nằm sẵn trong `vi.ts`, hiện chỉ dùng cho
bình luận. Có trường là hiện được ngay, gắn vào timestamp chứ không phải một badge riêng.

---

## Đợt 2 — sau buổi bảo vệ

### B5 · `ReactionType` thêm `INSIGHT` và `CLAP`

```java
// posts/entity/enums/ReactionType.java — hiện tại
public enum ReactionType { LIKE, LOVE, HAHA, CRY, ANGRY }
```

UI kit thiết kế ba cảm xúc mang tính tri thức — `Hữu ích · Sáng tỏ · Ghi nhận` — và đó là
một phần lập luận "vì sao đây không phải mạng xã hội thường". Enum hiện tại là bộ Facebook.

**Thêm, đừng thay.** Đổi tên 5 giá trị cũ sẽ làm hỏng dữ liệu đã lưu.

**FE đã làm tạm:** giữ nguyên 5 giá trị trên dây, đổi nhãn tiếng Việt sang giọng kỹ thuật.

### B6 · SSE cho thông báo

Schema không có WebSocket lẫn `text/event-stream` nào. Chuông đang poll 30 giây
(`UNREAD_POLL_MS`). Đề tài có nêu "trải nghiệm thời gian thực"; câu trả lời trung thực hiện
giờ là polling. Một endpoint SSE là bỏ được vòng lặp.

### B7 · `/feed` nhận tham số lọc theo kỹ năng

`getFeed` chỉ nhận `page` và `size`. Tab thứ ba "Kỹ năng của tôi" đã được thiết kế và
`src/app/(main)/newsfeed/page.tsx` ghi rõ lý do không dựng được. Có tham số là thêm đúng
một dòng vào `TABS` phía FE.

### B8 · `/trending` nhận tham số lọc theo nguồn

`getTrending` chỉ nhận `timeRange`, `page`, `size`. Không lọc được theo nguồn, và vì danh sách
sắp theo điểm thô mà thang điểm của ba nguồn hoàn toàn khác nhau (sao GitHub tính bằng trăm
nghìn, điểm Hacker News bằng nghìn), GitHub chiếm gần hết trang đầu dù DB đang có
**Hacker News 52 · Dev.to 36 · GitHub 34**.

Hai cách, nên làm cả hai: thêm tham số `source`, và chuẩn hoá điểm theo nguồn trước khi xếp.
Luận điểm "ba nguồn" của đề tài hiện đúng trong dữ liệu nhưng không nhìn thấy được trên màn.

**FE trong lúc chờ:** nhãn nguồn nằm trên từng thẻ, và ledger liệt kê theo nguồn.

### B10 · Thông báo khi kỹ năng được xác minh

**Đây là mục ảnh hưởng trực tiếp tới buổi bảo vệ**, khác với các mục còn lại của đợt 2.

`NotificationType` hiện chỉ có `BOOK_PURCHASED · BOOK_REVIEW · EVENT_RSVP · FRIEND_ACCEPTED ·
FRIEND_REQUEST · POST_COMMENTED · POST_LIKED · POST_TAGGED`. Duyệt một yêu cầu xác minh kỹ năng
**không báo cho ai cả** — đã đo ngày 19/08: điểm tăng 73 → 93, số thông báo chưa đọc đứng yên
ở 14.

Nghĩa là vòng lặp trung tâm của đề tài — hoạt động thật, vào sổ cái, thành uy tín — kết thúc
trong im lặng, và người được xác minh chỉ biết nếu họ tự mở lại trang.

**Đề xuất:** thêm `SKILL_VERIFIED` (và nên có cả `SKILL_REJECTED`), phát trong
`SkillVerificationService` ngay chỗ đã cộng điểm uy tín.

**FE trong lúc chờ:** kịch bản demo bảo người trình bày bấm F5. Chuỗi `edited`/`viewSource` cho
thấy FE sẵn sàng hiện ngay khi có dữ liệu.

### B11 · Endpoint báo cáo bài viết

Không có endpoint user-facing nào để báo cáo nội dung. Hàng chờ kiểm duyệt hiện chỉ được
nạp bởi AI. Cơ chế khiếu nại có, nhưng chiều ngược lại thì không — người dùng không đẩy
được gì vào hàng chờ.

### B12 · Sửa bài đang xoá đáp án của quiz

**Đây là mục duy nhất trong tài liệu này làm hỏng dữ liệu đã lưu, không phải thiếu tính năng.**
Ghi ngày 22/08 khi nối các panel trường riêng vào `PostEditor`.

Hai DTO khác nhau cho cùng một quiz:

```
FeedPostDataDto.quizDetails  →  PublicQuizDetailsDto  { title, questions[{ question, options }] }
UpdatePostRequestDto.quizDetails →  QuizDetails      { title, questions[{ ..., correctOptionIndex, explanation }] }
```

Bảng tin chỉ nhận được bản dành cho người đọc — **không có đáp án**. Nhưng `updatePost` chạy
`BeanUtils.copyProperties`, vốn chép cả null, nên gửi bản đó ngược lên là ghi `null` đè lên
`correctOptionIndex` của mọi câu hỏi. Quiz vẫn còn nguyên câu hỏi trên màn, và
`POST /posts/{id}/quiz/submit` bắt đầu chấm theo một đáp án rỗng. Không có lỗi nào phát ra.

Sinh ra ở đâu cũng được: mọi generated DTO đều `optional`, nên bản public gán vào bản author mà
TypeScript không phàn nàn một tiếng.

**Không có đường vòng phía FE.** `GET /v1/api/posts/{postId}` cũng trả `FeedPostDataDto`, tức là
không endpoint nào trả lại đáp án cho chính tác giả. Ba lựa chọn, cả ba đều mất mát:

| Cách                     | Hậu quả                                               |
| ------------------------ | ----------------------------------------------------- |
| Gửi lại y như nhận       | Im lặng — bài trông vẫn ổn, chấm điểm thì hỏng        |
| Bỏ hẳn `quizDetails`     | Xoá cả quiz, mất luôn câu hỏi                         |
| Bắt tác giả đánh dấu lại | Không mất gì trong im lặng — **FE đang làm cách này** |

Từ 22/08 `PostEditor` mở `QuizComposer` với đúng câu hỏi và lựa chọn cũ, không câu nào được
đánh dấu, chặn nút Lưu tới khi tác giả chọn lại đáp án, kèm một dòng cảnh báo nói rõ vì sao.
Đó là báo cáo trung thực về tình trạng hiện tại, không phải bản sửa.

**Đề xuất, chọn một:**

- `PostService.updatePost` bỏ qua các trường `null` thay vì chép đè (sửa được cả một lớp lỗi
  cùng loại, không riêng quiz); **hoặc**
- thêm một đường trả `QuizDetails` đầy đủ cho chính tác giả của bài.

Cách thứ nhất đáng làm hơn: `copyProperties` chép null là nguyên nhân gốc của cả thiết kế
"gửi lại toàn bộ đối tượng" mà `PostEditor` đang buộc phải theo.

### B13 · `FeedPostDataDto` thiếu `authorUsername`

Bấm vào tên tác giả trên bảng tin không mở được hồ sơ của họ, và đó là chỗ duy nhất trong sản
phẩm mà một cái tên hiện ra nhưng không dẫn đi đâu.

Trang hồ sơ công khai khoá theo **username**: `GET /v1/api/users/{username}/profile`. Còn bảng
tin chỉ đưa xuống `authorId · authorFullName · authorEliteScore · authorLevelName ·
authorProfilePictureUrl` — **không có `authorUsername`**.

**Không có đường vòng phía FE, đã kiểm cả spec ngày 22/08.** Không endpoint nào ánh xạ
`userId → username`: `GET /users/{id}/reputation` chỉ trả điểm và cấp, `/users/{id}/posts` trả
bài, `/users/{id}/roadmap-progress` trả kỹ năng. Nên một route phụ kiểu `/u/id/{id}` cũng không
dựng được — trang sẽ không có tên lẫn ảnh đại diện để hiện.

**Đề xuất:** thêm `authorUsername` vào `FeedPostDataDto`. Dữ liệu đã nằm sẵn trong bảng user mà
`FeedPostDataMapper` đang join để lấy `authorLevelName`, nên là thêm một cột vào một truy vấn đã
chạy, không phải một vòng lặp mới.

Cùng lý do đó, `PostDto` của tìm kiếm và `ReactorPageResponseDto` cũng nên có — hiện danh sách
người thả cảm xúc đã deep-link được vì nó dùng `PublicUserResponse` (có `username`), nên bảng
tin đang là mặt duy nhất còn hụt.

**FE trong lúc chờ:** tên tác giả in ra dạng chữ thường, ghi chú lý do ngay tại
`post-card.tsx`. Ảnh và tên vẫn đúng, chỉ là không bấm được.

### B14 · Bình luận không có like

Bảng tin hiện in ra hai bình luận đầu tiên của mỗi bài. Yêu cầu ban đầu là **hai bình luận
nhiều like nhất** — không dựng được, vì không có gì để xếp hạng.

`CommentResponseDto` có đúng chín trường:

```
id · postId · authorId · authorFullName · authorProfilePictureUrl
content · parentId · createdAt · updatedAt
```

Không có `likeCount`, không có `myReaction`. Và `CommentController` chỉ có hai đường:

```
GET|POST        /v1/api/posts/{postId}/comments
PUT|DELETE      /v1/api/posts/{postId}/comments/{commentId}
```

Không có đường nào thả cảm xúc cho một bình luận, trong khi bài viết thì có
(`PostReactionController`). Nên bình luận không những không xếp hạng được, mà còn **không thích
được** — một bất đối xứng người dùng nhìn thấy ngay: thả được cảm xúc cho bài, không thả được cho
câu trả lời hay nhất bên dưới nó.

**Không có đường vòng phía FE.** Xếp theo độ dài, lấy thời gian rồi gọi là "phổ biến", hay đếm số
lần được trả lời — cả ba đều là một con số trông như đo đạc mà không phải. FE đang lấy hai bình
luận gốc đầu tiên và nói thẳng trong `comment-preview.tsx` rằng thứ tự là theo thời gian.

**Đề xuất, hai phần, phần đầu đã đủ mở khoá màn hình:**

1. Thêm `likeCount` (và `myReaction` nếu làm cả phần 2) vào `CommentResponseDto`. Chỉ với
   `likeCount`, FE xếp được hai bình luận nổi nhất — đúng thứ đã hứa.
2. Thêm đường thả cảm xúc cho bình luận, đối xứng với bài viết:
   `POST|DELETE /v1/api/posts/{postId}/comments/{commentId}/reactions`.

Phần 1 là một cột cộng vào một truy vấn đã chạy. Phần 2 là một bảng và một controller.

**Cập nhật 24/08 — đã xong, cả hai phần.** Đo trên máy chủ đang chạy: `CommentResponseDto` giờ trả
`likeCount` và `myReaction` (`{"id":8005,…,"likeCount":5,"myReaction":"INSIGHT"}`), và đường thả
cảm xúc đã có. **Động từ là `PUT`, không phải `POST`** như mục này đề xuất — nghĩa là upsert trên
cặp (user, bình luận), đổi LIKE → CLAP là đúng một lần gọi:

```
PUT | DELETE   /v1/api/posts/{postId}/comments/{commentId}/reactions
```

FE đã nối: nút cảm xúc trong `comment-item.tsx` không còn `disabled`, có optimistic + rollback, và
con số bên cạnh nhúc nhích thật. Một điểm cần biết khi đọc `myReaction`: nó là **enum đủ bảy giá
trị**, không phải cờ boolean — seed đang có `INSIGHT` trên bình luận — nên client không được giả
định người đọc đã thả `LIKE`. Phần đọc còn thiếu (`GET` để biết 5 đó gồm những gì) là **B19**.

### B15 · Giải thích AI không chọn được ngôn ngữ

Bản giải thích trả về **nửa tiếng Việt nửa tiếng Anh**: bài gốc tiếng Việt, phần giải thích tiếng
Anh, các nhãn `Khái niệm` / `Cần biết trước` / `Đọc thêm` lại tiếng Việt vì đó là chuỗi của FE.

`ExplainRequestDto` có **đúng một trường**:

```
feedbackNote?: string
```

Không có `language`, không có `locale`, và endpoint cũng không đọc `Accept-Language`. Nên FE
**không có cách nào** nói cho mô hình biết người đọc đang dùng ngôn ngữ nào — đây là chỗ duy nhất
trong sản phẩm mà ngôn ngữ hiển thị không đi theo lựa chọn VI/EN của người dùng.

**Đề xuất, theo thứ tự ưu tiên:**

1. Thêm `language` (hoặc `locale`) vào `ExplainRequestDto` và ghép vào prompt: _"Trả lời hoàn toàn
   bằng <ngôn ngữ>"_. FE đã có `LOCALE_COOKIE` và biết chính xác giá trị cần gửi. Đây là cách đúng
   vì sản phẩm có hai ngôn ngữ, không phải một.
2. Nếu chưa muốn đổi DTO: ghim tiếng Việt trong prompt phía backend. Sai với người dùng EN, nhưng
   đúng với đa số và sửa được ngay.

**Một đường vòng FE có thể có, chưa kiểm chứng:** nếu backend ghép `feedbackNote` thẳng vào prompt
thì FE gửi kèm _"Hãy trả lời hoàn toàn bằng tiếng Việt"_ có thể ăn. Mình **không thử** vì gọi
`explain` là một lần gọi Gemini và có ghi dữ liệu (`ExplanationResponseDto` có `id` và `version`),
mà cơ sở dữ liệu này là DB demo. Cần người có mã backend xác nhận `feedbackNote` đi vào prompt ở
đâu trước khi dùng nó theo kiểu đó — và kể cả có ăn thì vẫn là lạm dụng một trường sinh ra cho
việc khác, chỉ nên coi là tạm.

### B16 · Bài viết có `images` nhưng không có chỗ nào tải ảnh lên

_Đối chiếu `schema.gen.ts` ngày 24/08._

**Trường đã có sẵn, và đây là phần cần nói trước.** `CreatePostRequestDto`, `UpdatePostRequestDto`
và `FeedPostDataDto` đều mang `images?: string[]` — một mảng **URL**, thông cả hai chiều. Backend
không thiếu gì để một bài có ảnh; FE gửi lên được, đọc về được, và `feed-post.tsx` đã ánh xạ nó
qua lại để một lần `Sửa` không xoá mất ảnh.

**Cái thiếu là chỗ để có được URL đó.** Cả API có đúng ba đường multipart:

```
POST  /v1/api/auth/register        (ảnh đại diện lúc đăng ký)
POST  /v1/api/posts/books          (file sách + ảnh bìa)
PUT   /v1/api/profile/picture      (ảnh đại diện)
```

Không đường nào nhận một ảnh rời. Nên người đăng bài chỉ có thể **dán liên kết ảnh** — đúng như
`ArticleDetails.coverImage` và `LinkDetails.thumbnailUrl` đang làm, và chuỗi hint của hai ô đó đã
nói thẳng ra là chưa có tải lên.

**Đề xuất:** `POST /v1/api/media` (multipart, nhận một hoặc nhiều file) trả về `string[]` các URL,
để caller ghép thẳng vào `images`. MinIO đã nằm trong hạ tầng và ảnh đại diện đã đi qua nó, nên đây
là mở một controller cho thứ đang chạy chứ không phải dựng kho lưu trữ mới. Giới hạn dùng lại
`spring.servlet.multipart` (20MB mỗi file, 25MB mỗi request) để khỏi thêm cấu hình.

**FE trong lúc chờ:** ô dán URL trong composer, y hệt ô ảnh bìa của bài `ARTICLE`. Chạy được ngay
hôm nay, không cần backend đổi gì.

**Một nợ của FE, không phải của backend, ghi ở đây cho khỏi lẫn:** ngoài màn kiểm duyệt,
`images` hiện **không được hiện ở đâu cả** — `PostCard` nhận nó rồi bỏ qua. Phần này FE tự sửa
được và nên sửa trước khi hỏi backend bất cứ điều gì; nhưng sửa xong sẽ không nhìn thấy gì, vì
seed chưa có bài nào mang ảnh — xem S10.

### B17 · Không có unfurl — ảnh không tự lấy được theo liên kết

Hai mặt cùng thiếu một thứ: đọc trang đích để lấy ảnh của nó.

**Bài `LINK`.** `LinkDetails` có `url · title · description · thumbnailUrl`, và cả bốn đều do người
đăng **gõ tay**. Dán một liên kết vào rồi phải tự đi tìm tiêu đề và ảnh của chính liên kết đó là
việc không ai làm, nên trên thực tế bài LINK hiện ra dưới dạng một dòng URL trơ.

**Trending.** `TrendingItemDto` có `author · category · id · publishedAt · score · source ·
summary · tags · title · url` — **không có trường ảnh nào**, trong khi thẻ trending là mặt duy
nhất trong sản phẩm mà nội dung không do người dùng viết ra và vì thế cần ảnh nhất để phân biệt.

**Không có đường vòng phía FE, và lý do là CORS chứ không phải thiếu công.** Muốn có `og:image`
thì phải tải HTML của trang lạ về đọc; trình duyệt chặn việc đó. Đây là loại việc chỉ chạy được ở
phía server.

**Đề xuất, hai phần độc lập:**

1. Thêm `imageUrl` vào `TrendingItemDto`, crawler điền lúc thu thập. Rẻ vì hai trong ba nguồn trả
   sẵn — dev.to có `cover_image` / `social_image` trong chính JSON đang gọi, GitHub có
   `owner.avatar_url` (và `https://opengraph.githubassets.com/1/{owner}/{repo}` là ảnh og tĩnh,
   không cần gọi thêm). Hacker News không có gì, đọc `og:image` của trang đích hoặc để trống —
   FE đã quen với ảnh vắng.
2. `POST /v1/api/link-preview { url }` → `{ title, description, thumbnailUrl, siteName }`, đọc
   `og:*` / `twitter:*`. Composer gọi một lần khi người dùng dán xong URL và điền sẵn ba ô đang
   phải gõ tay.

**Hai điều cần cân nhắc khi làm phần 2, ghi ở đây vì chúng thuộc về phía backend:**

- **SSRF.** Endpoint nhận URL tuỳ ý rồi tự đi gọi, nên cần chặn dải IP nội bộ, ghim `http`/`https`,
  đặt timeout và trần dung lượng tải về, và giới hạn số lần chuyển hướng.
- **Hotlink.** `thumbnailUrl` trỏ thẳng sang máy chủ người khác thì có ngày 403 hoặc đứt.
  `link-body.tsx` đã có sẵn nhánh `thumbFailed` để không vỡ bố cục, nhưng bản bền là crawler tải
  ảnh về MinIO — tức là phần này dựa lên B16.

### B18 · Hồ sơ không có ảnh bìa, và không có chỗ nào để có một tấm

_Đối chiếu mã nguồn backend ngày 24/08._

**Không phải thiếu một mảnh — chưa có gì cả.** Bốn chỗ đáng lẽ phải mang nó thì cả bốn đều không:

- `security/entity/UserEntity.java:37` — trường ảnh duy nhất của người dùng là `profilePictureUrl`.
  Không có `coverImageUrl`, không có banner, không có gì thay thế được.
- Toàn bộ migration `V1 → V64` không thêm cột ảnh bìa nào vào `t_users`. Chữ "cover" xuất hiện đúng
  một lần trong cả `db/migration`: `V44__store_book_cover_object_key.sql` — ảnh bìa **sách**.
- `UserResponse` (8 trường) và `PublicProfileResponse:33-44` (11 trường) đều không có trường nào cho
  ảnh bìa. Nghĩa là kể cả khi cột tồn tại, hồ sơ công khai vẫn không đọc được nó.
- `UpdateProfileRequest` là `record UpdateProfileRequest(@NotBlank String fullName)` — chỗ duy nhất
  người dùng sửa hồ sơ, và nó sửa được đúng một trường.

**Cũng không mượn được endpoint nào đang có.** `ProfileController` có đúng bốn route (`/me`,
`PUT /`, `/password`, `/picture`), và cả API chỉ có ba đường multipart — xem B16. Không có
`POST /media` để tải một ảnh rời rồi tự gán URL vào hồ sơ.

**Đề xuất — bốn bước, đều là nhân bản luồng ảnh đại diện đang chạy:**

1. Migration thêm `cover_image_url varchar(512)` vào `t_users`, cho phép NULL — hồ sơ không có bìa
   là trạng thái hợp lệ chứ không phải dữ liệu thiếu.
2. `UserEntity.coverImageUrl`, rồi thêm trường tương ứng vào `UserResponse` và
   `PublicProfileResponse` cùng hai chỗ dựng chúng trong `ProfileService`.
3. `PUT /v1/api/profile/cover`, multipart, đối xứng với `/picture`. Dùng lại `MinIOService` và
   bucket `profile-pictures` đã có, đổi prefix `avatars/` (`ProfileService.java:140`) thành
   `covers/` — không cần bucket mới, cũng không phải gọi lại `ensurePublicReadPolicy` cho một
   bucket đã công khai.
4. `userProfileCache.evict(userId)` sau khi lưu. `changeProfilePicture` và `updateProfile` đều gọi;
   thiếu đúng dòng này thì danh sách bạn bè giữ URL cũ cho tới khi cache hết hạn.

**Hằng số nên tách riêng chứ đừng dùng lại của ảnh đại diện.** `MAX_PROFILE_PICTURE_SIZE` là 5MB
(`ProfileService.java:41`), vừa vặn cho một ảnh vuông nhỏ; ảnh bìa là ảnh ngang khổ lớn, từ 1500px
trở lên, nên 5MB là trần chật chứ không phải trần thoải mái. Đề nghị `MAX_COVER_SIZE = 8MB`, giữ
nguyên bộ JPEG/PNG/WEBP. Cả hai vẫn nằm dưới trần `spring.servlet.multipart`, không phải sửa cấu hình.

**Nếu B16 làm trước thì bước 3 biến mất.** Có `POST /v1/api/media` rồi thì ảnh bìa chỉ còn là một
trường `String` trên `UpdateProfileRequest`: FE tải ảnh lên, nhận URL, gửi kèm khi lưu hồ sơ. Đó là
đường gọn hơn và nên ưu tiên nếu hai mục này làm cùng đợt; một endpoint multipart riêng chỉ đáng làm
khi B16 còn xa.

**Một cái bẫy đã có sẵn lời cảnh báo trong chính repo backend, chép lại vì nó áp dụng nguyên vẹn.**
`db/seed-dev/V66__seed_dev_avatars.sql` mở đầu bằng ghi chú: `profile_picture_url` không lưu object
key mà lưu **URL tuyệt đối**, ghép từ `minio.url` tại thời điểm upload — nên mọi giá trị ghi cứng
chỉ đúng với đúng một địa chỉ MinIO, và đó là lý do file đó nằm ở `seed-dev` chứ không phải `seed`.
`cover_image_url` thừa kế y nguyên đặc tính này. Hoặc chấp nhận và để seed ảnh bìa nằm cạnh V66,
hoặc nhân lúc thêm cột mới thì lưu object key rồi ghép URL lúc đọc — nhưng đừng làm một nửa.

**FE đã dựng xong phần của mình, và nó không phải cái đã hứa ở đoạn này.** Bản đầu viết là "gradient
khoá theo `username`, để mỗi hồ sơ có một dải riêng" — đó là cách thông thường, và design system cấm
nó hai lần: _"**No gradients anywhere**"_, rồi ở mục Imagery, _"no patterns, no textures and no
decorative gradients … khi cần một hình thì đó là một khối màu token"_. `Avatar` đã thua đúng lập
luận này trước đó, đúng lý do này — ghi chú của nó giải thích vì sao chữ viết tắt rơi về một mặt
trung tính thay vì màu khoá theo tên. Một sắc màu theo người dùng ở đây sẽ mở lại, thấp hơn 96px
trên cùng một thẻ, câu hỏi mà component kia đã đóng.

Nên `ProfileHero` giờ mở đầu bằng một **dải `surface-sunken`** tràn viền, cao 96 trên điện thoại và
128 từ `sm` — chính là "khối màu token" mà hệ thống cho phép, cùng loại với ô sách chưa có bìa. Hai
route dùng chung một hero nên `/profile` và `/u/{username}` có dải cùng lúc.

Ảnh đại diện **đè lên** dải, và tên bám đáy vòng tròn (`sm:items-end`), kèm một vòng viền bằng chính
nền thẻ để tách khỏi ảnh phía sau. Độ đè là **hàm của chiều cao khối chữ**: tên một dòng cho khoảng
28px đè, tên xuống hai dòng ở `sm` thì hết đè và vòng tròn tụt xuống dưới dải — không vỡ, chỉ là
thôi chạm. Dưới `sm` bố cục là cột nên độ đè cố định bất kể tên dài bao nhiêu. Muốn đè cố định ở mọi
trường hợp thì phải đưa ảnh đại diện ra khỏi dòng chảy, đổi lấy hai con số phải tự bảo trì — ghi
trong `profile-hero.tsx`, chưa làm vì chưa có cái tên nào thật sự xuống dòng.

Prop `coverUrl` đã có sẵn và hôm nay **chưa ai truyền vào**: đó là nhánh ảnh để ngày backend trả URL
thì đổi đúng một chỗ, thay vì hai route mỗi bên mọc một nhánh. Nhánh "không có bìa" phải giữ vĩnh
viễn, vì cột cho phép NULL — và hiện nó là nhánh duy nhất chạy.

**Khi cột có rồi thì seed phải theo**, cùng lý lẽ với S6: ít nhất một tài khoản có bìa và một tài
khoản để NULL, nếu không thì một trong hai nhánh không bao giờ chạy.

### B19 · Cảm xúc: bình luận không đọc được gì, bài viết đọc được nhưng đắt

_Ghi ngày 24/08, sau khi hàng cảm xúc bỏ nhãn chữ và chỉ còn icon (kiểu Facebook)._

**Vì sao một thay đổi giao diện lại đẩy việc sang backend.** Khi nhãn chữ còn đó, `Hữu ích 5` tự
giải thích chính nó. Bỏ chữ đi thì cả thông điệp còn đúng hai thứ — **một glyph** và **một con
số** — và câu hỏi duy nhất người đọc còn lại là _"5 đó gồm những cảm xúc nào?"_. Facebook trả lời
bằng cụm icon chồng lên nhau. Ở đây, cụm đó **không dựng được cho bình luận** và **đắt cho bài
viết**.

**Bài viết — có, nhưng sai chỗ.** `GET /v1/api/posts/{postId}/reactions/summary` đã trả
`Map<ReactionType, Long>`, và `reactionsApi.getSummary` đã bọc sẵn. Nhưng nó tính theo **từng
bài**: một trang bảng tin 10 thẻ là 10 request thêm, chỉ để vẽ ba cái icon nhỏ. Trong khi
`likeCount` đã nằm sẵn trong payload feed — tức là backend đã group-by đúng bảng đó rồi và chỉ
giữ lại phần tổng.

**Bình luận — không có gì cả.** `CommentResponseDto` có `likeCount` (một số tổng) và `myReaction`,
hết. Và đường cảm xúc của bình luận chỉ có hai động từ:

```
PUT | DELETE   /v1/api/posts/{postId}/comments/{commentId}/reactions
```

**Không có `GET`.** Nên với một bình luận thì: không biết 5 đó gồm những gì, không xem được ai đã
thả, và sau khi bấm cũng không đọc lại được con số mới ngoài cách tải lại cả danh sách bình luận.
Bài viết có đủ cả ba (`/summary`, `getReactors` có tham số `type`, và `/reactions/me`); bình luận
không có cái nào — đúng kiểu bất đối xứng B14 đã ghi, chỉ là ở tầng đọc thay vì tầng ghi.

**Đề xuất, theo thứ tự đáng làm:**

1. Thêm `reactionSummary` (map loại → số) vào `FeedPostDataDto` và `PostDto`. Cùng một group-by mà
   `/summary` đang chạy, chỉ là trả kèm trong danh sách thay vì bắt gọi lại từng bài. Đây là phần
   mở khoá cụm icon chồng trên thẻ bài.
2. Thêm `reactionSummary` vào `CommentResponseDto`. Cùng lý do, và rẻ nhất trong ba mục.
3. Mở `GET` trên `/posts/{postId}/comments/{commentId}/reactions`, trả danh sách người thả kèm
   tham số `type`, đối xứng với `getReactors` của bài. Mục này mở khoá hộp thoại "ai đã thả gì"
   cho bình luận — thứ bài viết đã có từ lâu.

**FE đang xoay xở ra sao.** Bài viết: in `likeCount` như cũ, **không** gọi `/summary` cho từng
thẻ — một request mỗi bài để suy lại con số mà chính danh sách đã đưa xuống là cái giá không đáng.
Con số trên thẻ bài **vẫn không nhúc nhích khi bấm**, và `reaction-bar.tsx` ghi rõ là không được
cộng giả ở client — highlight thì trung thực, một con số bịa thì không.

_Sửa lại 24/08, sau khi nối nút cảm xúc cho bình luận._ **Bình luận thì con số ĐÃ nhúc nhích**, và
lý do khác hẳn bài viết chứ không phải vì đổi ý về việc bịa số. `likeCount` của một bình luận nằm
ngay trên hàng mà lệnh ghi tác động, trong đúng cache mà FE đang giữ — nên delta suy ra được chắc
chắn (`+1` khi chưa thả, `0` khi upsert thay loại cũ, `-1` khi gỡ), ghi optimistic rồi
`invalidate` để máy chủ nói tiếng cuối. Thẻ bài không có được điều đó vì `likeCount` của nó sống
trong payload của feed, tức cache của domain khác. Ranh giới vẫn nguyên: optimistic là trung thực
khi client suy ra đúng câu trả lời máy chủ sẽ đưa, và là bịa khi không.

Ba mục đề xuất ở trên **vẫn còn nguyên giá trị** — cụm icon chồng và hộp thoại "ai đã thả gì" cho
bình luận vẫn chưa dựng được.

### B20 · Nhắc tên trong bình luận chỉ là chữ, không ai được báo

_Ghi ngày 24/08, sau khi bật trả lời cho bình luận cấp 2._

**Bối cảnh, vì nó giải thích vì sao mục này mới xuất hiện.** `CommentService.validateParentComment`
từ chối một trả lời có cha cũng là trả lời, nên luồng bình luận sâu đúng hai cấp và không thể ba.
FE vừa mở nút Trả lời cho cả cấp 2 và **làm phẳng** — trả lời mới vẫn treo vào bình luận gốc, và
thứ nói nó trả lời ai là cái tag `@handle` được điền sẵn vào ô soạn. Đây đúng cách Facebook và
TikTok làm, và nó chạy được ngay mà backend không phải đổi gì.

**Cái không chạy được là nửa còn lại của một cái tag.** Trên các sản phẩm kia, gắn tên ai là báo
cho người đó. Ở đây:

- `CreateCommentRequestDto` có **đúng hai trường**: `content` và `parentId?`. Không có
  `mentionedUserIds`, không có chỗ nào để nói "bình luận này nhắc tới ai".
- `CommentResponseDto` cũng không trả về danh sách nào tương ứng.
- `NotificationType` có 12 giá trị — `POST_LIKED · COMMENT_LIKED · POST_COMMENTED · POST_TAGGED ·
FRIEND_REQUEST · FRIEND_ACCEPTED · EVENT_RSVP · EVENT_REMINDER · BOOK_REVIEW · BOOK_PURCHASED ·
SKILL_VERIFIED · SKILL_REJECTED` — và **không có giá trị nào cho việc bị nhắc tên**.

**Bất đối xứng, y hệt kiểu B14 và B19.** Bài viết có cơ chế gắn thẻ thật: `CreatePostRequestDto`
mang `taggedUserIds: number[]`, và `POST_TAGGED` tồn tại để báo cho người bị gắn. Bình luận —
nơi người ta thực sự gọi tên nhau — không có gì cả.

**Hệ quả thực tế:** ai đó trả lời bạn trong một luồng, tag tên bạn, và bạn **chỉ biết nếu tự mở
lại bài đó**. Với một sản phẩm mà phần thảo luận là chỗ uy tín được xây, đó là vòng lặp đứt ở đúng
chỗ nó cần khép.

**Đề xuất, hai phần, phần đầu đã đủ:**

1. Thêm `USER_MENTIONED` (hoặc `COMMENT_MENTIONED`) vào `NotificationType`, và cho
   `CommentService` quét `content` tìm `@handle` khi tạo bình luận, đối chiếu bảng user, phát
   thông báo cho những handle khớp. **Không cần đổi DTO** — FE không phải gửi thêm gì, tag đã nằm
   sẵn trong `content`. Đây là cách rẻ nhất và đúng với dữ liệu đang có.
2. Nếu muốn chắc hơn: thêm `mentionedUserIds` vào `CreateCommentRequestDto` và trả lại trong
   `CommentResponseDto`, để FE gửi id thay vì để backend đoán từ chuỗi. Chỉ đáng làm khi có ô
   gợi ý tên lúc gõ `@` — chưa có, và cũng chưa cần cho buổi bảo vệ.

**Một điểm cần lưu ý dù chọn cách nào:** quét chuỗi sẽ khớp cả những `@` người ta gõ mà không định
tag ai. FE đã thu hẹp mẫu ở `comment-item.tsx` (phải đứng đầu chuỗi hoặc sau khoảng trắng, không
kết thúc bằng dấu chấm) để không biến `ai@example.com` thành liên kết hồ sơ — backend nên dùng
đúng mẫu đó, và chỉ phát thông báo cho handle **thật sự tồn tại**.

**FE đang xoay xở ra sao:** tag hiện là chữ thường trong `content`, được FE tô màu và biến thành
liên kết tới `/u/{handle}` lúc hiển thị. Bấm vào đi đúng hồ sơ; handle sai thì rơi vào trạng thái
rỗng của trang hồ sơ, không vỡ. Cái duy nhất thiếu là thông báo.

### B21 · Hồ sơ công khai không có dòng nghề nghiệp

_Ghi ngày 24/08, khi kéo dài khối tên trong hero hồ sơ._

**UI kit chờ sẵn một dòng mà backend không trả được cho người lạ.** `NX_USER` trong
`templates/app-shell/data.js` mang `role: 'Backend Engineer · Fintech'` bên cạnh tên và handle;
`components/display/DeveloperIdentity.d.ts:10` khai kiểu cho nó (_"Role line, e.g. …"_);
`DeveloperIdentity.prompt.md` xếp nó vào một thứ tự mà chính nó gọi là **doctrine** —
`avatar → name → reputation → time / role → handle` — và liệt kê "profile hero" vào những mặt mà
thứ tự đó cai quản. Hero hồ sơ của kit (`templates/app-shell/Screens.jsx:538`) in nó thật.

**Cái chặn là phạm vi của endpoint, không phải thiếu dữ liệu.** Dữ liệu có đủ và đã chạy:
`t_user_professional_profiles` mang `job_title`, `primary_role`, `seniority_level`,
`years_of_experience`, và `/profile` đang hiện chúng. Nhưng:

```java
// knowledge/controller/ProfessionalProfileController.java
@GetMapping
public ProfessionalProfileResponseDto getProfile() {
  return profileService.getProfile(SecurityUtils.getCurrentUserId());
}
```

Không có biến thể nhận `userId`, và `ProfessionalProfileResponseDto` tự ghi trong javadoc:
_"Owner-facing view of the professional profile — the caller only ever reads their own."_ Nên
`/u/{username}` **không có đường nào** lấy được chức danh của người khác, kể cả vòng.

**Đề xuất: thêm trường vào `PublicProfileResponse`, đừng mở endpoint kia ra.** Cùng lối B2 đã chọn
và vì cùng một lý do — `PublicProfileResponse` là DTO riêng của đúng một endpoint, mỗi request dựng
đúng một hồ sơ, nên nó được phép đắt. Bốn trường: `jobTitle`, `primaryRole`, `seniorityLevel`,
`yearsOfExperience`. Một `findById` thêm vào `ProfileService.getPublicProfile`, không đụng
`PublicUserResponse` đang dùng chung ở 7 nơi.

**Và đây là chỗ cần cân nhắc chứ không chép cả DTO sang.** `ProfessionalProfileResponseDto` còn
mang `workHistory`, `interestedDomains`, `knownTechStack` và `explanationStyle`. Ba cái đầu là hồ
sơ nghề nghiệp thật của một người và **không nên công khai theo mặc định** — người dùng khai chúng
cho AI đọc, không phải để dán lên một trang ai cũng mở được. `explanationStyle` thì thuần tuý là
tuỳ chọn cá nhân, công khai nó vừa vô nghĩa vừa lộ thói quen. Bốn trường ở trên là bộ tối thiểu đủ
dựng một dòng chức danh.

**FE đã dựng sẵn chỗ.** `ProfileHero` có slot `subtitle` đúng vị trí doctrine (trên `@handle`),
`/profile` đang truyền vào từ `useProfessionalProfile()`, còn `/u/{username}` **không truyền gì** —
slot vắng thì không chiếm chỗ, nên hồ sơ người lạ hiện ít hơn hồ sơ của chính mình đúng một dòng.
Ngày backend trả bốn trường kia thì FE thêm một prop, không phải dựng lại gì.

**Cái `/u` có mà không cần chờ ai:** dòng meta dưới handle — `Tham gia tháng … · N kỹ năng đã xác
minh` — dựng từ `createdAt` và `verifiedSkills` vốn đã nằm sẵn trong cùng payload, không tốn thêm
request nào.

### B22 · `CommentResponseDto` không có điểm và cấp độ của người bình luận

_Ghi ngày 24/08, sau khi thêm chip Elite Score vào hàng danh tính của bình luận._

Bài viết và bình luận là **cùng một hàng danh tính** — mặt, tên, chip điểm, thời gian — nằm cách
nhau bốn dòng trên cùng một màn hình. Nhưng chỉ một trong hai có dữ liệu để vẽ chip.

`FeedPostDataDto` mang sẵn `authorEliteScore` và `authorLevelName` (B13 ghi lại chính danh sách
đó), và `SearchResponse` cũng vậy — nên thẻ bài dựng chip từ dữ liệu nó đã cầm, không gọi
`ReputationController` lần nào. `CommentResponseDto` có mười trường:

```
id · postId · authorId · authorUsername · authorFullName · authorProfilePictureUrl
content · parentId · createdAt/updatedAt · likeCount · myReaction
```

**Không có `authorEliteScore`, không có `authorLevelName`.** Nên hàng danh tính của bình luận
không có cách nào vẽ chip từ dữ liệu sẵn có — không có dữ liệu nào cả.

**Đường vòng của FE có, và nó tốn N request.** `ReputationController` chỉ có đúng một đường,
`GET /v1/api/users/{userId}/reputation`, không có biến thể nhận danh sách id. FE thêm
`useReputations` trong `features/reputation`: gom mọi `authorId` sắp render, khử trùng lặp, rồi
bắn song song. Thread 6 bình luận của 4 người là 4 request. Đo trên máy: mỗi request ~9ms, và
`staleTime` 60s toàn app khiến 4 người đó miễn phí trong cả phút sau, kể cả ở bài khác.

Chi phí thật, nhưng có chặn trên và **cố ý dồn vào một chỗ**: `CommentThread` hỏi một lần cho cả
thread và truyền xuống làm props, `CommentItem` không fetch gì — đúng luật mà `PostCard` đang
theo. Đặt hook vào từng hàng cũng chạy (React Query tự khử trùng lặp) nhưng khi đó chi phí vô
hình, rải khắp bao nhiêu hàng tình cờ render.

**Đề xuất: thêm hai cột vào `CommentResponseDto`, đúng cái join mà mapper của bài đã chạy.**
`FeedPostDataMapper` đang join sang bảng người dùng để lấy `authorLevelName` — B13 nói thẳng điều
đó khi thêm `authorUsername`. `CommentService.toResponseDto` cần cùng một join. Rẻ hơn nhiều so
với N lượt gọi `ReputationService.getReputation`, mà chính backend cũng đang chạy lại query đó N
lần cho cùng một màn hình.

Đây là mục rẻ nhất trong đợt này: hai cột, một join đã có tiền lệ trong cùng codebase. Ngày nó
lên, `useReputations` mất caller duy nhất và xoá được — `features/reputation/index.ts` đã ghi sẵn
dòng đó trong javadoc.

---

## Dữ liệu seed còn thiếu để kiểm được các màn vừa dựng

Mấy tính năng dưới đây **không hỏng** — chúng chỉ không có dữ liệu nào trong seed hiện tại chạm
tới được, nên không ai nhìn thấy chúng hoạt động, kể cả người đi demo. Mỗi mục ghi kèm ngưỡng đo
thật, để seed không rơi vào vùng "vừa đủ để không kích hoạt".

### S1 · Bài có nội dung dài — kẹp 280px + "Xem thêm"

Nội dung **dài nhất trong seed hiện tại là 101 ký tự**. Ngưỡng kẹp là 280px, tức khoảng 11 dòng ở
`15px/1.6` trên cột 672 — cỡ **750–800 ký tự**. Cần ít nhất một bài **≥ 1200 ký tự**, và nên có một
bài ~600 ký tự để kiểm đúng phía dưới ngưỡng (không được hiện "Xem thêm").

### S2 · Snippet dài — kẹp 320px + "Xem thêm"

Snippet dài nhất trong seed khoảng 6 dòng. Ngưỡng 320px ở `13px/1.6` là khoảng **15 dòng**. Cần một
snippet **≥ 30 dòng**, và một snippet có **một dòng rất rộng** (>120 ký tự, không xuống dòng) để
kiểm cuộn ngang bên trong phần đã kẹp.

### S3 · Snippet đủ ngôn ngữ — kiểm tô màu

Bảng màu chạy theo grammar của `highlight.js`. Tối thiểu mỗi thứ một bài: `java`, `typescript`,
`python`, `sql`, `shell`, `json`, `css`. Cộng thêm **hai ca biên**:

- một snippet `plaintext` — phải ra chữ đen trơn, không màu;
- một snippet có `language` **ngoài danh sách** (ví dụ `elixir`, `zig`) — phải ra chữ trơn chứ
  không được vỡ. `language` là String tự do phía backend nên đây là ca có thật.

### S4 · Bình luận — xem trước 2 dòng

Cần đủ bốn ca: một bài **0 bình luận** (phải ra nút "Xem bình luận", không có khối xem trước), một
bài **đúng 1**, một bài **đúng 2** (không được hiện "Xem tất cả" như thể còn nữa), một bài **≥ 5**.
Thêm một bình luận **dài ≥ 300 ký tự** để kiểm `line-clamp-2`, và một bài mà **hai bình luận đầu
tiên đều là trả lời** (`parentId != null`) — khối xem trước chỉ được lấy bình luận gốc.

### S5 · Cảm xúc — nút đơn + khay hover

Nút hiển thị **đúng cảm xúc người đang đăng nhập đã chọn**, nên seed cần cho tài khoản demo
(`backend_truc_anh@seed.test`) sẵn một reaction **không phải `LIKE`** trên ít nhất một bài — ví dụ
`INSIGHT` hoặc `ANGRY` — để thấy nhãn nút đổi theo. Hiện chưa rõ có bài nào như vậy. Cũng cần một
bài **0 cảm xúc**, để kiểm con số ở dạng không bấm được.

### S6 · Ảnh đại diện — ảnh và chữ viết tắt

Avatar trên thanh trên cùng vừa tăng lên 32. Cần trong seed cả hai: một tài khoản **có**
`profilePictureUrl` và một tài khoản **không có** (rơi về chữ viết tắt). Kèm một tài khoản có
**họ tên rất dài** để kiểm cắt chữ ở dòng danh tính.

### S7 · Sách — thông điệp kho lưu trữ hỏng

Bucket MinIO đã được tạo nên `/library` chạy lại bình thường, và **ca 503 giờ không dựng lại được**.
Nhánh dịch đã kiểm bằng cách chặn request và ép 503, nhưng nếu muốn kiểm thật thì cần một quyển có
`file_key` trỏ tới object không tồn tại.

### S8 · Giải thích AI có Markdown

Thẻ giải thích giờ render Markdown (`react-markdown` + `remark-gfm`), nhưng **cả 8 bản trong seed
đều là chữ trơn** — mỗi bản 295 ký tự, không có `**`, không có gạch đầu dòng, không có tiêu đề.
Bản do Gemini sinh ra lúc chạy thật thì đầy Markdown, đó chính là lý do người dùng nhìn thấy `***`.

Nghĩa là đường render mới chỉ kiểm được bằng dữ liệu giả. Cần ít nhất một bản đã lưu có:
`**đậm**`, danh sách `*`, tiêu đề `##`, một khối code ba dấu nháy, và một bảng — để thấy đủ bảy
kiểu phần tử được ánh xạ.

### S9 · Bình luận dài và bài dài, cho hai màn vừa đổi

Nhắc lại S1/S4 vì hai thay đổi mới phụ thuộc vào chúng: cỡ chữ bình luận vừa tăng lên `body` (15)
nên cần một bình luận dài để thấy nhịp dòng mới, và khối xem trước hai bình luận vẫn chưa có ca
`đúng 2` để kiểm.

### S10 · Không có một tấm ảnh nào trong toàn bộ seed

**Đo ngày 24/08 trên backend đang chạy ở `localhost:8080`**, qua `GET /v1/api/users/{id}/posts`
(công khai, không cần đăng nhập) cho dải id `9000–9030`:

```
29 tác giả · 80 bài
images (bài thường)          0
articleDetails.coverImage    0
linkDetails.thumbnailUrl     0
```

Cả ba đường dẫn ảnh mà backend đã hỗ trợ sẵn đều rỗng trên mọi bài. Cộng với S6 (chưa tài khoản
nào có `profilePictureUrl` — thẻ nào cũng rơi về chữ viết tắt), sản phẩm hiện **không hiện một tấm
ảnh nào ở bất kỳ đâu**, và `docs/demo-script.md` lại có một ô kiểm là _"bảng tin có bài, có ảnh"_.

Đây là mục **rẻ nhất** trong cả trang này: không cần backend đổi mã, chỉ cần seed điền URL vào
những trường đã chạy được. Cần trong seed:

- vài bài `REGULAR` có `images` — một bài **1 ảnh**, một bài **2 ảnh**, một bài **≥ 4 ảnh**, để
  kiểm ba nhánh bố cục khác nhau chứ không phải một;
- một bài có **URL ảnh hỏng**, để kiểm nhánh dự phòng thay vì một ô vỡ;
- một bài `ARTICLE` có `coverImage` và một bài `LINK` có `thumbnailUrl` — hai nhánh này FE đã dựng
  xong và chưa ai nhìn thấy chúng chạy;
- ít nhất một tài khoản có `profilePictureUrl` (đây chính là S6, nhắc lại vì cùng một lần seed).

**Phạm vi của phép đo, nói cho đủ:** chỉ quét dải id trên, và 1 trong 31 request lỗi. Không loại
trừ được khả năng còn tác giả ngoài dải đó — nhưng 80/80 bài không có ảnh thì kết luận "seed không
có ảnh" là an toàn.

---

## Bảng tổng

|     | Mục                           | Ảnh hưởng demo | FE có đường vòng?     |
| --- | ----------------------------- | -------------- | --------------------- |
| B1  | Seed dev                      | Chặn mọi thứ   | Không                 |
| B2  | Hồ sơ công khai đủ trường     | Cao            | Có — thêm 1 request   |
| B3  | Tìm kiếm có sách              | Vừa            | Không — ship 2 tab    |
| B4  | `updatedAt` cho bài           | Vừa            | Không                 |
| B5  | Thêm 2 cảm xúc                | Thấp           | Có — đổi nhãn         |
| B6  | SSE thông báo                 | Thấp           | Có — poll             |
| B7  | Lọc feed theo kỹ năng         | Thấp           | Không — ẩn tab        |
| B8  | Báo cáo bài viết              | Thấp           | Không                 |
| B12 | Sửa bài xoá đáp án quiz       | Hỏng dữ liệu   | Không — chỉ báo rõ    |
| B13 | Feed thiếu `authorUsername`   | Vừa            | Không                 |
| B14 | Bình luận không có like       | Vừa            | Không                 |
| B15 | AI không chọn được ngôn ngữ   | Cao            | Không                 |
| B16 | Không có đường tải ảnh lên    | Vừa            | Có — dán URL          |
| B17 | Không unfurl được liên kết    | Vừa            | Không — CORS          |
| B18 | Hồ sơ chưa có ảnh bìa         | Thấp           | Có — dải trống        |
| B19 | Cảm xúc: không có breakdown   | Vừa            | Không — bình luận     |
| B20 | Tag trong bình luận không báo | Vừa            | Một nửa — tag là chữ  |
| B21 | Hồ sơ lạ không có chức danh   | Thấp           | Không — owner-only    |
| B22 | Bình luận không có điểm/cấp   | Vừa            | Có — N request/thread |
