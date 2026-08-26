# Kịch bản demo — Elite Nexus

Khoảng **12 phút**, bốn hồi. Mọi id, tên và tài khoản dưới đây là dữ liệu thật đang nằm trong
DB, đã kiểm ngày 19/08/2026.

Nguyên tắc viết kịch bản này: **mỗi thao tác phải chứng minh một luận điểm của đề tài.** Bấm
cho vui thì hội đồng sẽ hỏi "để làm gì", và đó là câu hỏi bạn không muốn nghe.

---

## 0 · Trước khi vào phòng

Chạy theo đúng thứ tự này, không đảo:

```bash
docker ps                          # postgres · neo4j · redis · minio phải Up
curl localhost:8080/v3/api-docs    # backend phải 200
cd D:/DATN/DATN-frontend
yarn build && yarn start           # KHÔNG dùng `yarn dev` — xem bên dưới
```

### Chạy bản build, đừng chạy `yarn dev`

Trong hai ngày làm việc, `next dev` đã **tự khởi động lại 4 lần** vì chạm ngưỡng bộ nhớ. Mỗi
lần như vậy Turbopack phải biên dịch lại route đầu tiên bạn mở, và tôi đã đo những lần mất
**hơn 15 giây** — trang đứng nguyên ở khung xám.

Giữa buổi bảo vệ thì 15 giây im lặng là rất dài, và nó rơi đúng vào lúc bạn vừa bấm sang một
màn mới. `yarn build && yarn start` không biên dịch gì lúc chạy, nên không có rủi ro đó.

Build mất khoảng 30 giây. Làm trước khi vào phòng.

Kiểm nhanh bằng mắt trước khi trình chiếu:

- [ ] Mở `/newsfeed` — bảng tin có bài, có ảnh, có cảm xúc
- [ ] Mở `/trending` — phải có tin (crawler đã hút sẵn khoảng 100 tin)
- [ ] Đăng nhập admin, mở `/admin/moderation` — hàng chờ phải có bài
- [ ] Zoom trình duyệt **100%**, cửa sổ tối thiểu **1440px** ngang — dưới 1360 thì cột phải
      tự gập vào và bạn mất phần trưng bày uy tín
- [ ] Tắt thông báo hệ điều hành, đóng tab thừa
- [ ] Mở sẵn **hai cửa sổ trình duyệt**: một đăng nhập người dùng, một đăng nhập admin.
      Đăng xuất rồi đăng nhập lại giữa buổi là 30 giây chết trên sân khấu.

### Tài khoản

| Vai              | Email                        | Mật khẩu   |
| ---------------- | ---------------------------- | ---------- |
| Người dùng chính | `backend_truc_anh@seed.test` | `12345678` |
| Quản trị         | `admin_one@seed.test`        | `12345678` |

### Một việc nên làm trước

Elite Score cao nhất trong DB hiện là **129** (`backend_dung_nhan`), trong khi ngưỡng lên cấp
là 100. Nghĩa là gần như ai cũng `Newcomer` và thanh tiến độ cấp độ trông rất nhạt — đúng chỗ
bạn muốn khoe nhất. Cân nhắc nâng điểm một tài khoản lên vài trăm để lộ trình cấp độ nhìn ra
được.

---

## Hồi 1 · Là mạng xã hội, nhưng không phải mạng xã hội thường

**Khoảng 3 phút. Mở `/newsfeed`.**

Bảng tin mở ra là bốn thẻ tin công nghệ crawl về, rồi mới tới bài người dùng. **Đừng cuộn vội
qua — chỉ thẳng vào đó.**

> "Bảng tin trộn hai nguồn: bài của cộng đồng và tin công nghệ thu thập tự động từ ba nguồn —
> GitHub Trending, Hacker News, Dev.to. Hai loại thẻ có hình dạng khác nhau: thẻ của người mở
> đầu bằng khuôn mặt và điểm uy tín, thẻ crawl không có ai đứng sau nên chỉ có tên nguồn.
> Người đọc phân biệt được trước khi đọc chữ nào."

Cuộn xuống bài của người thật. Chỉ vào **chip hổ phách cạnh tên tác giả**.

> "Màu hổ phách trong toàn hệ thống chỉ có một nghĩa: uy tín. Không dùng cho gì khác."

**Thả một cảm xúc.** Mở danh sách ra cho họ đọc nhãn.

> "Cảm xúc ở đây là Hữu ích, Xuất sắc, Thú vị, Khó hiểu, Không đồng tình — không phải thích và
> thả tim. Đây là chỗ đánh giá một nội dung kỹ thuật."

**Bấm soạn bài**, mở menu loại bài cho họ thấy đủ **8 loại**: thường, đoạn mã, bài viết, hỏi
đáp, khảo sát, liên kết, sách, sự kiện. Chọn **Đoạn mã**, dán vài dòng, đăng.

> **Đã chạy thử ngày 19/08:** `POST /posts` với `codeSnippetDetails` → **200**. Bài mới xuất hiện
> ở đầu bảng tin.

> "Loại bài là tham số của một hành động, không phải một dãy nút. Mỗi loại có khối trường riêng
> và backend xác thực riêng cho từng loại."

**Mở bài hỏi đáp id `5055`** — _Có nên dùng UUID làm khoá chính không_ — bài này có 6 bình luận.

> "Bình luận nhiều cấp, và tác giả câu hỏi có quyền đánh dấu một câu trả lời là được chấp nhận.
> Đây là đường dẫn riêng của bài; mở ra là bình luận đã bung sẵn, vì mọi lối vào trang này đều
> là người đi đọc một cuộc thảo luận cụ thể."

---

## Hồi 2 · Uy tín đến từ sổ cái, không phải tự khai

**Khoảng 3 phút. Đây là luận điểm khác biệt của đề tài — dành nhiều thời gian nhất cho hồi này.**

Chỉ vào **cột phải**.

> "Cột phải không phải quảng cáo. Nó là nửa còn lại của trang: điểm uy tín, cấp độ, khoảng cách
> tới cấp kế tiếp, và những kỹ năng đã được quản trị viên xác minh. Đây là khu vực duy nhất
> trong sản phẩm không có thẻ nào — nó đọc như phần chú giải của một tài liệu kỹ thuật, không
> phải như đồ nội thất bên cạnh nội dung."

**Mở `/profile`.** Chỉ vào điểm và cấp.

> "Điểm này không tự khai. Nó cộng dồn từ các sự kiện thật trong sổ cái — đăng bài, được chấp
> nhận câu trả lời, được xác minh kỹ năng. Tên cấp độ do server quyết định, client không bao
> giờ tự suy ra từ con số."

**Mở `/roadmap`, chọn `Backend Developer`** (id 2001, 13 node).

> "Lộ trình kỹ năng. Người dùng chọn một node và gửi yêu cầu xác minh, kèm bài viết của chính
> mình làm bằng chứng."

**Gửi một yêu cầu xác minh** trên một node bất kỳ. **Đừng duyệt ngay — để dành cho Hồi 4.**

**Mở `/projects`, cuộn tới `Nền tảng chia sẻ kiến thức nội bộ`** (id 4001, đang tuyển).

Hai dự án đầu bảng mang nhãn _Đã đóng_ — đừng né, dùng luôn:

> "Trạng thái hiện ngay trên thẻ, nên không ai bấm vào rồi mới biết dự án đã đóng."

Mở dự án, chỉ vào khối **"Đã có N người mang kỹ năng vị trí này cần"** ngay dưới vị trí
Backend Developer (dữ liệu thật: **16 người**).

> "Đây là ghép nối theo kỹ năng thật, không phải đọc CV thủ công. Hệ thống truy vấn theo kỹ năng,
> cho từng vị trí một — kỹ năng nào trùng với yêu cầu của vị trí thì tô xanh, phần còn lại để
> trung tính."

Hai điều nên nói trước khi hội đồng kịp hỏi:

- **Không có tên người, và đó là cố ý.** Endpoint trả về `jobTitle · primaryRole ·
seniorityLevel · yearsOfExperience · knownTechStack` — không tên, không ảnh. Đây là truy vấn
  theo **năng lực**, không phải một danh sách người được chấm điểm.
- **Không phải bảng xếp hạng.** Backend khớp theo "chia ít nhất một kỹ năng", không có điểm và
  không có thứ tự. Nên đừng gọi đây là "gợi ý tốt nhất".

---

## Hồi 3 · Tri thức chảy ra ngoài

**Khoảng 2 phút rưỡi.**

**Quay lại một bài viết dài, bấm giải thích bằng AI.**

> "Google Gemini giải thích bài viết theo phong cách người đọc đã khai trong hồ sơ nghề nghiệp.
> Giải thích được lưu lại, không gọi lại API cho cùng một bài."

**Bấm lưu vào kho, rồi mở `/knowledge`.**

> "Kho ghi chú cá nhân. Và nó đồng bộ hai chiều với Obsidian qua access token — mạng xã hội trở
> thành nguồn cấp dữ liệu cho hệ thống ghi chú riêng, chứ không chỉ là nơi tiêu thụ thông tin."

Chỉ vào phần quản lý token. Không cần tạo token mới trên sân khấu.

**Gõ vào ô tìm kiếm: `nguyen`** (cố ý không dấu, không viết hoa).

> "Tìm toàn văn theo chuỗi con, không phân biệt dấu và không phân biệt hoa thường."

Kết quả: **2 bài viết và 8 người dùng**. Gõ lại thành `Nguyễn` có dấu — **ra đúng cùng một
kết quả**. Đó là cách chứng minh trực tiếp nhất, và nó lấp đầy cả hai tab.

> Đã kiểm ngày 19/08: `nguyen` → 2 bài · 8 người. `spring` → 6 bài. `kien truc` → 1 bài.
> **Đừng gõ `hieu nang`** — không có bài nào chứa cụm đó, dù có dấu hay không, nên màn hình
> sẽ trống.

**Mở `/trending`.**

> "Tin công nghệ thu thập tự động, phân loại theo chủ đề, và lưu thẳng vào kho được."

**Đừng nói "lọc theo từng nguồn"** — bộ lọc trên màn là **chủ đề** (Mã nguồn mở, Sự kiện, Công
nghệ mới…) và **khoảng thời gian**, không phải nguồn. Backend cũng không nhận tham số nguồn.

**Và đừng dừng ở màn hình đầu.** DB có **Hacker News 52 · Dev.to 36 · GitHub 34** — khá cân —
nhưng danh sách sắp theo điểm, mà sao GitHub (hàng trăm nghìn) áp đảo điểm Hacker News, nên
trang đầu gần như toàn GitHub. Muốn cho thấy đủ ba nguồn thì **cuộn xuống** cho nhãn nguồn trên
mỗi thẻ đổi, hoặc chỉ vào mục **"Từ bên ngoài"** ở cột phải — nó liệt kê từng nguồn kèm số bài
và thời điểm gần nhất.

---

## Hồi 4 · Đây là hệ thống thật

**Khoảng 3 phút.**

### Thanh toán

**Mở `/library`, chọn `Tối ưu Spring Boot trong thực chiến`** (id 3001, 149.000₫, đọc thử 20 trang).

> "Tác giả đăng ấn phẩm PDF hoặc EPUB, đặt giá và số trang cho đọc thử."

Bấm **đọc thử** để họ thấy bản xem trước bị giới hạn số trang. Rồi bấm **mua qua MoMo**.

Trình duyệt **chuyển thẳng sang cổng MoMo sandbox** (`test-payment.momo.vn`). Không có mã QR
trên màn của ta — backend trả `qrCode` rỗng, chỉ có `paymentUrl`. **Đừng nói "quét mã"**, hãy nói
"chuyển sang cổng thanh toán".

> "Thanh toán qua cổng MoMo. Giao dịch thành công thì MoMo gọi ngược về backend, và backend tự mở
> quyền tải bản gốc — quyền do server quyết, client không tự bật."

Sau khi thanh toán, MoMo trả người dùng về `/payment/success?orderId=…`, và trang đó gọi
`POST /payments/{transactionRef}/sync` để chốt trạng thái.

> **Đã chạy thử ngày 19/08:** `POST /payments/books/3001` → **200**, trả về mã giao dịch thật
> (`MOMO1787123754605`) và một `paymentUrl` sandbox hợp lệ.

_Nếu không muốn thanh toán thật trên sân khấu:_ mở một cuốn trong tab đã mua và chỉ vào nút tải
đã được mở sẵn. An toàn hơn hẳn — cổng sandbox là một trang ngoài mà bạn không kiểm soát được.

### Kiểm duyệt

**Chuyển sang cửa sổ admin, mở `/admin/moderation`.**

Hàng chờ đang có **2 bài chờ kiểm duyệt, 4 bài chờ xem xét, 2 bài đã từ chối**.

> "Kiểm duyệt hai tầng: luật định trước, rồi Gemini chấm điểm độc hại theo thời gian thực. Chỉ
> những gì máy không chắc mới rơi xuống hàng chờ này. Kiểm duyệt ảnh dùng Google Cloud Vision,
> hiện mặc định tắt."

Mở tab **nhật ký vi phạm** và **tài khoản bị khoá** cho họ thấy hệ thống có dấu vết.

Mở tab **khiếu nại** — đang có **1 khiếu nại chờ xử lý**. Duyệt hoặc từ chối nó.

> "Người bị xử lý có quyền khiếu nại, và quản trị viên xử lý ngay trên cùng màn hình. Đây là
> phần đảm bảo tính khách quan và minh bạch."

### Đóng vòng lặp

**Vẫn ở cửa sổ admin, mở phần duyệt kỹ năng** — đang có **48 yêu cầu chờ**. Tìm yêu cầu bạn vừa
gửi ở Hồi 2 và **duyệt nó**.

**Quay lại cửa sổ người dùng, mở `/profile` và bấm F5.**

> "Kỹ năng vừa được xác minh. Điểm uy tín tăng, và chip kỹ năng mới xuất hiện ở cột phải. Đó là
> toàn bộ vòng lặp của đề tài: hoạt động thật, vào sổ cái, thành uy tín, rồi thành cơ hội nghề
> nghiệp."

**Kết thúc ở đây.** Đây là câu chốt mạnh nhất bạn có.

> **Đã chạy thử toàn bộ vòng lặp này ngày 19/08 bằng API thật.** Kết quả: gửi xác minh → 200,
> vào hàng chờ admin, duyệt → 200, và **Elite Score tăng 73 → 93**. Con số nhảy trước mặt hội
> đồng là thật.
>
> **PHẢI BẤM F5 — chuông sẽ KHÔNG nhảy.** Đã kiểm: số thông báo chưa đọc đứng yên ở 14 sau khi
> duyệt. Hệ thống **không có loại thông báo nào cho việc xác minh kỹ năng** — các loại tồn tại
> chỉ gồm `BOOK_PURCHASED · BOOK_REVIEW · EVENT_RSVP · FRIEND_ACCEPTED · FRIEND_REQUEST ·
POST_COMMENTED · POST_LIKED · POST_TAGGED`. Và vì `staleTime` là 60 giây, chuyển cửa sổ về
> trong vòng một phút cũng không tự nạp lại. Ghi là mục B10.
>
> **Đừng hứa chuông sẽ reo.** Nếu bạn nói "chờ chuông" rồi không có gì xảy ra, hội đồng sẽ nhớ
> đúng khoảnh khắc đó chứ không nhớ con số vừa tăng.

---

## Nếu bị hỏi

**"Thời gian thực ở chỗ nào?"**
Trung thực: chuông đang poll 5 giây, backend chưa có WebSocket hay SSE. Nhưng bảng tin dùng
fan-out-on-write — bài được đẩy vào feed người theo dõi ngay lúc đăng, không phải join lúc đọc.
Đã ghi trong `docs/backend-plan.md` mục B6.

**"Điểm uy tín tính thế nào?"**
Từ bảng `t_reputation_events` — mỗi hành động sinh một sự kiện có điểm. Ngưỡng cấp độ do server
giữ, trong `RepLevel` ở backend. Client không bao giờ suy cấp từ điểm; chưa gọi được API cấp độ
thì nó hiện gạch ngang chứ không đoán.

**"Tìm kiếm có ra sách không?"**
Chưa. `SearchResponse` hiện chỉ có hai nhánh: bài viết và người dùng. Đã ghi là mục B3.
**Đừng hứa là có** — họ sẽ bảo bạn thử ngay.

**"Sao không dùng thư viện component có sẵn?"**
Có một design system riêng, 15 vòng lặp, với thang khoảng cách năm bậc và mô hình bề mặt riêng.
Kèm cả cấu hình lint kiểm tra tuân thủ, chạy mỗi lần commit — giá trị nào lệch thang là báo lỗi
ngay.

**"AI dùng ở đâu?"**
Hai chỗ khác nhau: Gemini kiểm duyệt nội dung tự động lúc đăng, và Gemini giải thích bài viết
theo yêu cầu người dùng.

---

## Tránh

- **Đừng sửa một bài rồi khoe.** Lỗi mất ảnh khi sửa đã vá, nhưng đường sửa bài chưa có UI cho
  các trường riêng theo loại, nên sửa một bài viết sẽ không đổi được tiêu đề của nó.
- **Đừng hứa tìm kiếm ra sách.**
- **Đừng thu nhỏ cửa sổ** dưới 1360px — cột phải gập vào và bạn mất phần trưng bày uy tín.
- **Đừng đăng xuất** giữa buổi. Dùng hai cửa sổ.
- **Đừng tìm tab "Kỹ năng của tôi"** trên bảng tin — nó không tồn tại, `/feed` chưa có tham số
  lọc theo kỹ năng (mục B7).

---

## Nếu hỏng giữa chừng

| Hỏng                 | Làm gì                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Trang trắng          | F5. Next dev đôi khi cần biên dịch lại lần đầu vào một route        |
| API trả 401          | Token hết hạn — đăng nhập lại ở tab phụ, đừng đăng xuất tab chính   |
| MoMo không quay về   | Chuyển sang tab đã mua, chỉ vào quyền tải đã mở sẵn                 |
| Gemini chậm hoặc lỗi | Mở `/knowledge`, chỉ vào một giải thích đã lưu từ trước             |
| Backend chết         | `cd D:/DATN/DATN-backend && ./gradlew bootRun` — mất khoảng 40 giây |
