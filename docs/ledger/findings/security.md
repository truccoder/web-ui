# Nợ kỹ thuật & phát hiện — security

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

- **Legacy còn sống sau khi security "done" — thuộc shell/domain khác, không phải nợ của
  security** (chốt 2026-07-24, P2.1"d). Mọi surface CỦA security đã lên feature. Nhưng
  4 chỗ legacy vẫn còn vì **consumer ngoài security** dùng:

  | legacy còn lại                                                           | ai dùng                                                                                     | chết ở                                                          |
  | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
  | `lib/hooks/use-user.ts` (`useProfile`, `toProfile`, `PROFILE_QUERY_KEY`) | shell (main/admin layout), dashboard, chats, `create-post-form`, `post-card`, chat provider | posts P2.4, chat P2.7, shell **P3.4**                           |
  | `lib/hooks/use-admin-role.ts` (role cookie + `syncRoleFromProfile`)      | shell (admin gate), `post-auth-redirect`, `useLogout`                                       | shell **P3.4**                                                  |
  | `src/app/(auth)/post-auth-redirect.ts` (role bridge)                     | login/oauth/magic-login routes                                                              | khi role logic vào feature (cần shell migrate trước) — **P3.4** |
  | `lib/api/profile.ts` (legacy `profileApi`)                               | `use-user`, `use-admin-role`                                                                | cùng lúc 2 cái trên                                             |
  | `lib/hooks/use-auth.ts` (`useLogout`)                                    | shell logout button                                                                         | shell **P3.4**                                                  |

  Hệ quả tạm thời: trang `/profile` gọi `GET /profile/me` **hai lần** (query key feature
  `['security','profile','me']` + key legacy `['profile','me']` của shell). Tự hết khi
  shell migrate. Đây là lý do **role bridge KHÔNG retire ở P2.1"d** như báo cáo trước
  hứa nhầm — nó ràng với shell + middleware, phải đợi Phase 3.4.

- **OAuth không có tham số `state`** (phát hiện 2026-07-24, P2.1b).
  `GoogleApiClient.getOAuthUrl()` và `GithubApiClient.getOAuthUrl()` ghép URL chỉ từ
  `client_id` + `redirect_uri` + `scope`, **không có `state`**. Thiếu `state` là thiếu
  chống CSRF cho luồng OAuth: kẻ tấn công có thể ép nạn nhân hoàn tất luồng bằng
  `code` của tài khoản kẻ tấn công (login CSRF), hoặc dùng lại `code` bắt được.
  Sửa được thì phải sửa **cả hai đầu**: BE sinh `state` ngẫu nhiên gắn với session và
  kiểm lại ở callback, FE giữ và gửi kèm. Chưa làm — cần quyết định phía BE.
  Ghi ở đây để không ai tưởng FE "quên" gửi `state`.

- **`GOOGLE_OAUTH_CLIENT_ID` và `GITHUB_OAUTH_CLIENT_ID` bị hoán đổi ở env local**
  (phát hiện 2026-07-24, P2.1c-2). `GET /auth/google/url` trả URL chứa client_id kiểu
  GitHub (`Iv23li…`), còn `GET /auth/github/url` trả client_id kiểu Google
  (`…apps.googleusercontent.com`). Đây là **lỗi cấu hình env của BE**, không phải FE —
  FE redirect đúng theo URL mà BE trả. Sửa: đổi lại hai biến env bên BE. Không chặn
  P2.1c-2 vì FE chỉ chuyển hướng, nhưng luồng OAuth thật sẽ hỏng tới khi env sửa.

- **Điều hướng theo role — bridge legacy tạm thời** (P2.1b → giải quyết tạm ở P2.1d).
  Role không nằm trong JWT, không có endpoint role riêng, nên sau đăng nhập client probe
  `GET /profile/me` rồi cache vào cookie `role`. `/profile/me` thuộc **chu kỳ 3**.
  **Quyết định (user duyệt 2026-07-24): giữ role-sync legacy làm bridge.**
  `src/app/(auth)/post-auth-redirect.ts` gọi `syncRoleFromProfile` (legacy
  `lib/hooks/use-admin-role`) — đặt ở **route layer**, không trong feature, để feature
  chỉ còn đúng một cạnh ngoài biên là `@/lib/i18n`. File này **xoá ở chu kỳ 3** khi
  profile vào feature và role routing thành hook của feature. Verify thật: login USER →
  `/dashboard`, cookie `role=USER`.

- **`useLogout` legacy vẫn còn, cố ý** (P2.1d).
  App shell (`(admin)/layout.tsx`, `(main)/layout.tsx`) vẫn dùng
  `useLogout` + `authApi.logout` legacy. Feature đã có `useLogout` riêng nhưng chưa ai
  wire — shell migrate ở **Phase 3.4**. Hai bản logout song song tới lúc đó. Không xoá
  `authApi.logout` / legacy `useLogout` checkpoint này.

- **`.env.local` (gitignored) trỏ FE → `http://localhost:8080`** (tạo ở P2.1d).
  Trước đó `NEXT_PUBLIC_API_URL` chưa set nên browser gọi same-origin :3000 → 404: FE
  **chưa từng** nói chuyện được với BE trong browser. Tạo `.env.local` để verify happy
  path thật. File gitignored (`.env*`), chỉ có ở máy local — giữ lại thì app local chạy
  đúng với BE, xoá cũng được. CORS BE mặc định cho phép `http://localhost:3000`.

- **Token ghi hai chỗ** (không phải lỗi, ghi để khỏi "dọn nhầm").
  `setTokens()` ghi thẳng localStorage vì interceptor của axios đọc đồng bộ ở đó;
  `StoreProvider` cũng ghi lại cùng key khi Redux đổi. Bỏ lời gọi tường minh thì
  request đầu tiên ngay sau login sẽ phụ thuộc thời điểm store subscriber chạy.
