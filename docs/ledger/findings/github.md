# findings — `github`

Nợ kỹ thuật, cạm bẫy và quyết định đã chốt của domain `github`
(BE package `com.socialapp.github`, `GithubController`, 5 endpoint).
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

Mở lần đầu ở **P2.14ab**, 2026-07-30. Mọi mục **đo bằng API thật + SQL + đọc Java**.

---

## 1. LUỒNG LIÊN KẾT KHÔNG THỂ HOÀN THÀNH — chặn cứng 2cd (B23)

Ba sự thật cộng lại. Từng cái một thì sửa được; cả ba thì luồng liên kết **không có đường đi**.

**(a) Hai endpoint URL trả về CHUỖI GIỐNG HỆT NHAU.** Đo:

```
GET /v1/api/github/oauth/url   (liên kết — GithubService)
GET /v1/api/auth/github/url    (đăng nhập — OAuthAuthService)
→ cả hai:
https://github.com/login/oauth/authorize?client_id=<...>&redirect_uri=http://localhost:3000/oauth/github/callback&scope=read:user%20user:email
```

Vì `OAuthAuthService` **dùng lại chính `GithubApiClient`** (`import com.socialapp.github.service.GithubApiClient`), và chỉ có **một** khối config `github.oauth`.

**(b) `redirect_uri` trỏ vào callback ĐĂNG NHẬP.** `/oauth/github/callback` là route của
`features/security`; nó gọi endpoint login và **tiêu** mã code. Code OAuth của GitHub dùng một
lần, nên không còn gì để gửi sang `/v1/api/github/oauth/callback`.

**(c) Middleware chặn người đã đăng nhập vào chính route đó.** `src/middleware.ts`:

```ts
const isPublicPath = publicPaths.some((p) => pathname.startsWith(p)); // '/oauth' nằm trong list
if (hasSession && isPublicPath) return NextResponse.redirect(new URL(homePath, request.url));
```

Mà người đi liên kết **luôn** đang đăng nhập. Nên họ bị đẩy đi trước khi trang callback chạy.

**Thêm một chuyện của môi trường dev, không phải lỗi thiết kế:** `client_id` trả về là
`930430013386-...apps.googleusercontent.com` — một **client id của Google** nằm trong ô GitHub.
Ở máy này URL đó không xác thực với GitHub được kể cả khi (a)(b)(c) đã sửa.

### Hai hướng giải, phải chốt TRƯỚC khi làm 2cd

|                                   | cách làm                                                                                                          | đổi lại                                                                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. BE tách redirect_uri**       | thêm `github.link.redirect-uri` riêng (vd `/settings/github/callback`), FE dựng route mới cho nó                  | sạch, hai luồng độc lập; cần BE sửa + đăng ký thêm callback URL trên GitHub App                                                                                                |
| **B. FE phân nhánh tại callback** | `/oauth/github/callback` xem có session không: có → gọi endpoint **liên kết**, không → gọi endpoint **đăng nhập** | không cần BE; **nhưng vẫn phải sửa `middleware.ts`** cho `/oauth/github/callback` qua được khi đã đăng nhập, tức đụng luật điều hướng toàn app — thứ P2.13d đã cố ý không đụng |

**Chưa chốt.** Đây là quyết định `CLAUDE.md` không settle sẵn, nên P2.14ab dừng ở tầng data/state
(không phụ thuộc lựa chọn) và hỏi trước khi dựng UI.

**Đọc và huỷ liên kết KHÔNG vướng gì** — hoạt động bình thường hôm nay.

## 2. Ghi mà không báo kết quả — `syncGithubData` nuốt mọi lỗi

```java
} catch (Exception e) {
  log.error("Error syncing GitHub stats for user {}", entity.getUser().getId(), e);
}
```

Hệ quả theo từng đường:

- **`POST /sync` trả 200 kể cả khi sync hỏng hoàn toàn.** Cách duy nhất để biết: đọc lại
  `getStats` và so `lastSyncedAt`.
- **`POST /oauth/callback` lần ĐẦU có thể trả 200 mà không lưu gì.** `linkAccountWithTokenAndProfile`
  tạo entity **mới, chưa managed**, rồi gọi `syncGithubData`; lệnh `save()` duy nhất nằm **bên
  trong** khối try. GitHub không với tới được → không có `save()` → không có dòng nào trong DB,
  caller vẫn nhận 200.
- Liên kết **lại** thì an toàn hơn _do tình cờ_: entity đã tồn tại nên được Hibernate quản lý,
  các setter vẫn flush dù sync hỏng.

→ FE **không optimistic ở bất cứ đâu** trong domain này; mọi mutation invalidate rồi tin bản đọc lại.

## 3. Mã lỗi đã đo

| gọi               | tình huống               | kết quả                                                      |
| ----------------- | ------------------------ | ------------------------------------------------------------ |
| `GET /stats/{id}` | chưa liên kết            | **404** `"GitHub account not linked"`                        |
| `POST /sync`      | chưa liên kết            | **404**                                                      |
| `POST /sync`      | đã sync trong vòng 1 giờ | **409** `"Please wait at least 1 hour before syncing again"` |
| `DELETE /unlink`  | chưa liên kết            | **200** (idempotent, im lặng)                                |

404 của `getStats` là **trạng thái bình thường**, không phải lỗi → không retry, UI hiện empty
state kèm nút liên kết. Giới hạn 1 giờ hardcode trong `syncNow`, không có header nào báo.

## 4. `pinnedRepos` + `contributionGraph` là `JsonNode` — generator bó tay

Spec sinh ra `JsonNode: Record<string, never>` — type **từ chối mọi giá trị thật**. Đây là ngoại
lệ chính đáng của luật "derive từ `schema.gen.ts`": không phải nguồn sự thật thứ hai, mà là
**không có nguồn nào**.

Hình dạng chép nguyên văn từ GraphQL query trong `GithubApiClient` (đã pin nguyên câu query cạnh
type, vì query đổi thì type sai mà **không có gì vỡ compile**):

```
pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository {
  name description url stargazerCount forkCount primaryLanguage { name color } } } }

contributionsCollection { contributionCalendar {
  totalContributions weeks { contributionDays { date contributionCount color } } } }
```

Đo bằng dòng dữ liệu tự chèn đúng hình dạng đó: `primaryLanguage` **null được**, `description`
**null được**, `date` là `YYYY-MM-DD` (scalar `Date` của GitHub, **không phải timestamp**).

**Fallback rỗng, đã đo:** query hỏng → `pinnedRepos` = `[]`, `contributionGraph` = `{}`.
`{}` **không phải** một calendar (không có `weeks` để duyệt), nên `normalizeStats` biến nó thành
`null`; `[]` giữ nguyên là mảng rỗng. Tối đa **6** pinned repo — `first: 6`, không có cursor.

## 5. Trạng thái dữ liệu dev

`t_user_github_stats` **rỗng** (0 dòng) và không có seed. Dòng tôi chèn để đo hình dạng đã xoá.
Không thể liên kết thật ở môi trường này (xem §1), nên 2cd sẽ phải verify bằng dòng tự chèn —
nói rõ điều đó khi verify.
