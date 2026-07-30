# Cảnh báo drift của `schema.gen.ts` — đã hỏng, ĐÃ SỬA (2026-07-24)

Lịch sử. Quy trình đang dùng: chạy lệnh sinh lại trước mỗi domain, `git diff` phải rỗng
(xem [`prompts/session-constants.md`](../prompts/session-constants.md)).

> **Trạng thái: đã sửa và verify.** Regenerate hai lần qua một lần restart JVM cho ra
> file **byte-identical**; regenerate đè lên baseline mới cho **diff rỗng**. Chi tiết ở
> cuối mục.

### Vấn đề (phát hiện ở P2.1a)

`git diff src/core/api/schema.gen.ts` **không dùng được làm chuông báo drift** như
CLAUDE.md Phase 4.1 giả định. Chạy lại lệnh sinh ở P2.1a cho diff 12.881 dòng thêm /
12.951 dòng bớt, trong khi backend **không đổi gì** — đã chứng minh bằng cách so hai
file dưới dạng multiset các dòng: giống hệt nhau, không field nào thêm/mất/đổi tên.

Hai nguyên nhân cộng dồn:

1. **`lint-staged` chạy `prettier --write` trên `*.ts`**, nên file được commit không bao
   giờ là thứ generator sinh ra: 12.894 dòng → 12.964 dòng, nháy kép → nháy đơn, thụt
   lề 4 → 2. CLAUDE.md cấm sửa tay file này; prettier sửa hộ cũng là sửa.
2. **springdoc xuất property trong schema theo thứ tự không ổn định** — `first`, `last`,
   `pageNumber` đổi chỗ giữa hai lần chạy dù nội dung y hệt.

Hệ quả: mỗi lần regenerate đều ra ~13k dòng nhiễu, nên drift thật sẽ chìm nghỉm. Đây
đúng là loại lệch âm thầm mà springdoc được đưa vào để chống.

### Đã sửa thế nào

- **FE** — tạo `.prettierignore` với `src/core/api/schema.gen.ts`. Verify: `prettier
--write` lên file này giữ nguyên 12.894 dòng (trước đó thành 12.964); `eslint --fix`
  cũng không đổi byte nào (md5 trước/sau khớp). `lint-staged` gọi cả hai công cụ này nên
  cả hai đều phải im.
- **BE** — `springdoc.writer-with-order-by-keys: true` trong `application.yml`. Sau khi
  bật: tên schema, key path, **và property trong từng schema** đều sắp xếp alphabet
  (0 schema còn property lệch thứ tự). Thứ tự sắp xếp là duy nhất nên không còn phụ
  thuộc thứ tự reflection của từng lần chạy JVM.
- **Baseline** — commit lại `schema.gen.ts` đúng bản thô generator sinh ra từ spec đã
  sắp xếp. Đây là commit **một lần** ~12.9k dòng, thuần định dạng + thứ tự: đã chứng
  minh nội dung không đổi so với HEAD bằng cách so multiset dòng sau khi chuẩn hoá
  (không field nào thêm/mất/đổi tên; vẫn 101 operation / 90 path / 108 schema).

### Bằng chứng

| kiểm tra                                             | kết quả                                     |
| ---------------------------------------------------- | ------------------------------------------- |
| sinh 2 lần trong **cùng** một JVM (trước khi sửa)    | giống hệt → ổn định trong một lần chạy      |
| sinh 2 lần qua **restart** JVM (sau khi sửa)         | **byte-identical** → hết phụ thuộc lần chạy |
| sinh đè lên baseline mới                             | **diff rỗng**                               |
| nội dung mới vs HEAD (chuẩn hoá quote/indent/thứ tự) | trùng khớp hoàn toàn                        |

Từ giờ `git diff` trên file này rỗng khi contract không đổi, và khác rỗng **chỉ khi**
backend thật sự đổi — tức P4.1 mới có ý nghĩa. Chạy lại trước mỗi domain theo quy trình
chống drift trong `docs/prompts/be-fe-integration.md`.

⚠️ Bản `application.yml` của BE đang sửa nhưng **chưa commit** — commit bên repo BE với
convention `[<id>]: [BE] …`, nếu không thì `git checkout` bên đó là thứ tự lại loạn.

---

# Drift #2 — đợt bugfix BE 28–29/07 (spec đổi thật, ĐÃ XỬ LÝ)

Lần đầu `git diff schema.gen.ts` khác rỗng vì **backend thật sự đổi**, đúng thứ cơ chế này
sinh ra để bắt. Sinh lại từ spec sống của BE `18efb6c`: **+250 / −171**, `90 path / 101 op`
→ **`91 path / 102 op / 108 schema`**.

Chiều ngược lại — BE ghi lại những gì họ đổi và FE phải theo — nằm ở
`DATN-backend/docs/fe-debt.md` (N1–N5) và `DATN-backend/docs/decisions/000{1,2}-*.md`.
Đọc hai file đó trước khi đọc mục này; đây chỉ ghi phần FE đã làm gì.

## Lỗ hổng của quy trình chống drift — QUAN TRỌNG HƠN BẢN THÂN ĐỢT NÀY

**Đếm operation không phát hiện được đổi method/path.** 5 endpoint đổi verb hoặc chỗ đặt
id trong đợt này, mà tổng số operation vẫn khớp, nên một script chỉ đếm sẽ báo "không đổi".
BE đã vá script của họ (so từng cặp `(path, method)`) ở `be-bugfix-session-4.md` §2 — FE
phải làm tương tự.

Cạm bẫy khi tự viết: **parse JSON spec, đừng parse `schema.gen.ts`.** Thử parse file TS thì
`options?: string[]` của `PublicQuizQuestionDto` bị đếm thành một operation `OPTIONS` ma
(khối `components` nằm sau khối `paths`, path cuối cùng vẫn còn "mở" với một parser theo dòng).

## Đổi `(path, method)` — 5 mất / 6 thêm

```
- PATCH  /v1/api/posts/{postId}/qna/accept-answer/{commentId}   ← FE đang gọi, đã gãy
- PUT    /v1/api/projects/applications/{id}/accept | /reject
- POST   /v1/api/skills/approve/{id} | /reject/{id}
+ POST   /v1/api/posts/{postId}/qna/accept-answer/{commentId}
+ DELETE /v1/api/posts/{postId}/qna/accept-answer                ← endpoint mới
+ POST   /v1/api/projects/applications/{id}/accept | /reject
+ POST   /v1/api/skills/{id}/approve | /reject
```

4 cái giữa thuộc `matchmaking`/`roadmap` — chưa có FE, ghi vào findings trước khi bắt đầu
domain đó. Chỉ `accept-answer` là đang gãy thật.

## Schema entity bị gỡ (QĐ-0002: entity không ra khỏi tầng API)

`UserEntity` · `RoadmapEntity` · `RoadmapNodeEntity` · `UserRoadmapProgressEntity` ·
`UserProfessionalProfileEntity` · `NotificationPreferenceEntity` · **`EventRsvpEntity`**

7 cái, không phải 6 — `fe-debt.md` §N3 sót `EventRsvpEntity`. Thay bằng
`PendingVerificationDto` · `ProfessionalProfileResponseDto` · `SuggestedCandidateDto` ·
`NotificationPreferenceResponseDto` · `EventAttendeeDto`.

FE tham chiếu 3 trong 7 → `tsc` gãy 9 lỗi / 4 file. **Đây là bằng chứng cơ chế hoạt động**:
field bị đổi tên thành lỗi compile, không phải 404 lúc chạy.

## `fe-debt.md` ghi chưa chính xác 2 chỗ

- N3 sót `EventRsvpEntity` (ở trên).
- N4 nói `POST_SHARED` "không vỡ compile" — **vỡ**. `notification-item.tsx` khai
  `Record<NotificationType, LucideIcon>`, key thừa là `TS2353`. Đúng ra đó là điểm cộng:
  map exhaustive bắt được cả việc **gỡ** thành viên, không chỉ việc thêm.
  Ngược lại `shareCount` ở `feed.ts` thì đúng là không vỡ (literal chết trong union).

## Đã đo trực tiếp trên BE đang chạy (không suy từ code)

| kiểm tra                                                  | kết quả                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PATCH …/accept-answer/21`                                | **405** + `Allow: POST` + body `ErrorResponseDto`                                                  |
| `POST …/accept-answer/21` → đọc lại feed                  | 200 → `{isResolved:true, acceptedAnswerId:21}` (B10)                                               |
| `DELETE …/accept-answer` → đọc lại feed                   | 200 → `{isResolved:false, acceptedAnswerId:null}`                                                  |
| `PUT /preferences {"emailFrequency":"WEEKLY_DIGEST"}`     | **400**                                                                                            |
| `GET /preferences`                                        | không còn `onesignalPlayerId`                                                                      |
| `GET /feed?page=1`                                        | `shareCount` mất; `likeCount`/`commentCount` thật; `authorLevelName` có; 6 khối details có dữ liệu |
| `flyway_schema_history`                                   | `V45__constrain_email_frequency.sql` ok=true                                                       |
| `update … set email_frequency='WEEKLY_DIGEST'` (rollback) | **ERROR: violates check constraint**                                                               |

Dữ liệu dev DB đã trả về trạng thái ban đầu sau khi đo (`emailFrequency` về `INSTANT`,
post 91 về chưa chọn đáp án).
