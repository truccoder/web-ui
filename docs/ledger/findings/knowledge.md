# Nợ kỹ thuật & phát hiện — knowledge

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md). Yêu cầu gửi BE gom ở
[`be-requests.md`](../be-requests.md).

Mọi con số dưới đây **đo trên BE thật ngày 2026-07-28** (P2.11a), không suy từ tên. Dữ liệu probe
(1 token, 1 lần ghi đè hồ sơ) **đã hoàn nguyên** — token thu hồi, hồ sơ 9001 đặt lại đúng giá trị
seed.

## 1. Bốn controller, 10 endpoint — và **2 trong số đó trình duyệt KHÔNG gọi được**

| controller                      | path                           | ep  |
| ------------------------------- | ------------------------------ | --- |
| `ExplanationController`         | `/v1/api/knowledge`            | 3   |
| `KnowledgeSyncController`       | `/v1/api/knowledge/sync`       | 2   |
| `PersonalAccessTokenController` | `/v1/api/tokens`               | 3   |
| `ProfessionalProfileController` | `/v1/api/profile/professional` | 2   |

Hai controller sau có path **trông như security** nhưng nằm trong package `knowledge` — đã ghi ở
boundary note của ledger. Mirror theo package (CLAUDE.md §4), không tách feature mới.

## 2. `/knowledge/sync/**` dùng **Personal Access Token**, KHÔNG dùng JWT phiên

Phát hiện quan trọng nhất của domain này, và nó quyết định phạm vi FE.

`SecurityConfig` để `/v1/api/knowledge/sync/**` là **`permitAll`**, còn
`KnowledgeSyncController` tự đọc header `Authorization`, cắt `"Bearer "`, rồi đưa cho
`PersonalAccessTokenService.validateToken`. Tức đây là **hệ xác thực thứ hai**, song song với JWT.

Đo thật:

```
[404] GET /knowledge/sync/pull   Authorization: Bearer <JWT phiên>   → {"message":"Invalid token"}
[400] GET /knowledge/sync/pull   (không header)                      → "Missing required header 'Authorization'"
[200] GET /knowledge/sync/pull   Authorization: Bearer sk_7tDWi2...  → {"explanations":[],"syncedAt":"..."}
```

**JWT phiên bị từ chối thẳng.** Hai endpoint này dành cho **client bên ngoài** (một plugin Obsidian
— DTO gọi thẳng là `VaultNoteDto`/`VaultPushRequestDto`), không phải cho trình duyệt.

→ **FE cố ý KHÔNG viết hàm API cho `pull` và `push`.** Muốn gọi được thì trình duyệt phải giữ một
**PAT dài hạn** trong localStorage — bí mật sống lâu hơn và mạnh hơn JWT, để đổi lấy đúng dữ liệu
mà `GET /knowledge/my-library` đã trả sẵn bằng chính JWT đang có. Đây là **8 hàm / 10 endpoint**,
cùng loại quyết định với `POST /payments/momo/webhook` của bookstore.

**Ảnh hưởng tới con số toàn dự án**: ledger đang ghi "mục tiêu thật là 99, không phải 101" vì 2
endpoint không dành cho FE. Với 2 endpoint này thì thành **4 → mục tiêu 97**. Cần chốt lại ở
**P4.7**; ghi ra đây để lúc đó không ai đếm nhầm thành thiếu sót.

Việc của FE trong luồng vault là **cấp và thu hồi token** (`/v1/api/tokens`), không phải đồng bộ.

### `VaultPermission` đặt tên theo góc nhìn của VAULT, không phải của app

`push` (client ghi ngược vào app) đòi `BIDIRECTIONAL`; token `WRITE_ONLY` bị **403**. Nghĩa là
`WRITE_ONLY` = "chỉ ghi **vào vault**" = chỉ `pull` được. Đọc theo góc nhìn app thì tên nghe ngược.
UI cấp token phải diễn đạt bằng hành vi ("chỉ đọc từ app" / "hai chiều"), đừng hiện tên enum trần.

## 3. `PUT /profile/professional` là **GHI ĐÈ TOÀN BỘ**, không phải partial update

Vấp thật khi đo, và nó **xoá dữ liệu**. Gửi 3 field:

```json
{ "primaryRole": "BACKEND", "seniorityLevel": "SENIOR", "yearsOfExperience": 5 }
```

Kết quả trả về:

```json
{ "jobTitle": null, "knownTechStack": null, "workHistory": null, "interestedDomains": null, ... }
```

**Bốn field không gửi bị null sạch** — trước đó `jobTitle` là `"Backend Developer"` và
`knownTechStack` là `["Java","Spring Boot","PostgreSQL","Docker"]`. Đây **cùng một họ lỗi** với
`updatePost` của posts ([B2](../be-requests.md#b2)): DTO để mọi field optional nên caller quên là
compile được, còn service copy cả null.

Khác `PUT /notifications/preferences` — cái đó bọc `Objects.nonNull(...)` nên là partial update
thật ([`findings/notifications.md`](notifications.md) §11). **Hai endpoint PUT, hai ngữ nghĩa
ngược nhau**; đừng suy từ cái này sang cái kia.

→ **Luật cho tầng type**: `UpdateProfessionalProfileInput` **bắt buộc mọi key** (`Required<...>`),
đúng cách `PostEditorState` đã làm sau khi vấp cùng lỗi này ở P2.4′c-4. Form phải nạp hồ sơ hiện
tại rồi gửi lại **trọn vẹn**, không bao giờ gửi mảnh.

`seniorityLevel` còn là `@NotNull` nên partial update **không thể** kể cả khi muốn.

## 4. `GET /profile/professional` **404 khi chưa có hồ sơ** — không tự tạo

`getProfile` là `findById().orElseThrow(NotFoundException)`. **Ngược với**
`GET /notifications/preferences`, cái đó `getOrCreate` nên không bao giờ 404 (§8 của notifications).

→ UI phải có trạng thái "chưa có hồ sơ" thật sự, và **404 ở đây không phải lỗi** mà là "chưa tạo".
Đường tạo là chính `PUT` (`upsertProfile`).

## 5. Mã lỗi: **422** cho ràng buộc, **400** cho sai kiểu — giống bookstore/search

| gửi gì                                    | mã      | body                                                                                                                       |
| ----------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `primaryRole: "KHONG_TON_TAI"` (sai enum) | **400** | `"Malformed request body"`, `details: null`                                                                                |
| `yearsOfExperience: -3`                   | **422** | `details: ["Property yearsOfExperience: must be greater than or equal to 0", "Property seniorityLevel: must not be null"]` |
| `POST /tokens` thiếu `name`               | **422** | `details: ["Property name: must not be blank"]`                                                                            |

Vẫn là ranh giới **bean-validation vs deserialization**. `getErrorDetails` (dựng ở P2.10c-2, nằm
trong `shared/lib/api-error.ts`) dùng lại được nguyên vẹn — **422 trả nhiều dòng cùng lúc**, nên UI
phải chịu được mảng nhiều phần tử chứ không chỉ một.

## 6. PAT chỉ hiện **ĐÚNG MỘT LẦN** — quyết định UI, không phải chi tiết

`POST /tokens` trả:

```json
{
  "id": 1,
  "token": "sk_7tDWi2bqSL5MpTnFuh0NtlVu1ezr0qtRrSrV250vWkc",
  "name": "P2.11 probe",
  "expiresAt": "..."
}
```

`GET /tokens` trả list **không có `token`**:

```json
[
  {
    "id": 1,
    "name": "P2.11 probe",
    "expiresAt": "...",
    "lastUsedAt": null,
    "vaultPermission": "BIDIRECTIONAL",
    "createdAt": "..."
  }
]
```

→ Bí mật **không lấy lại được**. UI tạo token phải hiện nó ngay, nói rõ là lần duy nhất, và có nút
copy. Đây là lý do `CreateTokenDialog` là một component riêng chứ không phải một dòng trong list.

`DELETE /tokens/{id}` không tồn tại → **404** (không phải 200 im lặng như `markAsRead` của
notifications).

## 7. `POST /knowledge/posts/{id}/explain` **GỌI GEMINI** — tốn quota mỗi lần bấm

`ExplanationService.explainPost` dựng prompt rồi `geminiClient.generateContent(prompt)`. Nghĩa là
**mỗi lần bấm "Giải thích" là một lần tiêu quota thật**, khác mọi endpoint đọc khác trong app.

Đo được điều hữu ích: post không tồn tại → **404 "Post not found"**, và tra post xảy ra **trước**
khi gọi Gemini, nên nhánh lỗi id sai **không** tốn quota.

→ Khi verify P2.11c-2 phải **hạn chế tối đa** số lần gọi thật, và UI không được để nút này bấm lặp
dễ dàng (không auto-retry, disable trong lúc chạy). Ghi ở đây vì `session-constants` chỉ cảnh báo
Gemini ở đường **kiểm duyệt bài**, chưa nhắc đường này.

`POST /knowledge/save` là đường **lưu lại** kết quả — tách riêng khỏi `explain`, nên giải thích
xong **không tự lưu**; người dùng chọn lưu.

## 7b. Quyết định của tầng state (P2.11b)

- **`useProfessionalProfile` TẮT retry riêng cho 404.** 404 là câu trả lời hợp lệ ("chưa có hồ
  sơ", §4), mà endpoint không bao giờ tự tạo — nên người chưa điền form sẽ nhận 404 **mãi mãi**.
  Để nguyên `retry: 1` dùng chung thì mỗi lần vào trang là **hai** request vô ích và thời gian
  loading gấp đôi trước khi UI dám nói sự thật. Các status khác vẫn giữ 1 lần retry vì chúng thật
  sự có thể là lỗi tạm.
- **Không bịa hồ sơ rỗng khi 404.** Hook vẫn báo `isError`, consumer phân biệt bằng
  `isProfileMissing(error)`. Nếu trả về một object rỗng thì "chưa từng điền" và "điền rồi xoá
  sạch" thành không phân biệt được, mà form cần biết để chọn giữa tạo mới và ghi đè.
- **`useExplainPost`: mutation + `retry: 0`.** Mỗi lần gọi **tiêu quota Gemini thật** (§7). Là
  mutation nên không chính sách refetch nào bắn được nó; `retry: 0` đè lên `retry: 1` dùng chung vì
  retry sau timeout sẽ **trả tiền lần thứ hai** cho một request có thể đã thành công ở server —
  tệ nhất là hai lần sinh cho một cú bấm. Kết quả cũng **không cache**: đặt nó dưới một query key
  là mời một lần refetch sau này cho thao tác chỉ được chạy khi có người yêu cầu.
- **`useCreateToken` KHÔNG cache bí mật.** `POST /tokens` là response duy nhất chứa `token`; ghi
  vào query cache là để một credential dài hạn nằm trong bộ nhớ (và trong mọi bản dump devtools)
  rất lâu sau khi dialog đóng. Chỉ invalidate list (list không có bí mật); giá trị thô sống trong
  state của component, đúng bằng thời gian dialog mở.
- **`useUpdateProfessionalProfile` dùng `setQueryData` từ response**, vì response chính là hồ sơ
  sau khi ghi, có thẩm quyền — và nó lật query ra khỏi trạng thái 404 ngay lần tạo đầu tiên mà
  không cần thêm một vòng request.
- **Key tách 3 nhánh độc lập**, không gom tiền tố như bookstore: ở đây không thao tác nào đụng
  sang nhánh khác (lưu giải thích không đổi hồ sơ hay token). Chép hình dạng gom của bookstore vào
  đây là invalidate những query không thể đã đổi.

### Đo thật (route preview tạm, đã xoá)

| trạng thái                                        | kết quả                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| có hồ sơ                                          | `status success`, `jobTitle "Backend Developer"`; tokens `[]`; library `total 0` ✔                                        |
| **không có hồ sơ** (xoá tạm hàng DB rồi phục hồi) | `status "error"` · `isError true` · `isProfileMissing true` · **`failureCount 1`** · **đúng 1 request** rời trình duyệt ✔ |

**Phát hiện phụ đáng giá — tắt retry đi vòng qua luôn bug `paused`:** trạng thái 404 ở trên có
`fetchStatus: "idle"`, **không phải `"paused"`**. Bug parked-query ghi ở
[`findings/notifications.md`](notifications.md) §14 xảy ra lúc React Query **lên lịch retry**; không
có retry thì không có gì để park, nên query đi thẳng tới `error`. Đây cũng là lời giải thích ngược
cho ca bookstore: nó bị treo **chính vì** còn `retry: 1` mặc định. Không phải cách sửa chung — cách
sửa vẫn là `networkMode: 'always'` ở checkpoint hạ tầng — nhưng giải thích vì sao nhánh 404 của
domain này hoạt động đúng trong khi nhánh lỗi của bookstore thì không.

Hàng `t_user_professional_profiles` của 9001 **đã phục hồi nguyên trạng** (kể cả `known_tech_stack`
4 phần tử và `created_at` gốc).

## 8. Cách tách checkpoint (công bố ở P2.11a, trước khi viết code)

10 endpoint **< trần 12** của lớp data/state → `a` và `b` mỗi lớp một checkpoint. Lớp UI trần
**2 màn hoặc 5 component** nên tách đôi:

| checkpoint   | nội dung                                                                                     | đếm theo trần |
| ------------ | -------------------------------------------------------------------------------------------- | ------------- |
| **P2.11a**   | `types/` + `api/` — 10 endpoint, **8 hàm** (sync pull/push cố ý không có, §2)                | 10 ≤ 12 ✔     |
| **P2.11b**   | `hooks/` trên tầng api                                                                       | 10 ≤ 12 ✔     |
| **P2.11c-1** | **hồ sơ nghề nghiệp + token**: `ProfessionalProfileForm` · `TokenList` · `CreateTokenDialog` | 3 ≤ 5 ✔       |
| **P2.11c-2** | **giải thích**: `ExplainPostAction` · `ExplanationCard` · `KnowledgeLibrary`                 | 3 ≤ 5 ✔       |
| **P2.11d**   | wiring: **route mới `/knowledge`** gom cả 3 mặt + cập nhật ledger                            | 1 màn ≤ 2 ✔   |

**Vì sao `d` phải TẠO route mới thay vì rewire**: domain này **chưa từng có UI nào** — giống
`notifications` trước P2.6cd, và giải pháp cũng giống (tạo `/notifications`). Chỗ "tự nhiên" của
form hồ sơ nghề nghiệp là `/profile`, nhưng trang đó do `security` sở hữu và phần lắp ghép nhiều
domain của nó là **P3.2**. Đặt tạm vào đó rồi chuyển đi là churn; nên `/knowledge` giữ cả ba mặt,
và P3.2 sau này chỉ cần **dùng lại component qua barrel** nếu muốn hiện thêm ở `/profile` — không
phải di chuyển code.
