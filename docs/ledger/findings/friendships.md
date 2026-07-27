# Nợ kỹ thuật & phát hiện — friendships

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

- **Neo4j rỗng — danh sách bạn bè và gợi ý luôn trả rỗng dù Postgres có dữ liệu**
  (phát hiện 2026-07-25, P2.2c-2). `FriendshipService.getFriends()` và `getSuggestions()`
  đọc từ **Neo4j** (`FriendshipRepository extends Neo4jRepository`, quan hệ
  `FRIENDS_WITH`), trong khi lời mời kết bạn nằm ở **Postgres** (`t_friend_requests`).
  Seed data chỉ đổ vào Postgres: 9001 có 12 dòng `ACCEPTED` nhưng Neo4j có **0 node,
  0 quan hệ** → `GET /friendships` trả `{friends: [], totalCount: 0}`.
  Đây là **lệch dữ liệu seed của BE**, không phải lỗi FE.
  Để verify được UI, local Neo4j đã được dựng lại **khớp Postgres** (32 node `User`,
  12 quan hệ `FRIENDS_WITH` sinh từ chính các dòng `ACCEPTED`) — không bịa quan hệ mới.
  Cần BE bổ sung bước seed graph, nếu không mọi máy dev mới đều thấy danh sách bạn rỗng.

- **Seed user ngoài `nguyen.truc` đều chưa verify email** → không đăng nhập bằng mật
  khẩu được (`admin1@socialapp.com` trong ghi chú vận hành cũng **sai/401**). Muốn tạo
  lời mời đến để test, P2.2c-2 tạm bật `email_verified` cho 9004/9005, gọi API, rồi
  **tắt lại**. Trạng thái dev DB để lại: request 21 `REJECTED`, 31 `CANCELLED`,
  41 `PENDING` (9001→Bob), 42 `PENDING` (9004→9001), và 9005 thành bạn của 9001
  (13 bạn). **API không có endpoint huỷ kết bạn**, nên quan hệ với 9005 chỉ gỡ được
  bằng SQL/Cypher.

- **Legacy còn sống sau khi friendships wired — thuộc domain khác, không phải nợ của
  friendships** (chốt 2026-07-25, P2.2d). Cả 4 route friends đã dùng feature. Thứ còn lại
  trong `lib/api/friendship.ts` + `lib/hooks/use-friendship.ts` chỉ vì **consumer ngoài
  friendships** gọi:

  | hook legacy còn lại                                                             | ai dùng                                     | chết ở          |
  | ------------------------------------------------------------------------------- | ------------------------------------------- | --------------- |
  | `useFriends`                                                                    | `/dashboard`, `/chats`, `messenger-sidebar` | P2.7 + P3.3     |
  | `useFriendSuggestions`, `useSendFriendRequest`, `useAccept/RejectFriendRequest` | `/dashboard`                                | **P3.3**        |
  | `usePendingRequests`                                                            | `/dashboard`, app shell (badge lời mời)     | P3.3 + **P3.4** |

  **Vì sao không repoint luôn sang barrel feature:** ba consumer chat/dashboard map DTO
  sang `UserSummary` (`id: string`, `fullname`) rồi đẩy thẳng vào định danh Twilio và
  prop type của `MessengerSidebar`. Đổi sang `FriendProfile` (`userId: number`,
  `fullName`) là mổ đúng phần đang lỗi của chat (xem ghi chú email-vs-userId trong
  `use-friendship.ts` cũ) — việc của P2.7/P3.3, không phải của wiring friendships. Gộp
  vào đây là vượt trần checkpoint và phá luật "xoá theo từng domain".
  Hệ quả tạm: `/dashboard` gọi `GET /friendships` bằng query key legacy `['friends',100]`
  song song với key feature — tự hết khi dashboard migrate.

- **Gợi ý kết bạn là friend-of-friend thuần, seed không có FoF nào** (P2.2c-3).
  `findFriendSuggestions` chạy Cypher
  `(u)-[:FRIENDS_WITH]-(mutual)-[:FRIENDS_WITH]-(suggestion)`, loại người đã là bạn.
  Seed chỉ có quan hệ **của riêng 9001**, bạn của 9001 không có bạn nào khác → tập FoF
  rỗng → `GET /suggestions` trả `[]` **kể cả sau khi dựng lại graph**. Không phải lỗi FE,
  cùng gốc với mục Neo4j ở trên.
  Để verify màn hình, đã tạo 4 tình bạn giữa các seed user khác **qua đúng luồng API**
  (gửi lời mời → chấp nhận, nên Postgres và Neo4j khớp nhau, không sửa DB tay):
  9002↔9008, 9003↔9008, 9002↔9009, 9006↔9010. Kết quả: 9001 thấy 9008 (2 bạn chung),
  9009 và 9010 (1 bạn chung). Cộng thêm lời mời 9001→9009 gửi lúc verify, tab "Đã gửi"
  hiện có 2 dòng.
  **Nút "Bỏ qua" của bản legacy bị cắt** — BE không có endpoint dismiss và nút legacy
  vốn không có `onClick` (DS deviation #9).

- **Hành động lặp trên từng dòng dùng `secondary`, không `primary`** (chốt P2.2c-3).
  `Button.prompt.md`: đúng một primary mỗi view. Danh sách gợi ý có N dòng cùng một hành
  động → không có thứ bậc để diễn đạt, và N nút ink liền nhau phá "calm" (§0). Ngược lại
  `FriendRequests` giữ cặp primary/secondary vì **chính cặp đó** là thứ bậc trong dòng
  (nên chấp nhận vs từ chối). Quy ước: thứ bậc tính theo nhóm hành động, không theo trang.

- **Phân trang > 1 trang chỉ verify được bằng cách hạ tạm `limit`.** Seed chỉ có 13 bạn,
  dưới `PAGE_SIZE = 20`. Đã verify thật bằng cách tạm để `useInfiniteFriends(5)`:
  `limit=5` → `cursor=9007` → `cursor=9019` → dừng, đủ 13 dòng, hiện "đã xem hết". Sau
  đó trả lại mặc định.

- **`@/lib/i18n` giờ cũng là cạnh legacy của friendships** (từ P2.2c-2). Trước đó
  friendships sạch tuyệt đối. Hai màn mới cần chuỗi dịch nên dùng `useT`/`useI18n` như
  security. Không hạ chuẩn extraction test — chỉ dồn thêm lý do cho checkpoint hạ tầng
  chuyển `i18n` sang `core/`, lúc đó cả security lẫn friendships sạch cùng lúc.
