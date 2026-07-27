# Nợ kỹ thuật & phát hiện — newsfeed

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

- **Feed đọc 100% từ Redis, KHÔNG có fallback DB** (`NewsfeedService.getFeed` đọc zset `feed:<userId>`,
  zset rỗng thì trả trang rỗng). Ba hệ quả cho mọi lần debug về sau:
  - post nằm trong Postgres mà chưa được fan-out thì **không bao giờ hiện**;
  - xoá post thẳng bằng SQL để lại **bài ma** trong feed cho tới khi xoá `feedpost:<id>`;
  - "không thấy trên feed" **không chứng minh** "chưa lưu được".
    Cách dựng dữ liệu test đúng: insert DB (`PENDING_REVIEW`) → duyệt qua
    `POST /admin/moderation/posts/{id}/review` với `VERY_UNLIKELY` (BE tự fan-out, không chạm Gemini).

- **`hasMore` là tín hiệu phân trang DUY NHẤT.** Không có tổng số, nên không dựng được pager theo số
  trang — chỉ "hỏi tiếp tới khi `hasMore` false". `getNextPageParam` đọc `lastPage.page + 1` (số trang
  server trả) chứ không đếm số trang đã fetch, để refetch không làm lệch con trỏ.

- **`likeCount` / `commentCount` / `shareCount` vĩnh viễn 0** — xem `findings/posts.md`. FE không render
  ba số này (ds-deviation #14/#19). Chúng là `int` của Java nên **luôn có mặt**, chỉ là vô nghĩa: có mặt
  không đồng nghĩa với đáng tin.

- **6 khối details không bao giờ được echo** (`codeSnippet` `article` `qna` `poll` `link` `quiz`) — cũng ở
  `findings/posts.md`. Type của module này khai đúng là nullable; lỗi nằm ở `fanOutPost`, không ở đây.

- **Type khai `| null`, tuyệt đối không `?:`** (chốt P2.5). Jackson chạy mức mặc định `ALWAYS` nên wire
  gửi `"quizDetails": null` — key **có mặt**, giá trị null. Khác biệt này đã gây 2 lỗi thật (xếp nhầm
  comment gốc thành reply ở P2.4′a; khoá nút RSVP vì `0 >= null` ở P2.4″d), nên nó được mã hoá thẳng vào
  `FeedPost` bằng mapped type thay vì trông chờ người viết consumer nhớ. Ngay lúc dựng, type mới bắt được
  một chỗ ép kiểu ngầm ở `toEditorState`.

- **Cầu tạm bookstore đi vào bằng render prop, không bằng import** (chốt P2.5). `features/newsfeed` mà
  import `components/posts/book-post-actions.tsx` là nhét legacy path vào trong feature → hỏng extraction
  test (§4). Page `/newsfeed` truyền `renderBookActions` xuống. **P2.10**: đổi sang component của
  `features/bookstore` rồi bỏ hẳn prop.

- **BẪY MÔI TRƯỜNG khi verify: tab Chrome ẩn thì `IntersectionObserver` KHÔNG chạy.**
  Đo ở P2.5: `document.visibilityState === 'hidden'` → cuộn xuống đáy không nạp trang 2, và cả một
  observer dựng tay trong console cũng **không hề fire**. Không phải lỗi code. Kiểm `visibilityState`
  trước khi đi truy sentinel/effect; khi tab được hiện lại thì trang 2 nạp ngay (đo được 13 card / 2
  request).
