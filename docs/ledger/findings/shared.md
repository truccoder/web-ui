# Nợ kỹ thuật & phát hiện — hạ tầng shared

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

- **`cn()` nuốt class cỡ chữ của DS — LỖI THẬT, ĐÃ SỬA ở P2.2c-2.**
  `shared/lib/cn.ts` dùng `twMerge` mặc định. tailwind-merge không biết `text-nx-ui` là
  **cỡ chữ** còn `text-nx-text-primary` là **màu chữ**: nó xếp cả hai vào nhóm
  `text-color` rồi bỏ cái đứng trước. Hệ quả: mọi component gộp cỡ + màu trong **một**
  lời gọi `cn()` bị mất cỡ chữ và rơi về 16px kế thừa.
  Đo được trong browser: `Button size="sm"` render **16px** thay vì 13px
  (`text-nx-body-sm` không có trong `className` cuối) — lỗi này đã tồn tại từ P1.3, ảnh
  hưởng **mọi Button trong app**, không riêng checkpoint này. `FriendListItem` không dính
  vì viết class bằng chuỗi literal, không qua `cn()`.
  Sửa: `extendTailwindMerge` khai báo 12 cỡ `--text-nx-*` vào nhóm `font-size`. Verify
  sau khi sửa: tab = 14px, Button sm = 13px, màu chữ vẫn đúng.
  → Nếu sau này thêm cỡ chữ mới vào `@theme`, **phải** thêm vào `NX_FONT_SIZES` trong
  `cn.ts`, nếu không lỗi này quay lại âm thầm.
