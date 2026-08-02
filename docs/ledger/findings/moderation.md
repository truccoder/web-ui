# findings — `moderation`

Nợ kỹ thuật, cạm bẫy và quyết định đã chốt của domain `moderation`
(BE package `com.socialapp.moderation`, `AdminModerationController`, 4 endpoint).
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

Mở lần đầu ở **P2.15ab**, 2026-07-30. Mọi mục **đo bằng API thật + SQL + đọc Java**.

---

## 1. Domain admin DUY NHẤT có cổng backend thật sự hoạt động

Ngược hẳn với `roadmap` (B20). `AdminModerationController` **không có `@PreAuthorize` nào** —
và không cần: `SecurityConfig` khớp `/v1/api/admin/**` và yêu cầu `hasRole("ADMIN")`, mà gác
theo **URL** là nửa còn hoạt động của Spring Security trong dự án này.

→ **Đừng "thống nhất" hai domain.** Ai thấy `roadmap` gác bằng hook rồi bắt chước ngược lại vào
đây, hoặc thấy đây không có annotation rồi kết luận nó cũng hở như `roadmap`, đều sai. Hook gác
role ở FE cho domain này là **tiện lợi**, không phải thứ duy nhất chặn người dùng.

## 2. `decision` trông như thang 6 mức, thực chất là nhị phân (quyết định UI)

`AdminReviewRequestDto.decision` là enum `Likelihood`:

```
UNKNOWN(-1) · VERY_UNLIKELY(0) · UNLIKELY(1) · POSSIBLE(2) · LIKELY(3) · VERY_LIKELY(4)
```

`AdminModerationService.reviewPost` thu ngay về `decision.isAtLeast(LIKELY)`:

| gửi lên                                         | kết quả  |
| ----------------------------------------------- | -------- |
| `UNKNOWN` `VERY_UNLIKELY` `UNLIKELY` `POSSIBLE` | APPROVED |
| `LIKELY` `VERY_LIKELY`                          | REJECTED |

Và **không nơi nào lưu giá trị admin đã chọn** — `saveModerationLog` chỉ ghi
`APPROVED`/`REJECTED`. Bốn giá trị dưới ngưỡng không phân biệt được sau khi gọi, hai giá trị
trên ngưỡng cũng vậy.

→ **Chốt: UI hiện đúng 2 nút, gửi `VERY_UNLIKELY` / `VERY_LIKELY`** (hai đầu rõ nghĩa nhất của
thang). Dựng picker 6 mức là mời kiểm duyệt viên diễn đạt một sắc thái mà hệ thống vứt đi — cùng
loại lỗi với ô `bountyPoints` (ds-deviation #12). Legacy đã làm đúng chỗ này, giữ nguyên cách.

## 3. B22 — TỪ CHỐI LUÔN GHI `HATE_SPEECH`, BẤT KỂ BÀI VI PHẠM GÌ

Endpoint **không nhận violation type**. `reviewPost` hardcode:

```java
userBanService.recordViolation(post.getAuthorId(), post.getId(),
    ViolationType.HATE_SPEECH, "Admin manual review: " + feedback);
```

Đo thật: từ chối bài **spam** (`"This deal is insane, buy now buy now"`) với feedback ghi rõ
`"Spam thuong mai, khong phai hate speech"` →

```
t_user_violations: violation_type=HATE_SPEECH, severity=CRITICAL
```

`severity` suy ra từ violation type, nên bài spam được xếp **CRITICAL**. Lịch sử vi phạm của
người dùng bị bóp méo, và đó là thứ quyết định ban.

→ **`feedback` là nơi DUY NHẤT ghi được lý do thật** dù nó `optional`. UI nên khuyến khích điền.
Đã gửi BE thành **B22**.

## 4. Từ chối có thể khoá tài khoản — không phải chỉ đổi trạng thái

`recordViolation` → `evaluateAndBanIfNeeded` → đủ `VIOLATIONS_BEFORE_BAN` thì `issueBan`.
Theo `session-constants`: **2 vi phạm = ban 7 ngày**, và ban chặn cả `/auth/login`.

Đo: **1 vi phạm chưa ban** (`t_user_bans` vẫn 0 dòng, `banned_until` null). Đúng ngưỡng 2.

→ Nút "Từ chối" là hành động có thể **khoá người dùng khỏi sản phẩm**. UI phải nói rõ hệ quả,
không render nó như một nút đổi trạng thái bình thường.

## 5. Dòng log của MÁY và của NGƯỜI khác nhau — nullability không đối xứng

Cùng bảng, hai nguồn ghi:

```
máy:   status=PENDING_REVIEW, violationType=null, textToxicityScore=0.550,
       imageSafeScore=0, ruleViolations=[], reviewedAt=null
người: status=REJECTED, violationType=HATE_SPEECH, textToxicityScore=null,
       imageSafeScore=null, reviewedAt=<có>
```

→ Một `history` trộn hai loại dòng. UI **phải render sự vắng mặt**, không được coi null là 0 —
"độ độc hại 0" và "chưa chấm" là hai chuyện khác nhau. `ruleViolations` là `[]` chứ không null.

## 6. Phân trang 1-based vào, 0-based ra (giống notifications)

`@RequestParam(defaultValue="1") @Positive` rồi `PageRequest.of(page-1, size)`.
Đo: `page=1` → `"number": 0`; **`page=0` → 400**, không phải trang đầu.

## 7. `banned-users` liệt kê cả người đã hết hạn ban

`getBannedUsers` trả **mọi user từng bị ban**; `currentlyBanned` tính từ `user.isBanned()` lúc
đọc. Ban hết hạn vẫn nằm trong danh sách với `currentlyBanned=false`, `remainingSeconds=0`.

→ **Đọc `currentlyBanned`, đừng coi việc có mặt trong danh sách là đang bị ban.**
→ `remainingSeconds` tính lúc đọc (`Duration.between(now, bannedUntil)`) nên là ảnh chụp, cũ dần
ngay khi tới. Dùng cho "còn khoảng 6 ngày" thì được, làm đồng hồ đếm ngược thì sai.
→ Endpoint **không có filter nào** ngoài phân trang — không có `?currentlyBanned=`. Lọc phía
client chỉ lọc được trong một trang, nên không đầy đủ; surface trung thực là hiện cả danh sách
và đánh dấu trạng thái từng dòng.

## 8. Chỉ `PENDING_REVIEW` mới review được → 409

Đo: review lại bài vừa REJECTED →
`409 {"message":"Post is not in PENDING_REVIEW status"}`.
Cùng hình dạng với hàng chờ roadmap: hai admin làm cùng danh sách thì người thứ hai nhận lỗi chứ
không phải no-op. UI phải hiện lỗi.

## 9. Chi phí server mỗi dòng, và `authorName` có thể là chữ "Unknown"

`toDetailDto` mỗi bài: 1 query tìm tác giả + 1 query đọc **toàn bộ** history. Không join, không
batch → `size` lớn là đắt thật. Đừng kéo 100 dòng về rồi lọc ở client.

`authorName` fallback ra **chuỗi `"Unknown"`** khi không tìm thấy tác giả — không phân biệt được
với người tên Unknown, đừng cố.

## 10. Dữ liệu dev

2 bài `PENDING_REVIEW` (id 1 spam, id 2 lăng mạ) do seed. `t_user_bans` và `t_user_violations`
**rỗng**. Mọi thứ tôi tạo khi đo ở P2.15ab đã xoá và trả nguyên trạng (9 dòng
`t_moderation_logs`, đúng số ban đầu).
