# Nợ kỹ thuật & phát hiện — reputation

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

- **Không có code legacy để xoá** — `reputation` chưa từng được FE cũ đụng tới (mục 3:
  0/1 endpoint). Cột "legacy removed" là `n/a`, không phải bỏ sót.

- **`verifiedExpert` chưa verify được bằng dữ liệu thật** (P2.3). BE suy field này từ
  `UserRoadmapProgress.status == VERIFIED`, mà `t_roadmap_nodes` **rỗng hoàn toàn** (0
  dòng) nên không user nào có thể `true`. Muốn dựng dữ liệu thì phải bịa cả roadmap lẫn
  node — đúng thứ CLAUDE.md cấm. Nhánh badge để lại **chưa chạy thật**, sẽ phủ khi làm
  `roadmap` (P2.12) — cũng chính là domain sinh ra field này.

- **Thanh tiến trình chạy 0 → `nextLevelMin`, không phải sàn-cấp → trần-cấp.** Response
  không có sàn của cấp hiện tại, và lấy sàn từ bảng ngưỡng là chép nguồn sự thật lần thứ
  ba (§1). Nếu sau này muốn thanh "trong cấp", **BE phải trả thêm `currentLevelMin`** —
  đừng sửa bằng cách hardcode ở FE.

- **`RepScore` xuất qua barrel cho domain khác dùng** (WBS P2.3 đặt sớm chính vì việc
  này). `eliteScore` đã nằm sẵn trong payload feed/search nên posts/newsfeed/search chỉ
  cần `<RepScore score={...} />`, **không gọi endpoint reputation**. Nhưng payload đó
  **không có `levelName`** → ở feed/search chip sẽ hiện số trần, không hậu tố cấp. Đó là
  giới hạn dữ liệu, không phải thiếu sót UI; muốn hiện cấp ở feed thì BE phải thêm
  `levelName` vào các DTO đó.

- **Kiểm thử ở dev DB**: để verify 4 trạng thái, `elite_score` của 9001 được đặt tạm
  15800 rồi 50000 (BE tự tính cấp — verify logic thật, không giả UI) và **trả về 0** —
  đúng giá trị seed ban đầu. Nhánh lỗi verify bằng cách tạm trỏ `userId=99999` → 404.
