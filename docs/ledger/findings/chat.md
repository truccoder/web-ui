# findings — `chat`

BE package `com.socialapp.chat` (`ChatController`, **1 endpoint**: `GET /v1/api/chat/token`).

Mở file này ở **đầu P2.7** (2026-07-27), **trước khi viết dòng code FE nào**, vì khảo sát cho ra
một thứ chặn cả checkpoint: **BE và FE đang dùng hai nhà cung cấp chat khác nhau.** Phần lớn file
này là **yêu cầu gửi sang BE**, không phải nợ FE.

---

## 0. Thực trạng đo được (2026-07-27)

|                  | BE                                                                       | FE hiện tại                                                                 |
| ---------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| nhà cung cấp     | **Stream Chat** (getstream.io)                                           | **Twilio Conversations**                                                    |
| cấp token        | `GET /v1/api/chat/token` → `{userId, streamToken}`                       | `POST /api/twilio/token` — **route handler của chính Next.js**              |
| trạng thái local | **503** `Stream Chat is not configured (missing stream.chat.api-secret)` | **500** `Twilio credentials not configured`                                 |
| quy mô code      | 3 file Java (~90 dòng)                                                   | **~1830 dòng**: 6 component + `lib/twilio/` (4 file) + route handler + page |

Đo bằng lệnh thật, không suy từ tên:

```bash
curl -H "Authorization: Bearer $T" http://localhost:8080/v1/api/chat/token      # 503
curl -X POST http://localhost:3000/api/twilio/token -d '{"identity":"9001"}'    # 500
```

**Cả hai đường đều chết ở local.** Đây chính là lỗi `[Twilio] Initialization failed` hiện trong
console **mọi trang** của app (provider mount trong `app/(main)/layout.tsx`), không phải lỗi của
riêng `/chats`.

FE mount chat ở **hai nơi**, không phải một: `/chats` (messenger đầy đủ) và app shell
(`CommunicationProvider` + `ChatBox` — cửa sổ chat nổi). Guardrail C: xoá nhầm là mất cả hai.

**BE chưa có Stream server SDK** — `build.gradle` không có `io.getstream:*`. `StreamChatService`
tự tay ký JWT bằng `jjwt 0.12.6`. Nghĩa là BE **chỉ** cấp token, không đồng bộ user, không tạo
channel, không quản lý thành viên.

---

## Yêu cầu gửi BE

Xếp theo thứ tự: R1–R3 là **chặn** (không có thì FE không viết được gì chạy được), R4–R6 là
**cần để dùng thật**, R7 là dọn dẹp.

### R1 — Cấu hình credentials Stream (CHẶN)

`application.yml` đã có chỗ, chỉ đang rỗng:

```yaml
stream:
  chat:
    api-key: ${STREAM_API_KEY:}
    api-secret: ${STREAM_API_SECRET:}
```

Cần key/secret thật từ dashboard getstream.io, truyền vào env khi `bootRun`.

**Xong khi**: `GET /v1/api/chat/token` trả **200** kèm `streamToken` thay vì 503.

### R2 — Token PHẢI ký HS256 (nghi là lỗi thật, kiểm trước khi tin)

`StreamChatService.generateUserToken`:

```java
SecretKey key = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));
return Jwts.builder().claim("user_id", String.valueOf(userId)).signWith(key).compact();
```

`signWith(key)` một tham số để **jjwt tự chọn** thuật toán mạnh nhất mà độ dài key cho phép:
≥32 byte → HS256, ≥48 → HS384, **≥64 → HS512**. Secret của Stream thường là chuỗi **64 ký tự**
→ 64 byte → jjwt sẽ ký **HS512**. **Stream chỉ chấp nhận HS256** cho user token, nên token sẽ bị
từ chối lúc `connectUser` dù mọi thứ khác đúng.

**Cách kiểm (làm ngay sau R1, đừng đợi FE)**: lấy token rồi decode phần header:

```bash
T=$(curl -s -H "Authorization: Bearer $JWT" http://localhost:8080/v1/api/chat/token | node -pe "JSON.parse(require('fs').readFileSync(0)).streamToken")
node -pe "Buffer.from(process.argv[1].split('.')[0],'base64url').toString()" "$T"
# PHẢI ra {"alg":"HS256",...}. Ra HS512/HS384 là hỏng.
```

**Sửa**: chỉ định thuật toán tường minh thay vì để suy ra —
`.signWith(key, Jwts.SIG.HS256)` (jjwt 0.12.x).

**Xong khi**: header token là `{"alg":"HS256","typ":"JWT"}`.

### R3 — Response phải trả kèm `apiKey` (CHẶN)

`ChatTokenResponse` hiện chỉ có `userId` + `streamToken`. Client Stream **bắt buộc** cần **API
key công khai** để khởi tạo (`StreamChat.getInstance(apiKey)`), mà BE đang giữ key đó trong
`application.yml` và không trả ra.

Hai đường, **chọn đường 1**:

1. **BE trả kèm** → `ChatTokenResponse { userId, streamToken, apiKey }`. Một nguồn sự thật; đổi
   app Stream chỉ sửa một chỗ; FE không cần thêm biến môi trường nào. API key của Stream là
   **công khai theo thiết kế** (nó nằm trong mọi request từ trình duyệt), nên trả ra không phải
   là rò rỉ — thứ phải giữ kín là `api-secret`, và cái đó không bao giờ rời BE.
2. FE tự có `NEXT_PUBLIC_STREAM_API_KEY` → hai nguồn sự thật, lệch nhau là chat chết im lặng ở
   production mà local vẫn chạy. **Không nên.**

**Xong khi**: response là `{"userId":"9001","streamToken":"...","apiKey":"..."}`.

> Ghi chú cho FE (tôi tự lo): đổi DTO sẽ làm `schema.gen.ts` khác đi → drift check ở đầu P2.7 sẽ
> báo diff. Đó là diff **mong đợi**, tôi sẽ xử lý theo `ledger/schema-drift.md` chứ không commit đè.

### R4 — Token nên có `iat` + `exp`, và response nên nói khi nào hết hạn

Hiện token **không có claim thời gian nào** → sống vĩnh viễn. Hệ quả: token lộ ra là dùng được
mãi, và FE không có cách nào biết khi nào phải xin lại (chỉ còn nước bắt lỗi rồi thử lại).

Đề xuất: `iat = now`, `exp = now + 24h` (Stream khuyến nghị 1–24h), và response thêm
`expiresAt` (ISO-8601) để FE lên lịch refresh chủ động.

**Xong khi**: decode payload thấy `iat`/`exp`, và response có `expiresAt`.

### R5 — Đồng bộ user sang Stream (tên + ảnh đại diện)

Stream lưu hồ sơ user ở phía nó. BE đang **chỉ** ký token, không upsert user, nên trong giao diện
chat mọi người sẽ hiện là **`9001`, `9004`…** chứ không phải "Backend Vũ Thảo" + avatar.

Cách làm: thêm SDK server `io.getstream:stream-chat-java`, gọi `upsertUser({id, name, image})`
lúc cấp token (rẻ, idempotent) hoặc lúc user đổi hồ sơ.

Không làm R5 thì FE **không có đường nào** hiện tên người trong danh sách hội thoại — cùng loại
giới hạn đã gặp ở `/attendees` của Events (BE chỉ trả `userId`, không có endpoint tra người theo
id, nên chỉ hiện được **số** người tham gia chứ không hiện được **ai**). Đừng lặp lại nó ở chat.

**Xong khi**: user 9001 tồn tại trên Stream với `name` + `image` đúng.

### R6 — Quyết định: ai được nhắn ai, và ai tạo channel

Hiện **không có gì gác**. Nếu để FE tạo channel bằng client SDK thì bất kỳ user nào cũng nhắn
được bất kỳ user nào — trong khi app có sẵn đồ thị bạn bè (`features/friendships`, 8 endpoint,
Neo4j).

Ba mức, cần bạn chọn **trước khi tôi dựng UI** vì nó đổi cả luồng "bắt đầu cuộc trò chuyện":

- **(a) Không gác** — FE tạo channel client-side. Nhanh nhất, không cần BE thêm gì.
- **(b) Gác bằng permission của Stream** — cấu hình trên dashboard, BE không thêm code.
- **(c) BE cấp endpoint tạo channel**, kiểm bạn bè bằng `FriendshipService` rồi mới tạo. Chặt
  nhất, nhưng **thêm endpoint mới** → đổi tổng số endpoint của ledger (101) và đổi phạm vi P2.7.

**Đề xuất (a) cho bản đồ án**, ghi rõ giới hạn vào ledger; (c) nếu muốn đúng sản phẩm thật.

### R7 — Nếu chốt bỏ Stream mà giữ Twilio thì hãy xoá package `chat` khỏi BE

Nhánh ngược của R1–R6. Nếu quyết định cuối là dùng Twilio, thì `com.socialapp.chat` là code chết
và nên xoá hẳn — để lại một endpoint không ai gọi sẽ làm hỏng chính thước đo của dự án
("mọi endpoint BE phải có consumer FE"), và tổng endpoint xuống **100**.

Nhưng lưu ý hệ quả kiến trúc: giữ Twilio nghĩa là **giữ `app/api/twilio/token` — một backend nằm
trong Next.js**, tự ký JWT bằng `TWILIO_API_KEY_SECRET`. Điều đó đi ngược mục tiêu
microservices-ready của cả cuộc di trú (CLAUDE.md §4): FE lẽ ra không được là nơi giữ secret hay
cấp quyền.

---

## Sau khi BE xong, P2.7 phía FE sẽ gồm những gì

Ghi sẵn để khỏi khảo sát lại. **`chat` không còn là tier C 1-checkpoint** — 1830 dòng và 2 surface
vượt xa trần "2 màn / 5 component" (CLAUDE.md §5). Cách tách sẽ công bố ở đầu domain, dự kiến:

| checkpoint | nội dung                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `P2.7a`    | data + state: `types/` + `api/` (1/1 endpoint) + hook lấy token & khởi tạo client                                            |
| `P2.7c-1`  | UI 1: danh sách hội thoại + màn hội thoại (`/chats`)                                                                         |
| `P2.7c-2`  | UI 2: cửa sổ chat nổi của app shell (`ChatBox`) — hoặc **hoãn sang P3.4** vì nó thuộc shell                                  |
| `P2.7d`    | wiring + xoá legacy: `lib/twilio/` (4 file), `components/chat/` (6 file), `app/api/twilio/token`, 2 dep trong `package.json` |

Legacy phải xoá đã đối chiếu sẵn ở `ledger/legacy-inventory.md`. Hai chỗ mount: `/chats` và
`app/(main)/layout.tsx`.

---

## BE đã sửa xong — verify lại 2026-07-27 (đầu P2.7a)

| yêu cầu | trạng thái | bằng chứng đo được                                                                                                                 |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| R1      | **xong**   | `GET /v1/api/chat/token` → **200** (trước là 503)                                                                                  |
| R2      | **xong**   | header token = `{"alg":"HS256"}` — nghi ngờ là đúng, đây từng là lỗi thật                                                          |
| R3      | **xong**   | response có `apiKey` (`fub6apdcr47y`)                                                                                              |
| R4      | **xong**   | payload có `iat` + `exp`; response có `expiresAt` (TTL 24h, đọc từ `stream.chat.token-ttl`)                                        |
| R5      | **xong**   | `StreamChatClient.upsertUser` gọi best-effort trong `issueToken`; đo trên UI: tên hiện **"Backend Vũ Thảo"** chứ không phải `9004` |
| R6      | **(a)**    | không endpoint mới nào → FE tạo channel client-side. Tổng endpoint vẫn **101**                                                     |

Cách BE làm R5 đáng ghi nhận: sync hồ sơ **không được phép làm hỏng việc cấp token**
(`syncProfileBestEffort` nuốt lỗi và vẫn trả token) — sync hỏng thì chat xuống cấp thành id số,
còn token hỏng thì mất chat hoàn toàn. Cũng không kéo SDK `io.getstream:stream-chat-java` vào mà
dùng `WebClient` sẵn có, lý do ghi trong javadoc của `StreamChatClient`.

## R8 (MỚI) — Stream đòi user kia phải TỒN TẠI trước khi tạo channel

Bắt được khi verify P2.7a, không phải suy đoán. Bấm "tạo hội thoại với 9004" khi 9004 chưa từng
đăng nhập:

```
StreamChat error code 4: GetOrCreateChannel failed with error: "The following users are involved
in channel create operation, but don't exist: [9004]. Please create the user objects before
setting up the channel."
```

Vì `upsertUser` chỉ chạy cho **người đang xin token**, một user chỉ tồn tại trên Stream sau khi
**chính họ** mở chat lần đầu. Hệ quả thẳng vào tính năng: **không nhắn được cho người chưa từng
mở chat** — mà đó là gần như toàn bộ danh sách bạn bè.

Đã xác nhận đúng là nguyên nhân đó: cho 9004 đăng nhập một lần (bật tạm `email_verified`, gọi
`/chat/token`, tắt lại) → tạo channel **thành công ngay**, và tên hiện đúng.

Ba cách sửa, **cần bạn chọn trước P2.7c-1** vì nó quyết định màn "bắt đầu trò chuyện" hiển thị ai:

- **(i) BE upsert cả danh sách bạn bè** khi cấp token. Đơn giản nhất, một lần gọi `upsertUsers`
  hàng loạt; đổi lại mỗi lần lấy token nặng thêm và đẩy lên Stream cả những người không bao giờ chat.
- **(ii) BE thêm endpoint upsert-theo-yêu-cầu** (`POST /v1/api/chat/users/{userId}`) để FE gọi
  ngay trước khi mở hội thoại. Chính xác, tốn **1 endpoint mới** → ledger 101 → 102.
- **(iii) BE tạo channel hộ** (chính là R6 phương án (c)): tạo channel + upsert cả hai người trong
  một lần, và tiện thể gác theo quan hệ bạn bè. Chặt nhất, tốn 1 endpoint mới.

**Đề xuất (i)** cho phạm vi đồ án: không đổi số endpoint, không đổi kiến trúc, và đúng ngữ cảnh
"chỉ chat với bạn bè". Nếu bạn muốn đúng sản phẩm thật thì (iii).

**Cho tới khi chọn**: `startConversation` ném lỗi của Stream nguyên văn; P2.7c-1 sẽ hiện thông báo
"người này chưa dùng chat bao giờ" thay vì để lộ chuỗi lỗi SDK.

## Quyết định kiến trúc đã chốt ở P2.7a

1. **`stream-chat` (client thuần), KHÔNG `stream-chat-react`.** Bộ UI dựng sẵn kéo theo stylesheet
   và ngôn ngữ thị giác riêng, trái Constraint #1 (mọi component viết tay từ `shared/components`
   khớp DS). Bản Twilio cũ cũng làm đúng vậy.
2. **Không component nào được import `stream-chat`.** Hook map `Channel`/`MessageResponse` sang
   `ChatConversation`/`ChatMessage` của feature. Đây không phải lo xa: dự án vừa mất một checkpoint
   để phát hiện FE dựng trên Twilio còn BE cấp Stream — UI viết bám shape SDK là UI phải viết lại
   lần sau.
3. **Client Stream nằm trong React context, không phải React Query, không phải Redux.** Nó là một
   websocket có `connect`/`disconnect` và store nội bộ do SDK tự mutate — không phải snapshot bất
   biến (React Query sẽ refetch nó) cũng không serialisable (Redux đòi thế). **Một connection cho
   cả app**: `/chats` và cửa sổ nổi dùng chung, connect hai lần là hai websocket và mọi event nhân đôi.
4. **Không có query key namespace cho domain này** — không có query nào để đặt key. Endpoint duy
   nhất được gọi mệnh lệnh trong vòng đời kết nối; mọi thứ màn hình đọc đều tới qua websocket vào
   store của SDK. Ghi rõ trong `hooks/index.ts` để người sau không tưởng là sót.
5. **`connectUser` nhận HÀM cấp token, không phải chuỗi token.** Đưa JWT trần thì hết 24h là rớt
   socket và không có đường về ngoài F5. Đưa hàm thì SDK tự gọi lại khi cần.
6. **503 là trạng thái riêng (`unconfigured`), không gộp vào `error`.** Đó là lỗi người vận hành
   sửa được còn người dùng thì không — gộp vào error là chìa nút "Thử lại" cho người mà retry
   không bao giờ thành công.

## Bẫy đã vấp ở P2.7a (để P2.7c khỏi vấp lại)

- **Strict Mode gọi effect hai lần** → `connectUser` chạy chồng khi lần đầu chưa xong → SDK ném
  "connectUser called twice". Đã chặn bằng `connectingRef`. Lỗi này **chỉ xuất hiện ở dev** và
  trông y hệt lỗi kết nối thật.
- **`react-hooks/set-state-in-effect`** chặn kiểu "reset state ở đầu effect" — vấp ở cả hai hook.
  Cách sửa không phải tắt rule mà là **suy giá trị**: gắn thẻ state theo id hội thoại rồi che dữ
  liệu cũ bằng phép so id. Sửa xong hết luôn một glitch thật: nếu reset bằng effect thì lúc đổi
  hội thoại sẽ **nháy tin nhắn của hội thoại trước** dưới header mới trong một frame.
- **`channel.data.name` không type-check** — v9 để custom field trong `CustomChannelData` rỗng,
  phải `declare module 'stream-chat'`. Augment một chỗ hơn là ép kiểu ở từng chỗ đọc.

## Trạng thái

**P2.7a xong** (data + state, 1/1 endpoint, verify thật). Tiếp: **P2.7c-1** — UI màn `/chats`.

**Dữ liệu test còn lại trên Stream, cố ý giữ**: 1 channel `!members-yM_q3...` giữa 9001 và 9004,
2 tin nhắn. Giữ làm fixture cho P2.7c-1 (không có nó thì màn hội thoại chỉ dựng được empty state).
FE **không xoá được** channel — xoá là quyền phía server; dọn thì vào dashboard Stream.
`email_verified` của 9004 đã trả về `false`.
