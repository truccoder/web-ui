# findings — `matchmaking`

Nợ kỹ thuật, cạm bẫy và quyết định đã chốt của domain `matchmaking`
(BE package `com.socialapp.matchmaking`, `ProjectController`, 5 endpoint).
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

Mở lần đầu ở **P2.16ab**, 2026-07-30. Mọi mục **đo bằng API thật + SQL + đọc Java**.

---

## 1. DOMAIN NÀY KHÔNG DỰNG ĐƯỢC MÀN NÀO — chặn cứng 2cd (B24)

Đây không phải "chưa làm", mà là **API không cho phép làm**. Ba sự thật:

### (a) Không có endpoint nào liệt kê bất cứ thứ gì

`ProjectController` có đúng 5 endpoint, và **không cái nào trả về danh sách** project, position
hay application. Không có endpoint nào khác trong toàn bộ API làm việc đó.

Khác `roadmap` (B21) ở một điểm quan trọng: bên đó `findByUserId` **có sẵn** trong repository, chỉ
là chưa controller nào gọi — sửa là thêm một controller. Ở đây repository **không có method nào**:

```java
public interface ProjectRepository extends JpaRepository<ProjectEntity, Integer> {}   // rỗng
public interface ProjectPositionRepository ... { findByIdForUpdate(...) }             // chỉ khoá row
public interface ProjectApplicationRepository ... { countByPositionIdAndStatus(...) } // chỉ đếm
```

→ **4/5 endpoint cần một id mà không đường nào lấy được**: `applyToPosition` và
`getSuggestedCandidates` cần `positionId`; `acceptApplication` và `rejectApplication` cần
`applicationId`.

### (b) `createProject` vứt đi chính id nó vừa tạo

```java
// ProjectService — TRẢ VỀ entity đã lưu, kèm id của project và của từng position
@Transactional public ProjectEntity createProject(...) { ... return projectRepository.save(project); }

// ProjectController — KHAI void, vứt luôn
@PostMapping public void createProject(...) { projectService.createProject(authorId, request); }
```

Đo: `POST /v1/api/projects` → **200, body rỗng**. Id của project (1) và position (1) chỉ đọc được
bằng cách truy thẳng Postgres. **Người tạo không thể thấy thứ mình vừa tạo.**

Đây là mục rẻ nhất để sửa: đổi kiểu trả về của controller.

### (c) Endpoint đọc DUY NHẤT của domain luôn trả 500

`findBySkillsMatch` là **native query duy nhất** trong backend, và nó gọi tên bảng không có schema:

```java
"SELECT * FROM t_user_professional_profiles p WHERE EXISTS (...)"
```

Bảng thật là `socialapp.t_user_professional_profiles`. Đo:

```
GET /v1/api/projects/positions/1/suggested-candidates
→ 500  relation "t_user_professional_profiles" does not exist
```

Mọi repository khác dùng JPQL (biết schema qua entity mapping), nên đây là query duy nhất dính.

### Hệ quả

Gọi được **1/5** endpoint mà không cần id từ ngoài (`createProject`), và ngay cả nó cũng không cho
biết kết quả. **Không có gì để render.** Đã gửi BE thành **B24**; P2.16ab dừng ở tầng data/state
(đúng và đủ với hợp đồng hiện tại), UI hoãn.

## 2. Mã lỗi đã đo

| gọi                                        | tình huống                | kết quả                                                            |
| ------------------------------------------ | ------------------------- | ------------------------------------------------------------------ |
| `POST /positions/{id}/apply`               | position không tồn tại    | **404** "Position not found"                                       |
| `POST /positions/{id}/apply`               | position không `OPEN`     | **409** "Position is not open for applications"                    |
| `POST /applications/{id}/accept`           | application đã `ACCEPTED` | **409** "Cannot decide on an application that is already ACCEPTED" |
| `POST /projects`                           | hợp lệ                    | **200**, body rỗng                                                 |
| `GET /positions/{id}/suggested-candidates` | mọi trường hợp            | **500** (mục 1c)                                                   |

## 3. `SuggestedCandidateDto` hẹp là CỐ Ý — đừng bù đắp

Javadoc của BE nói thẳng:

> "Only the fields a project owner needs to judge fit — the full professional profile (work
> history, explanation style, interested domains) belongs to its owner and is not a project
> owner's to read through the matchmaking endpoint."

→ Ba field thiếu là **quyết định về quyền riêng tư**, không phải sót. UI **không được** đi tìm
chúng ở chỗ khác — và cũng không có chỗ khác: không có endpoint profile công khai.

`userId` là field duy nhất định danh người, và **không quy đổi được** thành tên hay ảnh. Nên một
card ứng viên chỉ có thể hiện chức danh + thâm niên + tech stack, không có danh tính.

## 4. Vài ràng buộc khác của mô hình

- **Position chỉ tạo được cùng lúc với project.** Không có endpoint thêm/sửa/xoá position sau đó,
  nên mảng `positions` gửi trong `POST /projects` là vĩnh viễn.
- **`message` của application không có validation nào** — kể cả `@NotBlank`. Đơn ứng tuyển rỗng
  vẫn được nhận. UI tự quyết có bắt buộc hay không.
- **Gợi ý ứng viên không có xếp hạng**: `findBySkillsMatch` là "trùng ít nhất một skill", không
  điểm số, không thứ tự. Nó là **danh sách rút gọn**, không phải bảng xếp hạng — đừng trình bày
  như bảng xếp hạng. Position không có `requiredSkills` thì trả `[]` mà không truy vấn gì.
- **`acceptApplication` khoá row position** (`findByIdForUpdate`) để hai lệnh accept đồng thời
  không cùng lọt qua kiểm tra `quantity`. Nghĩa là một accept **có thể thất bại vì người khác vừa
  lấy chỗ cuối** — lỗi này người dùng không gây ra, UI phải hiện chứ không nuốt.

## 5. Trạng thái dữ liệu dev

`t_projects`, `t_project_positions`, `t_project_applications` **đều rỗng**, không có seed. Dữ liệu
tôi tạo lúc đo đã xoá hết (0/0/0).
