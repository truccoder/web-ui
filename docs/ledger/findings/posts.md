# Nợ kỹ thuật & phát hiện — posts

Một file cho mỗi domain: phiên làm việc chỉ đọc file của domain đang làm.
Quay lại [`fe-migration-ledger.md`](../../fe-migration-ledger.md).

- **Chu kỳ 2 — 5 phát hiện của tầng data (P2.4′a), tất cả ảnh hưởng tới UI b/c/d:**
  1. **Thread chỉ SÂU 2 TẦNG.** `CommentService.validateParentComment` ném
     _"Replies can only be made to top-level comments"_ khi parent đã có `parentId`. Trả lời
     một reply phải gửi `parentId` của **comment gốc**, không phải của comment đang trả lời.
     UI đừng dựng cây đệ quy rồi mong BE nhận.
  2. **Xoá comment gốc là xoá luôn reply, và Java KHÔNG nói điều đó.**
     `deleteComment` chỉ là `repository.delete(comment)`; cascade nằm ở Postgres
     (`t_comments_parent_id_fkey ... ON DELETE CASCADE`, đã kiểm trên dev DB). Nên sau khi
     xoá phải **refetch cả thread**, không splice một dòng khỏi cache.
  3. **Không có `isEdited`.** `@UpdateTimestamp` được Hibernate sinh **ngay lúc INSERT** (đo
     thật: comment vừa tạo có `updatedAt === createdAt`), nên cách duy nhất nhận ra bài đã
     sửa là so `updatedAt !== createdAt`.
  4. **Không có endpoint đọc tổng reaction lẫn danh sách người thả.**
     `PostReactionController` chỉ trả lời "**tôi** đã thả gì" (`/reactions/me`, 1 request /
     post, không có bản batch). Con số tổng nằm trong payload post của **newsfeed/search**
     → muốn số nhảy sau khi bấm thì phải patch feed entry hoặc refetch feed, controller này
     không bao giờ trả về tổng mới. Cùng loại phụ thuộc với `invalidate` xuyên domain ở dưới.
  5. **Bỏ reaction khi chưa từng thả là LỖI, không phải no-op.** `removeReaction` ném
     `NotFoundException("Reaction not found for this post")`. Toggle phải biết trạng thái
     hiện tại trước khi bắn, và optimistic update phải rollback được.

  Đo trên API thật (post id 1, seed user 9001): `GET /reactions/me` khi chưa thả trả
  **`{"reactionType":null}`** — key **có mặt**, giá trị null (Jackson để mặc định `ALWAYS`,
  BE không cấu hình `NON_NULL`). Nên type là `reactionType: ReactionType | null`, không phải
  optional. Comment probe đã xoá sạch (`t_comments` = 0 dòng).

- **Type tên `PostComment`, không phải `Comment`** (P2.4′a). `lib.dom` đã khai báo global
  `Comment` (DOM node); file quên import bản của ta vẫn compile qua global đó rồi hỏng ở chỗ
  chẳng liên quan. Tiền tố không tốn gì.

- **ĐÍNH CHÍNH type của P2.4′a: field nullable phải là `| null`, KHÔNG phải `?:`** (sửa ngay ở
  P2.4′b trước khi có consumer). `schema.gen.ts` khai mọi field optional, nhưng payload thật thì
  khác: BE để Jackson ở mức mặc định `ALWAYS` (không cấu hình `NON_NULL`) nên
  `authorFullName` / `authorProfilePictureUrl` / `parentId` về dưới dạng **`"parentId": null`,
  key CÓ mặt**, không phải key thiếu. Khai `?:` sẽ khiến `=== undefined` trông như phép kiểm
  đúng và sai mọi lần — cụ thể là **mọi comment gốc bị xếp nhầm thành reply**. `groupComments`
  vì vậy dùng `== null` (lỏng) để sống sót cả nếu BE sau này bật `NON_NULL`.

- **3 luật comment + cascade đã ĐO THẬT trên API** (P2.4′b, post id 1, user 9001), không còn là
  suy luận từ đọc Java:

  | thao tác                             | kết quả đo được                                                     |
  | ------------------------------------ | ------------------------------------------------------------------- |
  | trả lời một reply (`parentId`=reply) | **400** `"Replies can only be made to top-level comments"`          |
  | `content` toàn khoảng trắng          | **400** `"Comment content must not be blank"`                       |
  | xoá comment gốc có 1 reply           | 200, `t_comments` còn **0** dòng → **cascade có thật**              |
  | `DELETE /reactions` khi chưa thả     | **404** `"Reaction not found for this post"`                        |
  | `PUT /reactions` LIKE → LOVE         | 200 cả hai lần, `/me` trả đúng giá trị mới → upsert, không phải xoá |

  Dev DB đã dọn sạch sau khi đo (`t_comments` = 0, không còn reaction).

- **Reaction: optimistic CÓ, nhưng chỉ trên `myReaction`** (chốt P2.4′b). Bấm emoji là đúng ca
  UX cần optimistic (nút phải sáng ngay dưới ngón tay), nên `useUpsertReaction` /
  `useRemoveReaction` ghi thẳng `postKeys.myReaction(postId)` trong `onMutate` kèm snapshot để
  rollback. **Không đụng con số tổng** — tổng nằm trong payload post của newsfeed/search, domain
  khác, và endpoint này không bao giờ trả tổng mới. Hệ quả UI phải thiết kế theo: highlight đổi
  tức thì còn con số chỉ nhúc nhích khi màn hình compose refresh feed; đừng dựng UI ngụ ý hai
  thứ đó đi cùng nhau.
  Vì hai hook này sở hữu context rollback nên `ReactionMutationOptions` **cắt `onMutate`** khỏi
  options của caller (khác `PostMutationOptions` của chu kỳ 1, vốn passthrough tất): caller đưa
  `onMutate` vào sẽ đè mất snapshot và rollback thành no-op. Cắt ở tầng type để lỗi đó không
  compile được.

- **`groupComments` nằm ở tầng state, không nằm trong component** (P2.4′b). Thread về dạng phẳng
  kèm `parentId`, mà mọi surface hiển thị comment đều cần đúng một phép gom 2 tầng. Reply mồ côi
  (parent không có trong list) được **đẩy lên thành gốc chứ không bị bỏ** — cascade khiến mồ côi
  đáng lẽ không tồn tại, nên lặng lẽ drop là giấu bug chứ không phải dọn dữ liệu.

- **Cách tách UI chu kỳ 2 (công bố ở P2.4′c-1) — 5 bước, không phải 4:**

  | ID       | surface                                                            | endpoint                                      |
  | -------- | ------------------------------------------------------------------ | --------------------------------------------- |
  | c-1 ✅   | shared `DeveloperIdentity`+`DeveloperMeta`; `PostCard` (vỏ + slot) | — (render payload feed)                       |
  | c-1′a ✅ | `CodeSnippetBody` `ArticleBody` `LinkBody` `QnaBody`               | — (render payload feed)                       |
  | c-1′b ✅ | `PollBody` `BookBody` `EventBody`                                  | — (render payload feed)                       |
  | c-2 ✅   | `ReactionBar` (5 toggle inline)                                    | getMyReaction · upsert · remove               |
  | c-3 ✅   | `CommentThread` `CommentItem` `CommentComposer`                    | 4 ep CommentController                        |
  | c-4 ✅   | `QuizTaker` `PostEditor` `PostMenu` + accept trong thread          | submitQuiz · updatePost · deletePost · accept |

  **Vì sao tách c-1 thành c-1 + c-1′** (phát hiện lúc đọc `FeedPostDataDto`, trước khi viết code):
  payload feed mang **8 khối details** (event/book/quiz/codeSnippet/article/qna/poll/link). Dựng
  hết trong một checkpoint là vượt xa trần 5 component. Nên c-1 chỉ ship **vỏ card + hàng danh
  tính**, thân bài vào **slot `body`**.

- **`ReactionBar`: 5 toggle inline, icon đơn sắc, KHÔNG phải tray emoji nổi** (P2.4′c-2).
  Mẫu quen thuộc là một nút + khay emoji bay ra khi hover, nhưng **DS không có spec
  popover/floating panel nào** (chỉ Dialog/Menu/Tooltip/Toast) — dựng một cái ở đây là bịa
  primitive mới, đúng lý do đã khiến `LocationPicker` thành panel inline. 5 toggle không cần
  tầng nổi và cho thấy trạng thái hiện tại mà không phải hover.
  **Icon lucide đơn sắc thay vì emoji màu**: cả app không chỗ nào render emoji, palette cố ý
  chỉ ink + một xanh + amber-cho-uy-tín (§1). Trạng thái active mang bởi **viền +
  `aria-pressed`**, không phải chỉ bằng màu (§12).
  **Gate 404 nằm ở đây**: `remove` chỉ bắn khi `current === type`; mọi trường hợp khác là
  upsert, kể cả đổi LIKE → LOVE. Nhờ vậy nhánh
  `NotFoundException("Reaction not found for this post")` không bao giờ bị chạm trong luồng
  bình thường — rollback là lưới an toàn, không phải đường đi chính.
  **Con số tổng KHÔNG nhúc nhích khi bấm**, và đó là sự thật của BE chứ không phải thiếu sót:
  `count` đến từ payload feed/search của caller, `onChanged` để màn compose tự quyết có refetch
  feed không. **Cấm cộng trừ tại chỗ** — highlight là thật, tổng bịa thì không.

- **NỢ VERIFY ĐÃ TRẢ HẾT cho c-1 · c-1′a · c-1′b · c-2** (P2.4′c-v, checkpoint riêng do user
  yêu cầu trả trước khi làm c-3). Extension Chrome nối lại được, nên **không thêm test runner** —
  đường trình duyệt rẻ hơn và còn kiểm được diện mạo, thứ test runner không làm.
  Đã chạy thật, đăng nhập bằng seed user qua đúng form login:
  - **Hành vi `ReactionBar` (nợ nặng nhất): 4/4 đúng.** Bấm Thích → `aria-pressed` bật **ngay
    lập tức** trước khi server trả (optimistic có thật), server sau đó trả `LIKE`. Thích → Yêu
    thích: chỉ Yêu thích pressed, server `LOVE`, **không lỗi** → đúng là upsert chứ không phải
    xoá-rồi-tạo. Bấm Yêu thích lần hai: server về `null`, **không có 404 nào** → gate hoạt động.
    Dev DB sạch sau khi đo (`t_post_reactions` = 0).
  - **Diện mạo + dark mode**: cả 9 card, 7 khối body, chip rep, badge, hàng reaction đều đúng ở
    light lẫn dark; mọi token lật đúng, không chỗ nào vỡ layout.
  - **So với specimen DS đã render** (`display.card.html`): thứ tự doctrine avatar → tên → rep →
    time khớp. Ba khác biệt nhìn thấy đều là deviation **đã ghi từ trước** (#5 màu avatar, #11 chip
    không có levelName, #17 không có pill expertise). Một khác biệt chưa ghi → thành **#18**.

- **`acceptAnswer` KHÔNG BAO GIỜ set `isResolved` — lỗi thật, đã sửa ở FE** (P2.4′c-4).
  `PostService.acceptAnswer` chỉ `qnaDetails.setAcceptedAnswerId(commentId)`. Đo trên DB ngay
  sau khi bấm: `{"isResolved": false, "acceptedAnswerId": 61}`. Mà `PostComposer` luôn tạo bài
  QNA với `isResolved: false` và **không đường nào khác ghi field đó** → `isResolved` vĩnh viễn
  false. Bản `QnaBody` đầu tiên (c-1′a) đọc đúng field đó, tức **mọi câu hỏi đã có đáp án vẫn bị
  gắn nhãn "Chưa có đáp án"**. Đã sửa: `resolved = isResolved === true || acceptedAnswerId != null`.
- **Chọn đáp án là MỘT LẦN, không đổi được** (P2.4′c-4). `acceptAnswer` ném
  _"An answer has already been accepted for this post"_ khi `acceptedAnswerId` đã có, và **không
  có endpoint gỡ hay đổi**. Bản đầu chỉ ẩn nút trên đúng comment được chọn → các comment khác vẫn
  còn nút, bấm là 400. Đã sửa ở `CommentThread`: `acceptedAnswerId != null` thì **thu hồi handler
  khỏi toàn bộ thread**.
- **`PostEditorState`: bắt buộc mọi key ở tầng type, vì thiếu key là MẤT DỮ LIỆU** (P2.4′c-4).
  `updatePost` dùng `BeanUtils.copyProperties` copy cả null, mà `UpdatePostRequest` để mọi field
  optional nên caller quên `quizDetails` vẫn compile. **Đo thật, không phải lo xa**: lần sửa đầu
  với `current` thiếu field đã **xoá sạch `quiz_details` và reset `acceptedAnswerId`** của post 121. Sau khi siết type thành `{[K in keyof Required<UpdatePostRequest>]: UpdatePostRequest[K]}`
  (key bắt buộc, value vẫn cho `undefined`), preview **không compile được** cho tới khi liệt kê
  đủ 14 field — rồi sửa lại với state đầy đủ thì **quiz và acceptedAnswerId đều sống sót**.
  Hai field **không cứu được**: `images` và `taggedUserIds` có trong DTO update nhưng
  `FeedPostDataDto` không echo → mọi lần sửa đều null chúng. Hiện vô hại vì `PostComposer` chưa
  bao giờ ghi hai field này; sửa đúng là BE echo chúng ra payload feed.
- **Đáp án quiz lộ TRƯỚC khi nộp, không chỉ sau** (P2.4′c-4 — nặng hơn ghi chú cũ).
  `QuizQuestion.correctOptionIndex` nằm **trong chính payload feed**, nên đọc devtools là biết
  đáp án trước khi trả lời; `QuizResultResponseDto.correctAnswers` chỉ là lần lộ thứ hai. FE
  không bịt được cả hai. `QuizTaker` vì vậy không diễn trò giấu, và có ghi rõ "kết quả không
  được lưu" vì **không có endpoint đọc lại lần làm trước**.

- **Thread comment: 4 quyết định + 1 lỗi verify bắt được** (P2.4′c-3):
  - **"Trả lời" CHỈ có trên comment gốc.** BE chặn reply-của-reply, nên hoặc là không mời, hoặc
    là mời rồi âm thầm trỏ parent về gốc — cách sau đặt câu trả lời **không nằm dưới cái nó trả
    lời**, tệ hơn là không có nút. Đã đo trên UI: thread 1 gốc + 1 reply → **đúng 1 nút "Trả lời"**.
  - **Xoá xác nhận 2 bước tại chỗ, không dialog.** Lý do chính không phải thiếu component Dialog
    mà là **phạm vi phá huỷ lớn hơn dòng người dùng bấm**: cascade Postgres kéo theo reply. Nên
    câu xác nhận **nói thẳng số lượng** — đo được đúng chữ "Xoá bình luận này và 1 câu trả lời
    của nó." Bấm xác nhận → DB còn **0 dòng**, UI về empty state. Đây là bằng chứng trực tiếp cho
    quyết định "refetch chứ không splice": splice sẽ để reply nằm lại trên màn hình.
  - **Badge "đã sửa" suy từ `updatedAt !== createdAt`** (không có `isEdited`). Đo: comment mới →
    **không** có badge.
  - **`updatePost` với nội dung y hệt là no-op ở tầng DB.** Đã đo: `PUT` trả **200**, hook
    invalidate và `GET` thread chạy đúng, nhưng `updated_at` **không đổi** — Hibernate thấy entity
    không dirty nên bỏ luôn câu UPDATE. Hệ quả: sửa mà không đổi gì thì badge "đã sửa" vẫn không
    hiện. Đúng hành vi, không phải lỗi — ghi lại để lần sau không ai đi truy "sao badge không lên".
  - **LỖI tự tìm ra khi bấm thật: ô nhập KHÔNG tự xoá sau khi gửi thành công** → người dùng dễ
    đăng trùng. Cách sửa cũng đáng ghi: **không** xoá lúc submit (bài bị BE từ chối sẽ mất nháp —
    cùng luật với composer bài viết), mà để `CommentThread` đổi **`key`** của composer sau khi
    write **thành công**, React remount hộp rỗng. Bản sửa đầu dùng `useEffect` + `setValue` và bị
    `react-hooks/set-state-in-effect` chặn — rule đúng, `key` mới là cơ chế React sẵn có.

- **`CommentThread` không có prop `collapsed`.** Mount là fetch. Việc thread có mở hay không là
  state của **feed**, không phải của component này; 20 card cùng mount thread sẽ là 20 request lúc
  tải trang. Bên gọi chỉ render khi người dùng mở. (`useComments` vẫn nhận `undefined` nếu sau này
  có caller cần giữ instance mounted mà idle.)

- **Đổi tên `CommentThread` (type) → `CommentWithReplies`** (P2.4′c-3). Type gom nhóm ở tầng state
  trùng tên với component mới. Tên mới đúng nghĩa hơn: nó là **một gốc + reply của nó**, không
  phải cả thread. Cùng lý do, nhóm i18n mới đặt là `post.comments.*` chứ không phải `post.comment`
  — key `post.comment` (chuỗi "Bình luận") vẫn đang được **card legacy** dùng tới P2.4′d.

- **VERIFY BẰNG MẮT BẮT ĐƯỢC 2 LỖI THẬT mà SSR markup không thấy nổi** (P2.4′c-v). Đây chính là
  lý do nợ diện mạo không phải nợ vặt — cả hai đều nằm trong code đã "pass" 19/19 và 24/24 ở các
  checkpoint trước:
  1. **Ngày giờ format sai locale.** `toLocaleString()` không tham số dùng locale của **runtime**,
     không phải của app → UI tiếng Việt hiện `7/29/2026, 12:49:55 PM`. SSR grep không bắt được vì
     chuỗi vẫn "có mặt", chỉ sai ngôn ngữ.
  2. **Hydration mismatch ở `EventBody`** (console báo `Hydration failed`, React **vứt cả cây rồi
     render lại**). Cùng gốc: cùng một lời gọi chạy một lần ở Node, một lần ở browser, mà hai
     runtime không bắt buộc phải cùng locale mặc định.

  Sửa chung ở `features/posts/lib/format.ts`: lấy locale từ `useI18n()` rồi **truyền tường minh**
  vào `toLocaleString`/`toLocaleDateString`/`Intl.NumberFormat`, và **bỏ giây** (giây trên mốc thời
  gian bài viết là nhiễu, đồng thời là thứ làm mismatch to hơn mức cần). Áp cho cả 4 chỗ:
  `EventBody` · `PollBody` (ngày đóng) · `PostCard` (fallback quá 7 ngày) · `BookBody` (giá tiền —
  cùng loại lỗi qua `Intl.NumberFormat(undefined, …)`). Đã verify lại: hiện `12:56 29 thg 7, 2026`
  và console **sạch hydration**.
  Để ở `features/posts` vì hiện chỉ posts dùng; **chuyển lên `shared/` khi có domain thứ hai cần**,
  không phải trước đó.

- **LỖI BE: `coverImageUrl` của sách là presigned URL 24h nhưng bị LƯU VÀO DB** (phát hiện
  P2.4′c-1′b). `BookStorageService.uploadCover` trả `getPresignedUrl(...)` với
  `URL_EXPIRY_HOURS = 24`, và chuỗi đó được `buildAndSaveBook` **ghi thẳng vào `t_books`** rồi
  `FeedPostDataDto` echo lại mãi mãi → **mọi ảnh bìa sách chết sau 1 ngày**. Trớ trêu là javadoc
  của `FeedBookSummaryDto` giải thích rất kỹ vì sao **cố ý loại** `downloadUrl`/`previewUrl`
  (presign 24h < cache feed 7 ngày, lại phụ thuộc người xem đã mua chưa) — nhưng chính
  `coverImageUrl` mắc đúng lỗi ấy mà bị bỏ sót. FE không sửa được; `onError` chỉ hạ xuống một ô
  placeholder sạch thay vì glyph ảnh vỡ. Sửa đúng là **lưu object key, presign lúc đọc**, y như
  đường download đang làm.

- **3 khối body của c-1′b — hai lý do "không có nút" khác hẳn nhau** (P2.4′c-1′b):
  - **`PollBody`: lựa chọn TRƠ vì không có endpoint bỏ phiếu.** Không controller nào chạm
    `PollOption.votesCount`. Hàng bấm được sẽ **không làm gì cả** — đúng loại lỗi với nút "Bỏ
    qua" không handler (#9). Nên: hàng trơ + caption "chưa bình chọn được". `votesCount` **không
    render** (vĩnh viễn 0, thanh kết quả 0% ngụ ý có kiểm phiếu), `allowMultipleVotes` cũng không
    (mô tả luật của một cuộc bỏ phiếu không bỏ được — trở lại cùng lúc với UI vote).
  - **`EventBody`: không có nút RSVP vì LỊCH TRÌNH, không phải thiếu endpoint.**
    `EventController` **có thật** `POST /events/{postId}/rsvp`, attendees, count, ICS, Google
    Calendar — 8 endpoint, nhưng thuộc **chu kỳ 3**. Vào qua slot `actions` khi tới lúc.
    `maxAttendees` là **trần tổ chức viên đặt**, KHÔNG phải số người đã đăng ký (số đó ở
    `/attendees/count`, chu kỳ 3) → chữ ghi "tối đa N" để hai thứ không lẫn.
  - **`BookBody`: không có nút mua/đọc vì RANH GIỚI DOMAIN.** `preview`/`download` thuộc
    `BookController` (package **bookstore**, P2.10 chưa làm). `features/posts` gọi sang là phạm
    §4. Slot `actions` để bookstore đưa control vào sau mà file này không phải sửa.
  - `EventBody` và `LinkBody` dùng chung một guard: URL không parse được (kể cả
    `javascript:alert(1)`) **không bao giờ** thành `href`. Đã đo: chuỗi javascript: bị chặn sạch.
  - Rating chỉ hiện khi `reviewCount` > 0 — `avgRating` của sách chưa ai chấm là 0, mà "0.0 ★"
    đọc thành sách dở chứ không phải sách chưa có đánh giá.

- **4 khối body của c-1′a: quyết định "không dựng" quan trọng hơn thứ dựng ra** (P2.4′c-1′a):
  - **`CodeSnippetBody` không highlight cú pháp.** `CodeSnippetDetails.language` là String tự
    do, không enum — highlighter sẽ phải đoán grammar từ nhãn bất kỳ. Cộng thêm một dependency
    runtime và một bộ màu mà DS **không hề spec** (thang chữ có `--text-nx-code` + họ mono, không
    có token màu cho syntax). Mono trong khối sunken là cách render trung thực; mở lại khi DS có
    spec để bám.
  - **`ArticleBody.coverImage` và `LinkBody.thumbnailUrl` là URL người dùng TỰ DÁN**, không phải
    upload (không có endpoint upload ảnh dùng chung). Chúng trỏ ra host bên thứ ba, có thể 404
    hoặc chặn hotlink → cả hai dùng `onError` để **ẩn hẳn ảnh**, không để lại glyph ảnh vỡ giữa
    feed. Đây là lý do hai component này phải `'use client'` còn code/qna thì không.
  - **`LinkBody` chặn URL không parse được.** `hostOf` trả null thì render null. Nếu cứ đổ vào
    `<a href>` thì chuỗi rác sẽ **resolve tương đối theo origin của mình** — link nội bộ giả.
    Host luôn hiện (đã bỏ `www.`) vì đó là mảnh duy nhất của preview mà tác giả **không** khai
    man được: BE không unfurl, `title`/`description`/`thumbnail` là thứ người đăng gõ vào.
  - **`QnaBody` chỉ có một pill trạng thái.** `bountyPoints` cắt (ds-deviation #12 — BE thưởng
    một lượng **cố định** qua `ACCEPTED_ANSWER`, không trừ người hỏi, không nhân theo bounty).
    `acceptedAnswerId` cũng không render ở đây: nó trỏ tới một **comment**, mà card không fetch
    thread — đánh dấu đáp án là việc của c-4.
  - Cả 4 khối đều **render `null` khi rỗng**. BE không validate 4 loại này (`BeanUtils` copy
    thẳng), nên block rỗng tới được feed thật; để lại khung trống trông như lỗi render.

- **`PostCard` KHÔNG nhận DTO của feed — nhận props đã tách** (chốt P2.4′c-1, user chọn phương án
  này). `FeedPostDataDto` nằm ở package BE `com.socialapp.newsfeed`, nên type FE của nó thuộc
  `features/newsfeed` (§4). Cho card nuốt DTO đó sẽ thành **posts → newsfeed**, ngược chiều (chính
  newsfeed mới là bên render card + composer). Lợi ích thứ hai: `features/search` echo cùng hình
  dạng post dưới DTO khác, dùng lại được card này không tốn gì. Cái giá: P2.5 phải viết đoạn map
  payload → props; đó là chỗ đúng để nó nằm.
  Cùng lý do, card **không** nhận `postType`: nó render `body` được đưa vào chứ không tự switch
  theo loại. Nhận "để dành" là mời một câu switch quay lại vỏ card.

- **`shareCount` và `images` là dữ liệu chết ở phía đọc** (P2.4′c-1, đã vào `ds-deviations` #14/#15).
  Không controller nào tăng `shareCount` (không có endpoint share) → số vĩnh viễn 0, cắt.
  `CreatePostRequestDto` có `images` nhưng **`FeedPostDataDto` không echo lại** → bài đăng kèm ảnh
  thì phía đọc không có đường lấy. Không phải quyết định thẩm mỹ: dữ liệu không tới FE.

- **`likeCount` cố ý KHÔNG nằm ở footer card.** Nó thuộc về cạnh nút reaction mà c-2 sẽ đặt vào
  slot `actions`. Hiện hai chỗ trên cùng màn hình là mời chúng lệch nhau — nhất là khi optimistic
  của `myReaction` đổi tức thì còn tổng thì đợi refetch feed (xem mục reaction ở trên).

- **Cách tách UI chu kỳ 1 (công bố ở P2.4c-1, trần 5 component/checkpoint):**

  | ID     | surface                                                      | endpoint                                         |
  | ------ | ------------------------------------------------------------ | ------------------------------------------------ |
  | c-1 ✅ | shared `Textarea`+`Select`; `PostComposer` (REGULAR)         | createPost                                       |
  | c-2 ✅ | `LocationPicker` + `LocationBadge`                           | resolve                                          |
  | c-3 ✅ | ô nhập theo loại: CODE_SNIPPET, ARTICLE, QNA, POLL, LINK     | createPost (biến thể)                            |
  | c-4 ✅ | shared `Radio`; `BookPostFields` (multipart); `QuizComposer` | createBookPost                                   |
  | c-5    | phía người đọc: `QuizTaker`, sửa/xoá, chọn câu trả lời đúng  | submitQuiz, updatePost, deletePost, acceptAnswer |

  **c-5 phải đợi chu kỳ 2** (sẽ đánh số lại thành P2.4′c-N): cả 4 endpoint đó đều cần một
  post đã render để bám vào, mà **không có `GET /posts/{id}`** nên chỉ có thể lấy dữ liệu từ
  card trong feed — card thuộc chu kỳ 2. Đây là lý do UI không chia theo controller như data.

- **Nối `onPosted` khi domain `newsfeed` chưa tồn tại — chốt ở P2.4d.** Hook của posts không tự
  invalidate feed (quyết định cũ, vẫn giữ), nên bên compose phải làm. Bên compose _lẽ ra_ là
  `features/newsfeed` gọi `newsfeedKeys.feed()`, nhưng P2.5 chưa bắt đầu và query feed vẫn nằm ở
  `lib/hooks/use-posts.ts` dưới key phẳng `['newsfeed']`.
  Cách đã chọn: **export `NEWSFEED_QUERY_KEY` từ chính file legacy đó**, page `/newsfeed` import
  hằng số này rồi `invalidateQueries`. Không viết lại chuỗi `'newsfeed'` ở page — vì khi P2.5 xoá
  hook legacy, **import gãy tiếng to** thay vì để lại một magic string vẫn compile mà lặng lẽ
  không khớp key nào nữa. Đã cân nhắc đặt callback rỗng rồi chờ P2.5: như vậy bài vừa đăng không
  bao giờ làm feed refresh, tức mất đúng thứ checkpoint này phải chứng minh là chạy.
  **Chỗ sẽ đổi ở P2.5**: `app/(main)/newsfeed/page.tsx` — thay `NEWSFEED_QUERY_KEY` bằng
  `newsfeedKeys.feed()`, xoá import legacy, xoá đoạn comment giải thích seam.

- **Nhánh EVENT của composer legacy: rút thành `create-event-form.tsx`, KHÔNG xoá** (P2.4d).
  `PostComposer` làm 7/8 loại; `EVENT` thuộc chu kỳ 3. Xoá trọn `create-post-form.tsx` sẽ xoá
  luôn đường duy nhất tạo post EVENT trong app — một regression thật, không phải dọn dẹp. Nên
  nhánh EVENT thành card riêng dưới composer, **cố tình xấu** để nhắc làm nốt chu kỳ 3.
  Điểm đáng ghi: cầu tạm này dùng **hook + LocationPicker của `features/posts`**, không dùng bản
  legacy. Nhờ vậy `useCreatePost`/`useCreateBookPost`/`toCreatePostRequest` và
  `location-picker.tsx` legacy chết được ngay trong cùng checkpoint thay vì phải sống thêm một
  chu kỳ nữa chỉ để phục vụ EVENT. Các ô nhập (`EventDateTimeFields`, `EventLocationInput`,
  shadcn `Input`) **cố ý để nguyên legacy** — dựng lại bằng `shared/components` là việc của
  chu kỳ 3, làm ở đây là nhét trọn một checkpoint UI vào một checkpoint wiring.

- **Feed của BE có cache**: sau khi xoá sạch post test khỏi Postgres (còn đúng 2 bài seed),
  `GET /v1/api/feed` vẫn trả về các bài đã xoá (id 91/75/73…, "58 phút trước"). Phát hiện ở
  P2.4d khi đối chiếu SQL với UI. Hệ quả cho mọi lần verify sau: **UI không hiện bài mới ngay
  không đủ để kết luận "đăng hỏng"**, và ngược lại bài còn hiện không có nghĩa DB còn hàng.
  Kiểm bằng SQL, không kiểm bằng feed. (Bài mới thì vẫn lên đầu feed bình thường — đã đo.)

- **`BOOK` là loại DUY NHẤT của chu kỳ 1 mà BE validate thật** (đo ở P2.4c-4, ngược hẳn với ghi
  chú "5 loại của c-3 không validate gì" ở dưới). Đã đo bằng API thật, đủ 5 luật:

  | luật (Java)                                    | điều kiện                                                    | đo được                                                        |
  | ---------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
  | `PostService.validateBookDetails`              | `bookDetails` bắt buộc, `title` không blank                  | —                                                              |
  | `BookService.validateFile`                     | file bắt buộc, **đuôi** phải `.pdf`/`.epub` (không xét MIME) | `.txt` → 400 "Only PDF and EPUB formats are supported"         |
  | `BookService.buildAndSaveBook`                 | sách có giá (`price > 0`) bắt buộc `previewPages > 0`        | 400 "Paid books must have preview pages configured"            |
  | `BookService.generatePreview`                  | **`previewPages` < tổng trang (PDF) / chương (EPUB)**        | 400 "Preview pages/chapters (3) must be less than … total (3)" |
  | `spring.servlet.multipart` (`application.yml`) | file ≤ **20MB**, cả request ≤ 25MB                           | nằm ở config, container chặn trước khi vào handler             |

  Hai luật cuối **không có trong ghi chú vận hành trước đó**. Luật `previewPages < tổng` là luật
  duy nhất FE **cố ý không mirror** (xem mục PdfPreview ngay dưới); 4 luật còn lại đã thành rào
  chặn submit trong `PostComposer.isReady` + `book-post-fields.tsx`.
  Sách miễn phí: BE tự ép `previewPages = 0` và `price = 0`, nên form **ẩn hẳn** ô previewPages
  khi chưa nhập giá thay vì thu một giá trị sẽ bị vứt.

- **CẮT `pdf-preview.tsx` legacy, không port** (quyết ở P2.4c-4). Bản cũ dùng `react-pdf` render
  trang 1 và **đếm số trang ở client** để tác giả chọn `previewPages` nhỏ hơn tổng. Ba lý do cắt:
  (1) nó chỉ chạy cho **PDF**, nên nhánh 400 vẫn phải tồn tại và phải xử lý tử tế cho EPUB — tức
  bộ đếm chỉ là tối ưu, không phải rào chặn; (2) worker pdf.js của nó lấy từ **`unpkg.com` lúc
  chạy**, đặt một CDN bên thứ ba vào đường đi chính của một app vốn chỉ nói chuyện với BE của
  mình; (3) message lỗi của BE **nói thẳng tổng thật** ("must be less than the book's total (3)")
  nên sửa lại là một thao tác, không phải đoán. Đã verify nguyên văn message này hiện trên banner
  và **nháp không bị mất**. Mở lại nếu BE trả số trang trước khi upload.
  `react-pdf` vẫn còn trong `package.json` vì trình đọc sách legacy còn dùng — gỡ ở domain
  `bookstore`, không phải ở đây.

- **LỖI BE: file rác nằm lại MinIO khi tạo sách hỏng** (P2.4c-4). `buildAndSaveBook` upload file
  (và bìa) lên MinIO **trước** khi kiểm `previewPages`. `createBookPost` có `@Transactional` nên
  hàng `t_posts`/`t_books` được rollback đúng (đã verify: 3 lần gọi hỏng, **0 post mồ côi**),
  nhưng MinIO không nằm trong transaction → đo được **4 object trong MinIO / 2 sách trong DB**.
  Redis cũng không rollback: lần gọi hỏng vẫn ăn một suất rate-limit và vẫn ghi content-hash
  (cùng gốc với bẫy đã ghi ở dưới). FE không sửa được; sửa đúng là đảo thứ tự (validate hết rồi
  mới upload) hoặc dọn bù khi ném lỗi.

- **`quizDetails` là ĐÍNH KÈM, không phải loại post — đã dựng đúng như vậy** (P2.4c-4).
  `buildAndSavePost` gọi `validateQuizDetails` khi `request.getQuizDetails() != null`, **không
  phụ thuộc `postType`**; `updatePost` cũng vậy. Đã verify thật: quiz gắn vào bài `ARTICLE` → 200,
  cột `quiz_details` lưu đủ. Nên `QuizComposer` là nút bật/tắt cạnh picker địa điểm, không phải
  một ô trong bộ chuyển loại — dựng kiểu "chọn loại Quiz" sẽ khiến nó loại trừ lẫn nhau với
  article/poll mà BE chẳng có lý do gì bắt thế.
  `QuizQuestion` có thêm field `explanation` (BE **không** validate) → ô nhập không bắt buộc.
  Blank option bị lọc ở FE (`normalizeQuiz`) và `correctOptionIndex` được **trỏ lại** theo option
  còn sống: gửi thô sẽ hoặc rớt range check, hoặc tệ hơn là qua được nhưng đánh dấu **nhầm đáp
  án**.

- **KHÔNG đẻ primitive `FileInput`** (quyết ở P2.4c-4). DS `components/forms/` không có spec file
  input nào để mirror, và `Input` không host được `type="file"` — native render một nút do OS vẽ
  mà không token nào với tới. Nên input thật bị ẩn, một `Button` của shared/ bấm hộ, gói trong
  helper **cục bộ** `FileField` của `book-post-fields.tsx` (dùng 2 lần: file + bìa). Đó là ghép
  từ primitive sẵn có, không phải component ad-hoc thứ 4. Promote lên `shared/` khi có consumer
  thứ hai ngoài sách.

- **`Input`/`Select` không co được bằng `w-auto`** (phát hiện P2.4c-4 khi xem panel sách bằng mắt).
  Root của chúng là `flex w-full flex-col` còn `className` rơi vào **wrapper bên trong**, nên
  `className="w-auto"` không chạm tới thứ đặt bề rộng. Hệ quả: mọi field dùng mẹo đó đều tràn hết
  hàng. Đã sửa bằng cách cho **parent** chia cột (`grid sm:grid-cols-2`) ở `book-post-fields` và
  **cả `poll-fields` của c-3** (hàng "Cách trả lời" + "Đóng lúc" trước đó tràn 2 dòng). Đây là
  khuyết tật của API primitive, không phải của từng caller — nếu sau này cần field hẹp thật thì
  sửa ở `Input`/`Select` (cho `className` xuống root), đừng lặp lại mẹo `w-auto`.

- **Nợ verify bằng mắt của c-3 ĐÃ TRẢ** (P2.4c-4). c-3 chỉ verify được bằng SSR markup + SQL vì
  extension Chrome không kết nối. Lần này kết nối được: cả 5 panel (`CodeSnippetFields`
  `ArticleFields` `QnaFields` `PollFields` `LinkFields`) đã được mở lần lượt trong route preview
  và xem tận mắt cùng panel sách + quiz. Kết quả: bố cục panel và hàng pill chuyển loại đúng như
  thiết kế; khiếm khuyết duy nhất tìm được là `w-auto` ở `PollFields`, đã sửa ở trên.

- **Legacy chỉ làm 3/8 loại post** (REGULAR, EVENT, BOOK) và **không có** images lẫn
  tagging dù API hỗ trợ. Nên c-3 là **dựng mới**, không phải migrate — đừng tìm bản cũ để
  đối chiếu. Legacy cũng không gửi `postType` (API cho qua), bản mới gửi tường minh.

- **`Textarea` không có spec trong DS**: `components/forms/` chỉ có Input/Select/Checkbox/
  Radio/Switch. Đã dựng mirror y hệt anatomy của Input và **flag lại cho chủ DS** — field
  nhiều dòng nên được spec ở thượng nguồn, không để mỗi app tự bịa.

- **`Input` từng lệch specimen** (phát hiện khi dựng Select ở P2.4c-1): dùng
  `border-strong`, padding 12px, label `text-secondary`; specimen `forms.card` render
  `border-default`, 10px, label `text-primary` — tức field đọc **nhạt hơn** nút (nút mới
  dùng `border-strong`). Đã sửa `Input` và làm Select/Textarea theo specimen. Verify lại
  form login: border `rgb(222,225,229)`, pad `0 10px`, label `#101820`.

- **ĐÍNH CHÍNH ghi chú dưới đây: rule engine CÓ chặn đồng bộ, chỉ là không chặn _nội dung_**
  (đo ở P2.4c-3). `ModerationRuleEngine.evaluate` chạy 3 rule theo `@Order` và **short-circuit ở
  rule đầu tiên vi phạm**, ném `ContentViolationException` → **400 tại chỗ**:
  `RateLimitRule`(1) = **5 bài/phút/tác giả**, `DuplicateContentRule`(2) = **cùng nội dung trong
  60s**, `KeywordBlacklistRule`(3). Đo được cả hai: bài thứ 6 trong một phút → 400, gửi lại y
  nguyên một nội dung → `400 Content violates community guidelines: [DUPLICATE_CONTENT]`.
  → Banner lỗi của composer **không phải nhánh chết**, và nội dung nháp phải được giữ lại (đã làm
  từ c-1).
  **Bẫy: bài bị từ chối vẫn ghi content-hash.** `SpamDetector.isDuplicateContent` gọi
  `setIfAbsent` **trong lúc đánh giá**, nên một bài bị rule khác (vd rate limit) đánh rớt vẫn để
  lại dấu vết 60s. Người dùng bấm "đăng lại" y nguyên trong vòng một phút sẽ bị báo **trùng nội
  dung** dù chưa có gì được lưu. Đây là lỗi BE, FE không sửa được — chỉ đừng khuyên người dùng
  "thử lại ngay" trong thông báo lỗi.

- **Rule engine KHÔNG chặn nội dung spam/xúc phạm lúc tạo** (đo ở P2.4c-1): post đúng nội
  dung của 2 bài seed bị kiểm duyệt (`buy now buy now`, câu xúc phạm) vẫn trả **200** rồi
  vào `PENDING_MODERATION` — phần đánh giá thật chạy async qua Gemini. Nên **không có đường
  nào để UI hiện lỗi vi phạm ngay lúc submit**; thông báo "có thể phải qua kiểm duyệt" là
  cách nói đúng duy nhất.

- **`posts` là domain WRITE-ONLY — không có `GET /posts` lẫn `GET /posts/{id}`** (phát hiện
  2026-07-25, P2.4a). Toàn bộ 14 endpoint dưới `/v1/api/posts` chỉ có 1 cái GET duy nhất là
  `GET /posts/{postId}/comments`. Bài viết được đọc qua **newsfeed** và **search**, hai nơi
  nhúng sẵn payload post.
  Hệ quả phải thiết kế theo, không phải né: **không deep-link được `/posts/{id}`**, không
  có trang chi tiết bài viết, và sau khi tạo/sửa thì phải **refetch feed** chứ không có
  đường lấy lại đúng bài vừa đụng. Cùng loại giới hạn với "không có endpoint profile công
  khai".

- **Cả 5 endpoint của `PostController` trả `void`** (`@PostMapping public void createPost`…).
  Không có id trả về, không có bản ghi sau khi sửa → **không patch cache lạc quan từ
  response được**. Lớp state (P2.4b) phải invalidate feed, và UI phải chấp nhận độ trễ đó.
  Lúc smoke test phải truy id bài vừa tạo bằng SQL vì API không nói.

- **Bài mới rơi vào `PENDING_MODERATION`** (moderation đang bật ở local). Bài vừa tạo
  **không xuất hiện ngay** trong feed. Đây là hành vi đúng của BE, nhưng UI tạo bài
  (P2.4c/d) phải nói rõ điều đó thay vì để người dùng tưởng đăng hỏng.

- **Không có post type `QUIZ`.** Enum chỉ có REGULAR/EVENT/BOOK/CODE_SNIPPET/ARTICLE/QNA/
  POLL/LINK — `quizDetails` là **phần đính kèm gắn được vào bất kỳ loại nào**, không phải
  một loại riêng. Đừng dựng UI theo kiểu "chọn loại Quiz".

- **Nộp quiz là lộ đáp án.** `QuizResultResponseDto.correctAnswers` trả về chỉ số đáp án
  đúng của từng câu. Đó là thiết kế của BE, UI **không giấu được** (giấu ở client là giả
  vờ). Thêm nữa **không có endpoint đọc lại lần làm trước** — kết quả chỉ tồn tại trong
  response đó, reload là mất.

- **`acceptAnswer` lệch nhà**: nằm ở `PostController` (nên API của nó thuộc chu kỳ 1) nhưng
  surface UI duy nhất là luồng bình luận Q&A — **chu kỳ 2**. Ghi ở đây để không ai tưởng
  chu kỳ 1 bỏ sót UI.

- **Invalidate xuyên domain: posts KHÔNG tự làm, bên compose truyền vào** (chốt 2026-07-25,
  P2.4b). Mặt đọc của một bài viết nằm ở `newsfeed` và `search` — domain khác, key khác.
  Nếu hook của posts tự `invalidateQueries(newsfeedKeys.feed())` thì posts phải biết cách bố
  trí cache của newsfeed, tức hỏng extraction test (§4) và tạo phụ thuộc ngược.
  Cách làm: mọi mutation nhận `UseMutationOptions` chuẩn của React Query, bên gọi tự thêm:

  ```ts
  const create = useCreatePost({
    onSuccess: () => qc.invalidateQueries({ queryKey: newsfeedKeys.feed() }),
  });
  ```

  Chiều phụ thuộc thành **newsfeed → posts** (newsfeed vốn đã render composer), không phải
  ngược lại. Ngoại lệ duy nhất: `useAcceptAnswer` invalidate `postKeys.comments(postId)` —
  đó là read **trong cùng domain**, key đã đặt sẵn dù query của nó tới chu kỳ 2 mới có.

- **`useResolveLocation` là query, không phải mutation** dù endpoint là POST. Resolve là
  read thuần (không side effect), và Gemini chậm nên cache đáng giá: `staleTime` 10 phút,
  `retry:false` (lỗi ở đây là 400 do thiếu tham số hoặc Gemini hỏng — thử lại chỉ nhân đôi
  thời gian chờ). Debounce thuộc về component, không nhét vào hook.

- **Drift P0.3 về `googleMapsUrl` đã đóng**: FE cũ khai thiếu field này; type mới derive từ
  `schema.gen.ts` nên có đủ, và đã xác nhận **nullable** (`GoogleMapsUrlBuilder.build` trả
  null khi thiếu toạ độ — xảy ra ở nhánh tìm theo tên).

- **Resolve location chạy qua Gemini**, không phải geocoder thường: chậm (đo được ~5–9s).
  **ĐÍNH CHÍNH ghi chú P2.4a** ("mảng rỗng là kết quả hợp lệ"): đo thật ở P2.4c-2 —
  query không đặt được trả **400** kèm `"Could not resolve location: <query>"`
  (`LocationResolutionService` ném `ValidationException`), **không** phải 200 với `[]`.
  Mảng rỗng vẫn xảy ra được (mọi candidate parse lỗi bị `filter(Objects::nonNull)` loại),
  nên UI giữ cả hai nhánh, nhưng ca "không có địa điểm này" thường là **lỗi**, không phải
  kết quả rỗng. `retry: false` ở hook nhờ vậy càng đúng: 400 thử lại không hết.

- **Legacy đính địa điểm nhưng BE ném đi hết — bug legacy, đã sửa ở P2.4c-2.**
  `create-post-form` cũ gửi `{content, location, visibility}` với `location` là object dẹt
  (`displayName`/`latitude`/`city`…). `CreatePostRequestDto` **không có field `location`** —
  nó cần `googlePlaceId` + `locationType` + `locationDetails`. Nghĩa là **mọi địa điểm người
  dùng chọn ở bản cũ đều bị bỏ im lặng**, không có lỗi nào báo. Bản mới spread thẳng candidate
  từ response (response được thiết kế mirror đúng shape request), verify bằng SQL: post lưu
  đủ `google_place_id`, `location_type=PLACE`, `location_details` JSON.

- **`location-badge.tsx` legacy là code chết** (0 consumer) và tự **dựng lại URL Google Maps
  ở client** từ locationType + city/country + placeId. BE đã trả `googleMapsUrl`
  (`GoogleMapsUrlBuilder`) nên logic đó bị **xoá, không port** — hai bản dựng cùng một URL
  scheme thì sẽ lệch.

- **`POLL` không có endpoint bỏ phiếu** (P2.4c-3). `PollDetails` được create/update ghi vào,
  được `FeedPostDataDto` + search `PostDto` echo ra, và **không controller nào sửa
  `PollOption.votesCount`** (`PostReactionController` là reaction, không phải vote). Poll tạo ở
  composer vì `pollDetails` là phần thật của `createPost` (độ phủ tính theo endpoint), nhưng
  **card phía đọc ở chu kỳ 2 không được render lựa chọn bấm-được** — bấm sẽ không có gì xảy ra.
  FE gửi `id` 1..n + `votesCount: 0` vì BE không tự điền, mà list không có id thì phía đọc không
  có key ổn định để về sau bỏ phiếu; 0 phiếu cho poll mới là sự thật, không phải số bịa.

- **Không có endpoint upload ảnh dùng chung** (P2.4c-3). Grep `@RequestPart MultipartFile` toàn bộ
  controller ra đúng 3 chỗ: file+bìa sách (`POST /posts/books`), avatar lúc đăng ký, và
  `PUT /profile/picture`. Nên `ArticleDetails.coverImage`, `LinkDetails.thumbnailUrl` và cả
  `CreatePostRequestDto.images` **chỉ có thể là URL người dùng tự dán**. Đổi thành file picker khi
  BE có endpoint upload.

- **`LINK` không có unfurl.** Không có gì fetch trang đích để tự điền title/description/thumbnail;
  `LinkDetails` lưu đúng những gì gửi lên. Composer vì vậy để tác giả tự nhập, **không** hiện
  spinner "đang lấy bản xem trước" — đó sẽ là diễn kịch.

- **`updatePost` GHI TRẮNG field không gửi** (P2.4c-3, ảnh hưởng c-5/chu kỳ 2).
  `PostService.updatePost` dùng `BeanUtils.copyProperties(request, post)` — copy **cả null**. Sửa
  bài mà chỉ gửi `content` sẽ xoá sạch location, images, tags và mọi block details. UI sửa bài phải
  gửi lại **toàn bộ** trạng thái hiện có của bài, mà nguồn duy nhất lấy được là payload card trong
  feed (không có `GET /posts/{id}`). Ghi trước để c-5 không thiết kế kiểu PATCH từng phần.

- **`acceptAnswer` chết nếu `qnaDetails` là null** (P2.4c-3). Hàm mở đầu bằng
  `if (post.getPostType() != PostType.QNA || post.getQnaDetails() == null) throw`. Bài QNA tạo mà
  không kèm object `qnaDetails` thì **không bao giờ** chọn được câu trả lời, và đường sửa duy nhất
  là `updatePost` — vốn ghi trắng mọi field khác (xem trên). Nên `PostComposer` luôn gửi
  `qnaDetails: {isResolved: false}` cho bài QNA. Đó không phải trang trí.

- **5 loại của c-3 KHÔNG có validate ở BE** (nhưng `BOOK` thì CÓ — xem mục đầu phần posts). `buildAndSavePost` chỉ validate `EVENT`
  (`validateEventDetails`) và quiz kèm theo (`validateQuizDetails`); `CODE_SNIPPET` `ARTICLE`
  `QNA` `POLL` `LINK` được `BeanUtils` copy thẳng, rỗng cũng nhận. Các điều kiện chặn submit trong
  `PostComposer.isReady` là **rào của FE để tránh bài rác**, không phải bản sao luật server —
  đừng mô tả với ai là luật server.

- **`BeanUtils.copyProperties` không lọc details theo `postType`**: gửi `pollDetails` kèm một bài
  `ARTICLE` thì nó vẫn được lưu. Vì vậy composer giữ **một state cho mỗi loại** nhưng chỉ ghép
  **đúng một key** vào payload theo `postType` đang chọn. Verify bằng SQL ở c-3: mỗi bài chỉ có
  đúng một cột `*_details` khác null.

- **`CodeSnippetDetails.language` là `String` tự do**, không có enum ở BE. Danh sách ngôn ngữ trong
  `code-snippet-fields.tsx` chỉ là tiện lợi phía FE (giá trị slug để highlighter về sau nhận
  được), không phải ràng buộc contract.

- **DS không có spec popover/floating panel** (chỉ Dialog/Menu/Tooltip/Toast). Picker vì vậy
  là **panel inline mở tại chỗ**, không phải popover: không cần anchor, không portal, không
  bị clip. Bản legacy dùng `@base-ui` popover và đã phải tự sửa bug anchor (trigger
  `display: contents` đo ra rect 0×0 ở gốc trang) — không tái tạo lại chuyện đó.
