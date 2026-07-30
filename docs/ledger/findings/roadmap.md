# findings — `roadmap`

Nợ kỹ thuật, cạm bẫy và quyết định đã chốt của domain `roadmap`
(BE package `com.socialapp.roadmap` — `RoadmapController` 4 ep + `SkillVerificationController`
4 ep = 8). Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

Mở lần đầu ở **P2.13a (2a)**, 2026-07-30. Mọi mục dưới đây **đo bằng API thật + đọc Java**,
không suy từ tên endpoint.

---

## 1. NĂM ENDPOINT "CHỈ ADMIN" THỰC RA AI ĐĂNG NHẬP CŨNG GỌI ĐƯỢC (B20)

Đây là phát hiện quan trọng nhất của checkpoint, và nó là **lỗ hổng phân quyền thật**, không
phải chuyện đặt tên.

Năm endpoint mang annotation quyền:

| endpoint                    | annotation                                         |
| --------------------------- | -------------------------------------------------- |
| `POST /roadmaps`            | `@PreAuthorize("hasRole('ADMIN')")`                |
| `POST /roadmaps/{id}/nodes` | `@PreAuthorize("hasRole('ADMIN')")`                |
| `GET /skills/pending`       | `@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")` |
| `POST /skills/{id}/approve` | `@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")` |
| `POST /skills/{id}/reject`  | `@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")` |

**Không cái nào có hiệu lực.** Hai lý do cộng lại:

1. `grep -rn "EnableMethodSecurity\|EnableGlobalMethodSecurity" src/main/java/` → **rỗng**.
   Không bật method security thì `@PreAuthorize` chỉ là chú thích.
2. `SecurityConfig` chỉ gác ở tầng URL cho `/v1/api/admin/**`. `/v1/api/roadmaps` và
   `/v1/api/skills` **không nằm dưới `/admin/**`** nên rơi vào `.anyRequest().authenticated()`.

Đo bằng seed user thường `nguyen.truc@test.com` (id 9001):

```
POST /v1/api/roadmaps  {"name":"x"}   → 200, tạo thật (id=2, đã xoá lại bằng SQL)
GET  /v1/api/skills/pending           → 200
JWT payload: {"sub":"...","iat":...,"exp":...,"jobTitle":"Backend Developer"}
                                        ↑ không có claim role nào
```

Đối chiếu: `/admin/moderation` **được** bảo vệ, vì nó khớp `/v1/api/admin/**` — tức là cơ chế
URL hoạt động, chỉ có nhánh method-level là chết.

**Quyết định cho FE (chốt ở 2a, hiện thực ở 2b):** vẫn thiết kế 5 endpoint này **như thao tác
admin**, gác bằng `useIsRoadmapAdmin` — đọc `role` từ `/profile/me` qua barrel
`features/security`. **Tuyệt đối không** vì thấy 200 mà dựng mặt soạn thảo roadmap cho mọi
người. Khi BE bật gate, phía FE không phải sửa gì.

**Không dùng `lib/hooks/use-admin-role.ts`** (bản 2a của mục này có nhắc tới nó — sai). Đó là
code legacy đọc cookie `role`, tồn tại cho edge middleware vì middleware không với được vào
query cache, và đã xếp lịch xoá ở P3.4. Một feature không có việc gì phải đọc cookie đó.

**Và cổng này KHÔNG PHẢI là bảo mật.** Nó chỉ khiến app không _mời_ mọi người dùng thao tác
admin. Ai muốn gọi thẳng bằng curl vẫn gọi được và vẫn thành công, cho tới khi BE sửa B20.

## 2. NGƯỜI DÙNG KHÔNG ĐỌC ĐƯỢC TIẾN ĐỘ CỦA CHÍNH MÌNH (B21)

`UserRoadmapProgressRepository.findByUserId` **có tồn tại** và **không controller nào gọi**.
Cộng với `submitVerification` trả `void`, hệ quả:

- không render được node là "đã xác minh / đang chờ / bị từ chối" cho người đang đăng nhập;
- ngay cả kết quả tức thì cũng không thấy được (xem mục 3);
- gửi lại là cách duy nhất để đổi, và nó **ghi đè im lặng** dòng cũ
  (`findByUserIdAndNodeId` → `save`), không có gì để cảnh báo người dùng.

**Không được mô phỏng bằng state client.** Đó đúng là sai lầm `acceptedInSession` mà dự án này
vừa mất một checkpoint để gỡ ở F-A.

## 3. `POST /skills/verify` — bốn tier làm bốn việc khác nhau, và trả `void`

`SkillVerificationService.submitVerificationRequest` rẽ nhánh theo `tier`:

| tier             | kết quả ngay                                  | thưởng reputation               |
| ---------------- | --------------------------------------------- | ------------------------------- |
| `SELF_VERIFIED`  | `VERIFIED` luôn                               | `ROADMAP_SELF_VERIFIED`         |
| `MOD_VERIFIED`   | `PENDING_APPROVAL`, chờ mod                   | không (chờ approve)             |
| `QUIZ_VERIFIED`  | `PENDING_APPROVAL`, chờ mod                   | không (chờ approve)             |
| `AUTO_CERTIFIED` | kiểm tại chỗ → `VERIFIED` **hoặc `REJECTED`** | `ROADMAP_NODE_VERIFIED` nếu đạt |

→ **200 KHÔNG có nghĩa là "được duyệt".** Một `AUTO_CERTIFIED` trượt kiểm cũng trả 200, để lại
dòng `REJECTED`, và người dùng không có cách nào đọc lại (mục 2). UI **không được** báo thành
công là đã xác minh.

**`AUTO_CERTIFIED` phụ thuộc domain `github`.** `verifyViaExternalApi` chỉ chấp nhận khi
`proofUrl` bắt đầu bằng `https://github.com/{username github đã liên kết}/`, đọc từ dữ liệu
`GithubStatsRepository`. Chưa liên kết GitHub / thiếu `proofUrl` / URL của người khác → trượt,
im lặng. Đây là **coupling thật** roadmap → github: đi qua barrel `features/github` ở tầng UI,
không tự cài lại. Lưu ý thứ tự: `github` làm **sau** `roadmap` trong khối B.

## 4. `orderIndex` có mặt nhưng không sắp xếp gì

`RoadmapNodeRepository` khai `findByRoadmapId` **không có `OrderBy`**. Node trả về theo thứ tự
database tự chọn, dù cột `orderIndex` tồn tại và luôn khác null ở đường đọc.

→ **Sắp xếp là việc của consumer.** UI render thẳng mảng nhận được sẽ ổn ở dev và đảo thứ tự ở
production. Đã ghi cạnh type `RoadmapNode`.

## 5. `POST .../nodes` echo lại request DTO, không đọc lại entity

`addNodeToRoadmap` vá `id` + `roadmapId` vào chính DTO nhận được rồi trả ra. Field nào backend
default lúc lưu thì **response vẫn null**:

```
POST {"name":"n1"}          → {"id":2,...,"orderIndex":null}
GET  .../nodes  (cùng dòng) → [{"id":2,...,"orderIndex":0}]
```

→ Đã tách type riêng `CreatedRoadmapNode` (yếu hơn `RoadmapNode`) thay vì nới lỏng type đọc —
đường đọc thật sự bảo đảm field đó, và phần lớn consumer nằm ở đường đọc. Cần node đã lưu thì
**fetch lại**.

`createRoadmap` cũng echo request DTO + vá id, nhưng vô hại vì entity lưu đúng thứ đã gửi.

## 6. Vài hành vi lẻ, đã đo

- **`GET /roadmaps/{id}/nodes` với id không tồn tại → 200 `[]`, không phải 404.**
  `getRoadmapNodes` truy theo khoá ngoại, không kiểm roadmap có tồn tại. Không phân biệt được
  "không có roadmap" với "roadmap không có node".
- **`name` rỗng → 422 kèm `details` theo field** (không phải 400). `@Valid` chặn ở controller.
- **`parentNodeId` không tồn tại → 404 "Parent node not found"**; nhưng parent **thuộc roadmap
  khác thì được chấp nhận** — không có ràng buộc cùng track.
- **`nodeId` không tồn tại ở `/skills/verify` → 404 "Node not found"**.
- **Không có endpoint DELETE nào** cho roadmap hay node. Dữ liệu thử phải xoá bằng SQL
  (`docker exec postgres psql -U postgres -d socialapp`).

## 7. Trạng thái dữ liệu dev: RỖNG

`select count(*) from socialapp.t_roadmaps` → **0**. Không có seed roadmap nào. Nghĩa là 2c/2d
sẽ không có gì để hiển thị nếu không tự tạo dữ liệu — và tạo được là **nhờ mục 1**, tức là dựa
vào chính lỗ hổng. Khi verify UI ở 2d, nói rõ dữ liệu là tự tạo và dọn sạch sau đó.

---

## 8. `MODERATOR` không tồn tại — bổ sung cho §1 (đo ở 2b)

`UserRole` bên BE là:

```java
public enum UserRole { USER, ADMIN }
```

Không có `MODERATOR`. Nghĩa là `@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")` trên 3 endpoint
skill-verification **gọi tên một role không ai mang được** — kể cả khi BE bật
`@EnableMethodSecurity`, chỉ ADMIN qua được. `UserResponse.role` trong spec cũng chỉ có
`"USER" | "ADMIN"`, khớp với enum.

→ Sửa B20 không chỉ là bật method security; còn phải quyết định `MODERATOR` là role thật (thêm
vào enum + cách gán) hay chỉ là chữ thừa trong annotation.

→ **FE gác bằng ADMIN, không gác bằng MODERATOR.** Gác theo một giá trị không thể xuất hiện thì
điều kiện đó vĩnh viễn sai. Nằm ở `useIsRoadmapAdmin` — một chỗ duy nhất phải sửa nếu role được
thêm sau này.

## 9. Cách test hai phía của cổng quyền ở 2c/2d

DB có **2 tài khoản ADMIN** (`admin1@socialapp.com` id 6, `admin2@socialapp.com` id 7), cả hai đã
`email_verified`. **Mật khẩu seed của chúng KHÔNG phải `12345678`** — đã thử 4 mật khẩu thường gặp,
đều 401. Đừng mất thời gian đoán tiếp.

Cách dùng ở 2c/2d — tạm nâng quyền chính seed user rồi **trả lại ngay**, đã chạy thử ở 2b và
xác nhận `/profile/me` phản ánh đúng cả hai chiều:

```bash
docker exec postgres psql -U postgres -d socialapp \
  -c "update socialapp.t_users set role='ADMIN' where id=9001;"
# ... đăng nhập lại (role nằm trong profile, không nằm trong JWT) rồi verify mặt admin ...
docker exec postgres psql -U postgres -d socialapp \
  -c "update socialapp.t_users set role='USER' where id=9001;"
```

**Phải đăng nhập lại sau mỗi lần đổi**, và phải trả về `USER` khi xong — để nguyên trạng thái
nâng quyền sẽ làm mọi phiên sau đo sai chính cái cổng này.
