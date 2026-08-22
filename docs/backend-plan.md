# Kế hoạch backend — Elite Nexus

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

---

## Bảng tổng

|     | Mục                       | Ảnh hưởng demo | FE có đường vòng?   |
| --- | ------------------------- | -------------- | ------------------- |
| B1  | Seed dev                  | Chặn mọi thứ   | Không               |
| B2  | Hồ sơ công khai đủ trường | Cao            | Có — thêm 1 request |
| B3  | Tìm kiếm có sách          | Vừa            | Không — ship 2 tab  |
| B4  | `updatedAt` cho bài       | Vừa            | Không               |
| B5  | Thêm 2 cảm xúc            | Thấp           | Có — đổi nhãn       |
| B6  | SSE thông báo             | Thấp           | Có — poll           |
| B7  | Lọc feed theo kỹ năng     | Thấp           | Không — ẩn tab      |
| B8  | Báo cáo bài viết          | Thấp           | Không               |
