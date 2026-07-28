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
