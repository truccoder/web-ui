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

- **SỰ CỐ DỮ LIỆU DEV — đồ thị Neo4j biến mất LẦN THỨ BA** (2026-07-28, đầu phiên P2.10).
  Đo được lúc mở phiên: Neo4j còn **2 node `User`, 1 quan hệ `FRIENDS_WITH`** (đúng cặp
  9001↔9002 dựng lại ở P2.7a qua luồng API) trong khi Postgres vẫn đủ 32 user và 13 dòng
  `ACCEPTED`. Tức là mỗi lần dev DB bị reset, Postgres được seed lại còn graph thì không.
  **Đây là lỗi seed của BE, không phải việc FE phải làm lại mỗi phiên** — đã nâng thành yêu
  cầu chính thức gửi BE, xem [`be-requests.md`](../be-requests.md).

  Cách dựng lại (giữ nguyên công thức P2.2, **không insert tay**): sinh Cypher **từ chính các
  dòng `ACCEPTED`** bằng `psql`, khử trùng lặp cặp bằng `DISTINCT least/greatest` —
  9001↔9002 có **13 dòng ACCEPTED nhưng chỉ 12 cặp phân biệt** vì bị lặp (một dòng seed, một
  dòng do luồng API ở P2.7a tạo thêm):

  ```sql
  select 'MERGE (:User {userId: '||id||'});' from socialapp.t_users order by id;
  select 'MATCH (a:User {userId: '||a||'}), (b:User {userId: '||b||'}) MERGE (a)-[:FRIENDS_WITH]-(b);'
  from (select distinct least(requester_id,addressee_id) a, greatest(requester_id,addressee_id) b
        from socialapp.t_friend_requests where status='ACCEPTED') x order by a,b;
  ```

  rồi `docker exec -i neo4j cypher-shell -u neo4j -p neo4j_password < graph.cypher`
  (**bắt buộc `-i`**, không có nó `docker exec` không đọc stdin và lệnh chạy im lặng).

  **Hướng quan hệ: một quan hệ mỗi cặp, KHÔNG phải hai.** Đã kiểm lại `FriendshipRepository`
  trước khi gõ Cypher thay vì đoán: cả 5 truy vấn (`areFriends`, `findFriendIds`,
  `findFriendIdsAfterCursor`, `countFriends`) đều dùng pattern **vô hướng**
  `-[:FRIENDS_WITH]-`, và chính `createFriendship` cũng là `MERGE (u1)-[:FRIENDS_WITH]-(u2)`.
  Tạo hai chiều sẽ làm `countFriends` đếm gấp đôi. `MERGE` vô hướng cũng khớp được quan hệ
  9001↔9002 có sẵn nên chạy lại không sinh bản sao.

  Kết quả đo sau khi dựng: Neo4j **32 node / 12 quan hệ**, `9001` có 12 bạn. Verify bằng
  **API thật** chứ không chỉ Cypher — đăng nhập 9001 → `GET /v1/api/friendships` trả **200,
  `totalCount = 12`, 12 bạn có tên thật** (9002 Backend Trần Khôi … 9024 QA Đoàn Giang),
  khớp đúng tập cặp trong Postgres.

  **`GET /friendships/suggestions` vẫn trả `[]` (count = 0) — đây là hành vi đã biết, không
  phải lỗi**, xem mục FoF bên dưới: seed chỉ có quan hệ của riêng 9001 nên không ai có bạn
  chung. 4 tình bạn phụ trợ tạo ở P2.2 (9002↔9008, 9003↔9008, 9002↔9009, 9006↔9010) cũng mất
  trong lần reset này. **Quyết định 2026-07-28: HOÃN dựng lại** — P2.10 (bookstore) không đụng
  màn gợi ý, mà dựng lại thì phải bật/tắt `email_verified` tạm và thêm 4 dòng vào
  `t_friend_requests`. Dựng lại khi nào thật sự cần verify màn suggestions (**P3.3**), và khi đó
  vẫn phải đi **qua đúng luồng API** (gửi lời mời → chấp nhận) để Postgres và Neo4j khớp nhau,
  không Cypher tay.

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
