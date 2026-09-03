import type { Messages } from './en';

export const vi: Messages = {
  app: {
    name: 'Elite Nexus',
  },

  /* Các lớp chặn lỗi theo route: `app/error.tsx`, `app/(main)/error.tsx`, `app/not-found.tsx`.
     `global-error.tsx` KHÔNG nằm ở đây và không thể nằm ở đây — nó dựng khi provider đã mất, nên
     chữ của nó viết thẳng trong file đó. */
  error: {
    title: 'Màn hình này gặp lỗi',
    description: 'Trang không dựng xong được. Thử lại thường là đủ — dữ liệu của bạn vẫn an toàn.',
    retry: 'Thử lại',
    goHome: 'Về bảng tin',
    /* Chỉ hiện khi React có gửi mã, tức là trên bản build. Đây là đầu mối duy nhất nối màn hình
       này với một dòng trong log máy chủ. */
    digest: 'Mã lỗi: ${digest}',
  },

  /* Bảng F4 của atlas — mã HTTP → người đọc thấy gì — viết thành chữ. `ApiErrorNotice` hiển thị,
     `shared/lib/resolve-api-error.ts` quyết định lỗi nào rơi vào đâu. Đặt cạnh `error` vì cả hai
     đều là ngôn ngữ của khung ứng dụng cho "chỗ này hỏng", không thuộc miền nào.

     CHỮ KHÔNG BAO GIỜ ĐỔ LỖI cho người đọc và không lộ cơ chế. "Không tải được" kèm nút thử lại,
     không phải "GET trả về 500". Chỉ `generic` và `invalid` mới hiện câu của máy chủ, vì đó là chỗ
     máy chủ viết ra thứ người dùng làm được gì đó với nó. */
  apiError: {
    retry: 'Thử lại',
    network: {
      title: 'Máy chủ không phản hồi',
      description: 'Kiểm tra kết nối rồi thử lại.',
    },
    auth: {
      title: 'Đăng nhập để xem mục này',
      description: 'Phần này cần một tài khoản.',
    },
    banned: {
      title: 'Tài khoản của bạn đang bị khoá',
    },
    forbidden: {
      title: 'Mục này không mở cho bạn',
      description: 'Tài khoản của bạn không có quyền truy cập.',
    },
    notFound: {
      title: 'Không tìm thấy',
      description: 'Mục này không tồn tại, hoặc đã bị gỡ.',
    },
    conflict: {
      title: 'Mục này vừa thay đổi',
      description: 'Có người vừa cập nhật. Tải lại để xem bản mới nhất.',
    },
    invalid: {
      title: 'Một vài chỗ cần sửa lại',
    },
    profileRequired: {
      title: 'Thiết lập hồ sơ chuyên môn trước đã',
      description: 'Tính năng AI và gợi ý dựa trên hồ sơ này. Chỉ mất một phút.',
      cta: 'Thiết lập',
    },
    rateLimited: {
      title: 'Thử lại sau ít phút',
      description: 'Bạn thao tác hơi nhanh. Đợi một lát rồi thử lại.',
    },
    unavailable: {
      title: 'Tạm thời gián đoạn',
      description: 'Một dịch vụ bên ngoài đang lỗi. Thử lại sau giây lát.',
    },
    generic: {
      title: 'Đã có lỗi xảy ra',
    },
  },

  /* MediaUploader dùng chung (`features/media`). Một picker đứng sau lưới ảnh của composer, ảnh bìa
     hồ sơ, ô minh chứng kỹ năng và banner dự án — nên chữ để ở đây, không nhét vào miền nào. Mỗi
     câu đều là quy tắc máy chủ cũng kiểm — mục đích là báo lỗi bằng một câu thay vì một round trip. */
  mediaUploader: {
    add: 'Thêm ảnh',
    replace: 'Đổi ảnh',
    remove: 'Gỡ',
    uploadFromDevice: 'Tải lên từ máy',
    failed: 'Tải lên không thành công. Thử lại.',
    wrongType: 'Định dạng file này không được hỗ trợ.',
    fileTooLarge: 'File này vượt quá 20MB.',
    batchTooLarge: 'Các file vượt quá 25MB cho một lần tải lên.',
    tooMany: 'Tối đa ${count} ảnh.',
    cropTitle: 'Căn khung ảnh',
    cropCancel: 'Huỷ',
    cropConfirm: 'Dùng ảnh này',
  },

  /* `/settings/*` — trung tâm cấu hình. Sáu panel trước đây rải rác ở `/profile` và `/knowledge`;
     hub là chỗ để "cấu hình một thứ", nên chữ để ở đây chứ không nhét vào miền nào. */
  settings: {
    title: 'Cài đặt',
    tabs: {
      notifications: 'Thông báo',
      github: 'GitHub',
      tokens: 'Access token',
      vault: 'Vault',
      calendar: 'Lịch',
      picture: 'Ảnh',
    },
    notifications: {
      title: 'Thông báo',
      desc: 'Sự kiện nào đến với bạn, và bằng cách nào.',
    },
    github: {
      title: 'GitHub',
      desc: 'Liên kết tài khoản để đóng góp của bạn hiện trên trang cá nhân.',
    },
    tokens: {
      title: 'Access token',
      desc: 'Dành cho client Obsidian vault. Token chỉ hiện một lần — sao chép ngay lúc đó.',
    },
    vault: {
      title: 'Ghi chú đã đồng bộ',
      desc: 'Những gì client vault đã đẩy lên, và phần nào trong đó AI được đọc.',
    },
    exportTemplate: {
      title: 'Mẫu xuất',
      desc: 'Định dạng file mà nút tải bản giải thích tạo ra.',
    },
    calendar: {
      title: 'Google Calendar',
      desc: 'Kết nối một lần để "Thêm vào lịch" chạy được trên mọi sự kiện.',
      connected: 'Đã kết nối',
      notConnected: 'Chưa kết nối',
      connectHint: 'Bạn sẽ được chuyển sang Google để cấp quyền, rồi quay lại đây.',
      reconnectHint:
        'Token có thể ngừng hoạt động mà mục này không đổi. Kết nối lại nếu thêm sự kiện bị lỗi.',
      connect: 'Kết nối Google Calendar',
      reconnect: 'Kết nối lại',
    },
    picture: {
      avatarTitle: 'Ảnh đại diện',
      avatarDesc: 'JPEG, PNG hoặc WEBP, tối đa 5MB.',
      avatarChange: 'Đổi ảnh đại diện',
      coverTitle: 'Ảnh bìa',
      coverDesc: 'Dải nền sau tên bạn trên trang cá nhân.',
    },
  },

  /* Tiêu đề tab trình duyệt, cho những route mà chữ trên trang không dùng làm tiêu đề được.
     Chỉ `core/i18n/server.ts` đọc, không component nào đọc — xem ghi chú ở đó về lý do đây là
     danh từ chứ không phải tiêu đề trang. */
  meta: {
    login: 'Đăng nhập',
    register: 'Đăng ký',
    forgotPassword: 'Đặt lại mật khẩu',
    resetPassword: 'Mật khẩu mới',
    magicLink: 'Magic link',
    verifyEmail: 'Xác minh email',
    /* Cố ý là LOẠI, không phải tên món. Muốn in tên bài hay tên sách thì phải gọi API lúc server
       render, trên route mà dữ liệu do client tải bằng phiên của chính người đọc. */
    post: 'Bài viết',
    book: 'Sách',
    project: 'Dự án',
    developer: 'Hồ sơ lập trình viên',
    payment: 'Kết quả thanh toán',
    paymentPending: 'Đang chờ thanh toán',
  },

  notFound: {
    title: 'Trang này không tồn tại',
    description: 'Có thể liên kết đã cũ, hoặc mục nó trỏ tới đã bị gỡ.',
    goHome: 'Về bảng tin',
  },

  payment: {
    invalidTitle: 'Liên kết thanh toán không hợp lệ',
    invalidDesc: 'Liên kết này thiếu thông tin đơn hàng.',
    checkingTitle: 'Đang xác nhận thanh toán...',
    checkingDesc: 'Vui lòng đợi trong khi chúng tôi xác minh giao dịch với MoMo.',
    failedTitle: 'Thanh toán thất bại',
    failedDesc: 'Không thể hoàn tất thanh toán của bạn. Vui lòng thử lại.',
    pendingTitle: 'Chưa xác nhận được thanh toán',
    pendingDesc:
      'MoMo chưa báo về kết quả. Nếu tiền đã bị trừ, quyền truy cập sẽ được mở trong ít phút — tải lại trang này để kiểm tra.',
    successTitle: 'Thanh toán thành công',
    successDesc: 'Cảm ơn bạn! Bạn đã có toàn quyền truy cập cuốn sách này.',
    /* Chỗ nút này dẫn tới mới là điều đáng nói: trang sách là nơi có nút Tải xuống. Trước đây
       màn thành công chỉ có đường về bảng tin — vừa trả tiền xong thì bị đưa đi chỗ khác. */
    backToBook: 'Mở sách vừa mua',
    backToNewsfeed: 'Về trang bảng tin',
    /* Màn app tự chờ trong lúc người mua trả tiền — khác hẳn màn MoMo chuyển về: chưa có đồng nào
       rời đi, và mã QR thì quét bằng điện thoại. Câu chữ phải nói rõ trang này tự cập nhật, nếu
       không người đọc đóng tab và mất luôn mã đơn. */
    awaitTitle: 'Đang chờ thanh toán',
    awaitDesc:
      'Hoàn tất thanh toán ở tab MoMo, hoặc quét mã QR bằng ứng dụng MoMo. Trang này tự cập nhật ngay khi MoMo báo về — bạn không cần làm gì thêm ở đây.',
    awaitTimeoutTitle: 'Chưa thấy thanh toán nào',
    awaitTimeoutDesc:
      'Sau vài phút chúng tôi tạm ngừng hỏi. Nếu bạn đã trả tiền, hãy bấm kiểm tra lại — quyền truy cập mở ngay khi MoMo báo đơn về.',
    expiresIn: 'Đơn hàng hết hạn sau ${time}',
    openMomo: 'Mở trang thanh toán MoMo',
    checkAgain: 'Kiểm tra lại',
    // Hiện ở build không phải production, hoặc khi bật `NEXT_PUBLIC_ENABLE_DEV_PAYMENT_BYPASS`
    // (B27) — nút gọi thẳng `dev-settle`, đường tắt cho buổi demo khi MoMo lỗi hoặc không có điện
    // thoại quét mã QR trong tay.
    devSettle: 'Đánh dấu đã thanh toán (demo)',
  },

  admin: {
    title: 'Quản trị kiểm duyệt',
    moderation: {
      title: 'Kiểm duyệt',
    },
  },

  nav: {
    roadmap: 'Lộ trình',
    library: 'Thư viện',
    knowledge: 'Kho lưu trữ',
    newsfeed: 'Bảng tin',
    notifications: 'Thông báo',
    friends: 'Bạn bè',
    friendsAll: 'Tất cả bạn bè',
    friendsSuggestions: 'Gợi ý',
    friendsRequests: 'Lời mời kết bạn',
    chats: 'Chats',
    projects: 'Dự án',
    profile: 'Trang cá nhân',
    logout: 'Đăng xuất',
    primary: 'Điều hướng chính',
    // R15 rail: hai nhóm — người khác, rồi bạn. `groupStream`/`groupNetwork` là nhãn của ba
    // nhóm cũ, không còn ai gọi; xoá khi R4 dọn xong. `trending` thì đã xoá ở đây: `/trending`
    // thành tab `Công nghệ`, và bảng lệnh gọi thẳng `newsfeed.tabs.tech`.
    groupCommunity: 'Cộng đồng',
    groupStream: 'Dòng chảy',
    groupGrowth: 'Phát triển',
    groupNetwork: 'Mạng lưới',
    openMenu: 'Mở điều hướng',
  },

  palette: {
    label: 'Bảng lệnh',
    placeholder: 'Nhảy tới một trang, hoặc tìm mọi thứ…',
    goTo: 'Đi tới',
    searchEverywhere: 'Tìm mọi nơi với từ bạn vừa gõ',
    empty: 'Không có gì khớp',
    shortcutHint: 'Ctrl K',
  },

  /* Người đọc chưa đăng nhập. Đặt cạnh `nav` và `palette` vì đây là chrome chứ không thuộc domain
     nào: các chuỗi này xuất hiện ở thanh trên, rail, ledger và một hộp thoại có thể bật lên từ bất
     kỳ màn hình nào trong `(main)`.
     Giọng văn không xin lỗi thay cho bức tường: "Đăng nhập để thả cảm xúc" nói cho người ta biết
     phải làm gì, còn "bạn không có quyền" nói rằng họ đã làm sai. Khách chưa làm gì sai cả — họ
     vừa ghé vào, và đó chính là điều bề mặt này được mở ra để đón. */
  guest: {
    signIn: 'Đăng nhập',
    register: 'Đăng ký',
    locked: 'Cần đăng nhập',
    prompt: {
      title: 'Đăng nhập để tham gia',
      description:
        'Bạn đang xem với tư cách khách. Đọc thì ai cũng được; thả cảm xúc, bình luận và kết nối thì cần một tài khoản.',
      dismiss: 'Đọc tiếp',
    },
    ledger: {
      overline: 'Tham gia Elite Nexus',
      body: 'Dựng một hồ sơ chứng minh được năng lực: kỹ năng đã xác minh, điểm uy tín, và những bài viết đứng sau cả hai.',
    },
    profile: {
      join: 'Tham gia để kết nối',
    },
  },

  auth: {
    email: 'Email',
    emailPlaceholder: 'ten@example.com',
    password: 'Mật khẩu',
    passwordShow: 'Hiện mật khẩu',
    passwordHide: 'Ẩn mật khẩu',
    fullname: 'Họ và tên',
    fullNamePlaceholder: 'Nguyễn Văn A',
    // The label on the auth screens' way out — see `(auth)/home-link.tsx`. Names the
    // destination, not the gesture: the arrow beside it is what says "back".
    backHome: 'Trang chủ',
    brand: {
      tagline: 'Nơi năng lực được chứng minh, không phải được kể lại',
      subtagline:
        'Hồ sơ dựng từ kỹ năng đã qua xác minh, sách bạn viết và dự án bạn góp mặt — không phải từ dòng tự mô tả.',
      command: 'nexus init',
      pointProfile: 'Hồ sơ năng lực có xác minh',
      pointRoadmap: 'Lộ trình kỹ năng theo từng bước',
      pointLibrary: 'Kho sách do cộng đồng xuất bản',
      pointProjects: 'Dự án đang tìm người cùng làm',
      pointChat: 'Trao đổi trực tiếp trong ứng dụng',
      footer: 'Elite Nexus — mạng lưới của người làm nghề.',
    },
    login: {
      title: 'Chào mừng trở lại',
      subtitle: 'Đăng nhập vào tài khoản Elite Nexus của bạn',
      forgotPassword: 'Quên mật khẩu?',
      passwordPlaceholder: 'Nhập mật khẩu của bạn',
      submit: 'Đăng nhập',
      submitting: 'Đang đăng nhập...',
      magicLink: 'Đăng nhập không mật khẩu với email',
      noAccount: 'Chưa có tài khoản?',
      signUp: 'Đăng ký',
      banned: {
        title: 'Tài khoản này bị khoá đến ${until}.',
        titleNoTime: 'Tài khoản này đang bị khoá.',
        remaining: 'Còn ${remaining}',
        violationType: 'Ghi nhận là',
        reason: 'Lý do',
        appealHint:
          'Khi hết khoá, bạn có thể đăng nhập và khiếu nại từ trang kiểm duyệt. Khiếu nại gửi trong lúc bị khoá vẫn được nhận, nhưng chưa có màn hình cho người chưa đăng nhập.',
        retry: 'Thử đăng nhập lại',
      },
      unverifiedHint: 'Email của bạn chưa được xác thực.',
      useMagicLink: 'Xác thực và đăng nhập bằng Magic Link',
      magicSending: 'Đang gửi…',
      magicSent: 'Nếu địa chỉ đó có tài khoản, một magic link đang được gửi đi.',
    },
    register: {
      title: 'Tạo tài khoản',
      subtitle: 'Tham gia Elite Nexus và bắt đầu kết nối với mọi người',
      profilePicture: 'Ảnh đại diện',
      optional: '(tùy chọn)',
      changePhoto: 'Đổi ảnh',
      uploadPhoto: 'Tải ảnh lên',
      photoFormats: 'JPG, PNG hoặc WebP. Tối đa 5MB.',
      photoTooLarge: 'Ảnh quá lớn. Tối đa 5MB.',
      passwordPlaceholder: 'Ít nhất 6 ký tự',
      submit: 'Tạo tài khoản',
      submitting: 'Đang tạo...',
      checkEmailTitle: 'Xác minh email của bạn',
      checkEmailDesc:
        'Chúng tôi đã gửi link xác minh tới ${email}. Mở link để kích hoạt tài khoản.',
      backToLogin: 'Quay lại đăng nhập',
      alreadyHaveAccount: 'Đã có tài khoản?',
      signIn: 'Đăng nhập',
    },
    oauth: {
      divider: 'hoặc',
      google: 'Tiếp tục với Google',
      github: 'Tiếp tục với GitHub',
      exchanging: 'Đang đăng nhập cho bạn…',
      failedTitle: 'Đăng nhập thất bại',
      failed: 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.',
      denied: 'Truy cập bị từ chối. Bạn có thể thử cách khác.',
      missingCode: 'Link đăng nhập thiếu mã xác thực.',
      backToLogin: 'Quay lại đăng nhập',
    },
    forgotPassword: {
      title: 'Quên mật khẩu?',
      subtitle: 'Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu',
      submit: 'Gửi link đặt lại',
      submitting: 'Đang gửi...',
      successTitle: 'Kiểm tra email của bạn',
      successDesc:
        'Chúng tôi đã gửi link đặt lại mật khẩu đến địa chỉ email của bạn. Vui lòng kiểm tra hộp thư.',
      backToLogin: 'Quay lại đăng nhập',
    },
    magicLink: {
      title: 'Đăng nhập không mật khẩu',
      subtitle: 'Chúng tôi sẽ gửi cho bạn một link để đăng nhập không cần mật khẩu',
      submit: 'Gửi magic link',
      submitting: 'Đang gửi...',
      successTitle: 'Kiểm tra email của bạn',
      successDesc:
        'Nếu email này có tài khoản, chúng tôi đã gửi link đăng nhập. Vui lòng kiểm tra hộp thư.',
      backToLogin: 'Quay lại đăng nhập',
    },
    verifyEmail: {
      verifying: 'Đang xác minh email của bạn…',
      verifiedTitle: 'Đã xác minh email',
      verifiedDesc: 'Email của bạn đã được xác minh. Bạn có thể đăng nhập ngay.',
      failedTitle: 'Xác minh thất bại',
      failedDesc: 'Link xác minh này không hợp lệ hoặc đã hết hạn.',
      invalidTitle: 'Link không hợp lệ',
      invalidDesc: 'Link xác minh thiếu mã. Vui lòng dùng link trong email của bạn.',
      continue: 'Tiếp tục đăng nhập',
      backToLogin: 'Quay lại đăng nhập',
    },
    magicLogin: {
      signingIn: 'Đang đăng nhập cho bạn…',
      invalidTitle: 'Link không hợp lệ',
      invalidDesc: 'Magic link này không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.',
      requestNewLink: 'Yêu cầu link mới',
    },
    resetPassword: {
      title: 'Đặt lại mật khẩu',
      subtitle: 'Nhập mật khẩu mới cho tài khoản của bạn',
      newPassword: 'Mật khẩu mới',
      newPasswordPlaceholder: 'Ít nhất 6 ký tự',
      confirmPassword: 'Xác nhận mật khẩu',
      confirmPasswordPlaceholder: 'Nhập lại mật khẩu của bạn',
      submit: 'Đặt lại mật khẩu',
      submitting: 'Đang đặt lại…',
      invalidTitle: 'Link không hợp lệ',
      invalidDesc: 'Link đặt lại này không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.',
      requestNewLink: 'Yêu cầu link mới',
      successTitle: 'Đã đặt lại mật khẩu',
      successDesc: 'Mật khẩu của bạn đã được thay đổi. Bạn có thể đăng nhập ngay.',
      continue: 'Tiếp tục đăng nhập',
      backToLogin: 'Quay lại đăng nhập',
    },
  },

  newsfeed: {
    tabs: {
      skills: 'Kỹ năng của tôi',
      label: 'Lọc bảng tin',
      /* `Bài viết` thay cho `Tất cả` cũ. `Tất cả` là `/posts/public` trộn thêm tin crawl theo
         `publishedAt` ở client — mà phép trộn đó vứt bỏ thứ hạng của `TrendingController` nên cùng
         một tin lại xếp khác nhau giữa hai tab. `Bài viết` giờ là `/posts/public` THUẦN: mọi bài
         trong sản phẩm, không tin crawl, không xếp lại. */
      posts: 'Bài viết',
      friends: 'Bạn bè',
      /* `Công nghệ`, KHÔNG PHẢI `Xu hướng`. Tab này thay cho trang `/trending` cũ, và tên cũ
         nói về CÁCH xếp (đang hot) chứ không nói nội dung là gì. Đứng cạnh `Bài viết · Bạn bè ·
         Kỹ năng của tôi` — ba cái tên đều trả lời "cột này chứa gì" — thì `Công nghệ` mới cùng
         một loại câu trả lời. Đây cũng là tab MẶC ĐỊNH: `/newsfeed` trần mở vào đây. */
      tech: 'Công nghệ',
    },
    title: 'Bảng tin',
    subtitle: 'Cập nhật mới nhất từ bạn bè và những người bạn theo dõi',
    error: 'Không thể tải bài viết. Vui lòng thử lại.',
    retry: 'Thử lại',
    empty: {
      title: 'Chưa có bài viết nào',
      desc: 'Hãy là người đầu tiên đăng bài hoặc kết bạn thêm để xem tin tức mới!',
    },
    allLoaded: 'Bạn đã xem hết bài viết rồi',
    /* Nhãn của nút soạn bài nằm trong thanh lọc dính. Nút chỉ có icon nên chuỗi này là
       `aria-label` + tooltip, không hiện thành chữ — vì vậy nó phải nói đủ một hành động
       (`Viết bài mới`) chứ không phải một từ (`Viết`). */
    composeInBar: 'Viết bài mới',
    /* Bộ lọc `?hashtag=` trên tab `Bài viết` (B31). */
    hashtag: {
      filteredBy: 'Đang lọc theo',
      clear: 'Bỏ lọc #${tag}',
      emptyTitle: 'Chưa có bài viết nào gắn #${tag}',
      emptyDesc: 'Chưa ai đăng bài với hashtag này, hoặc những bài có thì bạn không xem được.',
    },
  },

  hashtags: {
    /* "12 bài viết" — số đứng cạnh mỗi hashtag trong danh sách gợi ý. */
    postCount: '${count} bài viết',
    search: {
      placeholder: 'Tìm hashtag',
      placeholderActive: 'Đang xem #${tag} — tìm hashtag khác',
      trendingLabel: 'Phổ biến tuần này',
    },
  },

  notifications: {
    title: 'Thông báo',
    unreadCount: '${count} thông báo chưa đọc',
    allRead: 'Bạn đã đọc hết thông báo',
    unreadMarker: 'Chưa đọc',
    markAllRead: 'Đánh dấu tất cả đã đọc',
    error: 'Không thể tải thông báo. Vui lòng thử lại.',
    markReadError: 'Không đánh dấu đã đọc được thông báo này. Vui lòng thử lại.',
    markAllReadError: 'Không đánh dấu tất cả đã đọc được. Vui lòng thử lại.',
    retry: 'Thử lại',
    allLoaded: 'Bạn đã xem hết thông báo rồi',
    // Đứng thế cho người chưa đặt tên tài khoản — khớp `.orElse("Someone")` phía backend để một
    // dòng tiếng Việt không kẹp chữ tiếng Anh. Xem `lib/notification-text.ts`.
    someone: 'Ai đó',
    bell: {
      label: 'Thông báo',
      labelUnread: 'Thông báo, ${count} chưa đọc',
      loading: 'Đang tải…',
      viewAll: 'Xem tất cả thông báo',
    },
    empty: {
      title: 'Chưa có thông báo nào',
      desc: 'Khi có người tương tác với bạn, thông báo sẽ xuất hiện ở đây.',
    },
    prefs: {
      channels: 'Kênh nhận thông báo',
      push: 'Thông báo đẩy',
      pushDesc: 'Hiện trên trình duyệt khi bạn đang mở ứng dụng khác',
      pushNotConfigured: 'Bản triển khai này chưa thiết lập gửi thông báo đẩy.',
      pushDenied:
        'Trình duyệt đang chặn thông báo cho trang này. Hãy cho phép trong cài đặt trình duyệt để bật.',
      email: 'Thông báo qua email',
      emailDesc: 'Gửi ngay khi có hoạt động mới',
      types: 'Loại thông báo',
      typesDesc: 'Tắt loại nào thì sẽ không nhận thông báo loại đó nữa',
      error: 'Không tải được tuỳ chọn thông báo',
      saveError: 'Không lưu được thay đổi. Vui lòng thử lại.',
    },
    // Nhãn loại theo từng type — panel tuỳ chọn đọc để dựng công tắc tắt/bật, giữ đủ so với
    // `NotificationType` để không loại nào thiếu nhãn.
    types: {
      POST_LIKED: 'Có người thích bài viết của bạn',
      COMMENT_LIKED: 'Có người bày tỏ cảm xúc về bình luận của bạn',
      POST_COMMENTED: 'Có người bình luận bài viết của bạn',
      POST_TAGGED: 'Có người nhắc tới bạn trong bài viết',
      USER_MENTIONED: 'Có người nhắc tới bạn trong một bình luận',
      FRIEND_REQUEST: 'Lời mời kết bạn mới',
      FRIEND_ACCEPTED: 'Lời mời kết bạn được chấp nhận',
      EVENT_RSVP: 'Có người phản hồi sự kiện của bạn',
      EVENT_REMINDER: 'Nhắc trước một ngày sự kiện bạn sẽ tham gia',
      BOOK_REVIEW: 'Có đánh giá mới cho sách của bạn',
      BOOK_PURCHASED: 'Có người mua sách của bạn',
      SKILL_VERIFIED: 'Một yêu cầu xác minh kỹ năng của bạn được duyệt',
      SKILL_REJECTED: 'Một yêu cầu xác minh kỹ năng của bạn bị từ chối',
      PROJECT_APPLICATION_ACCEPTED: 'Đơn ứng tuyển dự án của bạn được nhận',
      PROJECT_APPLICATION_REJECTED: 'Đơn ứng tuyển dự án của bạn bị từ chối',
      PROJECT_MEMBER_REMOVED: 'Bạn bị loại khỏi một dự án',
    },
    /**
     * DÒNG NỘI DUNG THEO TỪNG TYPE — B41. Backend gửi `messageKey` (vd `POST_LIKED`) +
     * `messageArgs` (vd `{ actor: "Ada" }`); `lib/notification-text.ts` dựng câu từ đây nên dòng
     * chữ theo đúng ngôn ngữ UI. `${actor}` là tên hiển thị, còn lại là tiêu đề trong ngoặc kép
     * (`${book}`, `${skill}`, `${project}`, `${event}`). Khoá khớp hằng `NotificationMessages`
     * phía backend, gồm 2 biến thể `EVENT_RSVP_*` — đổi tên khoá phải đồng bộ với backend. Khối
     * này ở lại lâu dài, không phải shim tạm: vẫn giữ sau khi tầng parse tiếng Anh cũ trong file
     * đó được gỡ.
     */
    line: {
      POST_LIKED: '${actor} đã bày tỏ cảm xúc về bài viết của bạn',
      COMMENT_LIKED: '${actor} đã bày tỏ cảm xúc về bình luận của bạn',
      POST_COMMENTED: '${actor} đã bình luận bài viết của bạn',
      POST_TAGGED: '${actor} đã gắn thẻ bạn trong một bài viết',
      USER_MENTIONED: '${actor} đã nhắc tới bạn trong một bình luận',
      FRIEND_REQUEST: '${actor} đã gửi cho bạn lời mời kết bạn',
      FRIEND_ACCEPTED: '${actor} đã chấp nhận lời mời kết bạn của bạn',
      EVENT_RSVP_GOING: '${actor} sẽ tham gia ${event}',
      EVENT_RSVP_INTERESTED: '${actor} quan tâm tới ${event}',
      EVENT_REMINDER: '${event} sẽ bắt đầu trong vòng 24 giờ',
      BOOK_REVIEW: '${actor} đã đánh giá “${book}”',
      BOOK_PURCHASED: '${actor} đã mua “${book}”',
      SKILL_VERIFIED: 'Yêu cầu xác minh “${skill}” của bạn đã được duyệt',
      SKILL_REJECTED: 'Yêu cầu xác minh “${skill}” của bạn không được duyệt',
      PROJECT_APPLICATION_ACCEPTED: 'Đơn ứng tuyển vào “${project}” của bạn đã được chấp nhận',
      PROJECT_APPLICATION_REJECTED: 'Đơn ứng tuyển vào “${project}” của bạn đã bị từ chối',
      PROJECT_MEMBER_REMOVED: 'Bạn đã bị loại khỏi nhóm của “${project}”',
    },
  },

  search: {
    booksSection: 'Sách (${count})',
    placeholder: 'Tìm kiếm mọi người, bài viết và sách...',
    error: 'Tìm kiếm thất bại. Vui lòng thử lại.',
    empty: 'Không có kết quả cho "${query}"',
    usersSection: 'Mọi người (${count})',
    postsSection: 'Bài viết (${count})',
    projectsSection: 'Dự án (${count})',
    roadmapsSection: 'Lộ trình (${count})',
    viewAllInTab: 'Xem tất cả',
    title: 'Tìm kiếm',
    prompt: 'Nhập nội dung và nhấn Enter để tìm kiếm',
    promptTitle: 'Tìm gì đó',
    emptyTitle: 'Không có kết quả',
    errorTitle: 'Tìm kiếm thất bại',
    clear: 'Xoá nội dung tìm kiếm',
    backToResults: 'Kết quả tìm kiếm',
    /* Dòng dưới thẻ dự án: dự án khớp "${query}" ở kỹ năng của vị trí (thứ không hiện trên thẻ),
       không phải ở tiêu đề — đúng chỗ gây nhầm với matchmaking/4034. */
    projectMatch: 'Khớp "${query}":',
    unknownPerson: 'Người dùng',
    untitledBook: 'Sách chưa có tiêu đề',
    free: 'Miễn phí',
    price: '${price} đ',
    priceUnknown: 'Chưa có giá',
    /* Các tab kết quả. `all` giữ nguyên các mục mọi người/bài viết/sách xếp chồng; các tab còn
       lại thu về một loại. Từ B33, cả năm tab đọc chung một lượt gọi `/search`. */
    tabs: {
      all: 'Tất cả',
      people: 'Người dùng',
      posts: 'Bài viết',
      books: 'Sách',
      projects: 'Dự án',
      roadmaps: 'Lộ trình',
    },
    filters: {
      sortLabel: 'Sắp xếp',
      sortRelevance: 'Theo kết quả',
      sortRep: 'Uy tín cao nhất',
      kindLabel: 'Loại bài',
      kindAll: 'Mọi loại',
      priceLabel: 'Giá',
      priceAll: 'Mọi mức giá',
      priceFree: 'Miễn phí',
      pricePaid: 'Trả phí',
      statusLabel: 'Trạng thái',
      statusAll: 'Mọi trạng thái',
      categoryLabel: 'Chủ đề',
      categoryAll: 'Tất cả chủ đề',
    },
    openPositions: '${count} vị trí đang mở',
  },

  github: {
    link: {
      action: 'Liên kết GitHub',
      linking: 'Đang liên kết tài khoản GitHub…',
      failed: 'Không liên kết được tài khoản GitHub',
      cancelledTitle: 'Bạn đã huỷ việc liên kết',
      cancelledDesc: 'Không có gì thay đổi. Mở lại trang cá nhân để thử lần nữa.',
      noCodeTitle: 'Thiếu mã uỷ quyền',
      noCodeDesc: 'GitHub không gửi kèm mã. Hãy bắt đầu lại từ nút liên kết trên trang cá nhân.',
    },
    title: 'GitHub',
    subtitle: 'Tài khoản GitHub đã liên kết, theo lần app đọc gần nhất.',
    loadFailed: 'Không tải được dữ liệu GitHub',
    notLinked: {
      title: 'Chưa liên kết tài khoản GitHub',
      desc: 'Nối tài khoản GitHub để hiện số liệu đóng góp và kho ghim trên hồ sơ của bạn.',
    },
    // Bản cho người xem hồ sơ người khác: không giải thích B23, vì "làm sao sửa" không phải câu
    // hỏi người ta đặt ra với tài khoản của người lạ.
    notLinkedOther: {
      title: 'Chưa liên kết GitHub',
      desc: 'Người này chưa nối tài khoản GitHub vào hồ sơ.',
    },
    sync: 'Đồng bộ ngay',
    syncRateLimited: 'Vừa đồng bộ xong. Mỗi giờ chỉ làm mới dữ liệu GitHub được một lần.',
    unlink: 'Huỷ liên kết',
    repos: '${count} repo công khai',
    followers: '${count} người theo dõi',
    lastSynced: 'Đồng bộ ${when}',
    neverSynced: 'Chưa đồng bộ lần nào',
    pinned: {
      title: 'Repository đã ghim',
    },
    graph: {
      total: '${count} đóng góp trong một năm qua',
      day: '${count} đóng góp ngày ${date}',
    },
  },

  moderation: {
    // `subtitle` went with the page's own `<h1>` when it was dropped — the admin header nav
    // already names this destination, so a repeated title+sentence was saying it a third time.
    title: 'Kiểm duyệt',
    loadFailed: 'Không tải được dữ liệu',
    pageOf: 'Trang ${page} / ${totalPages}',
    tabs: {
      posts: 'Hàng chờ',
      reports: 'Báo cáo',
      logs: 'Nhật ký quyết định',
      banned: 'Người bị cấm',
      appeals: 'Khiếu nại',
      system: 'Hệ thống',
    },
    rebuild: {
      title: 'Dựng lại bảng tin',
      desc: 'Tính lại bảng tin cá nhân hoá của mọi người dùng từ đầu. Chậm và hiếm khi cần — dùng sau khi di chuyển dữ liệu hoặc khi bảng tin có vẻ cũ.',
      button: 'Dựng lại bảng tin',
      confirm: 'Dựng lại ngay',
      cancel: 'Huỷ',
      result: 'Xong — đã dựng lại ${processed} bảng tin, bỏ qua ${skipped}.',
      error: 'Không dựng lại được bảng tin.',
    },
    banBanner: {
      title: 'Tài khoản của bạn đang bị hạn chế — còn ${remaining}.',
      titleNoTime: 'Tài khoản của bạn đang bị hạn chế.',
      remainingDays: '${days} ngày ${hours} giờ',
      remainingHours: '${hours} giờ ${minutes} phút',
      remainingMinutes: '${minutes} phút',
      link: 'Xem lý do và kháng cáo',
    },
    report: {
      /* THE MENU ITEM, NOT THE DIALOG TITLE. `title` is the heading the dialog wears —
         `Báo cáo bài viết` — and it read as a whole sentence sitting between `Sửa` and `Xoá` on
         the `⋯` menu. A menu row is a verb, at the same length as its neighbours. */
      action: 'Báo cáo',
      title: 'Báo cáo bài viết',
      description:
        'Chọn lý do gần nhất. Báo cáo được gửi cho quản trị viên, không gửi cho tác giả.',
      reasonLabel: 'Lý do',
      reason: {
        SPAM: 'Spam hoặc quảng cáo',
        HARASSMENT: 'Quấy rối, công kích cá nhân',
        HATE_SPEECH: 'Ngôn từ thù ghét',
        ADULT_CONTENT: 'Nội dung người lớn',
        VIOLENCE: 'Bạo lực',
        MISINFORMATION: 'Thông tin sai lệch',
        OTHER: 'Lý do khác',
      },
      detailsLabel: 'Mô tả thêm (không bắt buộc)',
      detailsPlaceholder: 'Điều gì khiến bạn báo cáo bài này?',
      submit: 'Gửi báo cáo',
      cancel: 'Huỷ',
      failed: 'Không gửi được báo cáo',
      sentTitle: 'Đã gửi báo cáo',
      sentBody: 'Cảm ơn bạn. Báo cáo đã được ghi nhận và chuyển tới quản trị viên.',
      done: 'Đóng',
    },
    /* Hàng chờ báo cáo từ người đọc. Chỉ đọc, do chính hình dạng của API — không có endpoint nào
       đánh dấu một báo cáo là đã xử lý — nên `readOnly` phải nói thẳng điều đó. */
    reports: {
      readOnly:
        'Báo cáo là tín hiệu, không phải danh sách việc: không đánh dấu xử lý được ở đây. Mở bài viết ra để quyết định.',
      total: '${count} báo cáo',
      empty: 'Chưa ai báo cáo điều gì',
      emptyForPost: 'Không có báo cáo nào cho bài #${postId}',
      viewPost: 'Mở bài #${postId}',
      reporter: 'Người báo cáo #${reporterId}',
    },
    appeals: {
      filter: 'Lọc theo trạng thái',
      loadError: 'Không tải được danh sách khiếu nại',
      empty: 'Không có khiếu nại nào ở trạng thái này',
      approve: 'Chấp nhận',
      reject: 'Từ chối',
      note: 'Ghi chú của người duyệt',
      notePlaceholder: 'Ghi chú (không bắt buộc)',
      decisionError: 'Không xử lý được khiếu nại này. Vui lòng thử lại.',
    },
    filters: {
      postId: 'Post ID',
      userId: 'User ID',
      status: 'Trạng thái',
      anyStatus: 'Mọi trạng thái',
    },
    status: {
      PENDING_MODERATION: 'Chờ máy phân loại',
      APPROVED: 'Đã duyệt',
      PENDING_REVIEW: 'Cần quyết định',
      REJECTED: 'Đã từ chối',
    },
    /* Mức nghiêm trọng do `UserBanService.determineSeverity` suy ra từ loại vi phạm — người bị
       ghi vi phạm đọc được nó, nên nó phải là chữ chứ không phải hằng số enum. */
    severity: {
      LOW: 'Nhẹ',
      MEDIUM: 'Trung bình',
      HIGH: 'Nặng',
      CRITICAL: 'Nghiêm trọng',
    },
    violation: {
      HATE_SPEECH: 'Ngôn từ thù ghét',
      NSFW: 'Nội dung nhạy cảm',
      SPAM: 'Spam',
      VIOLENCE: 'Bạo lực',
      THREAT: 'Đe doạ',
      INSULT: 'Lăng mạ',
      SEXUALLY_EXPLICIT: 'Nội dung tình dục',
      KEYWORD_BLACKLIST: 'Từ khoá bị cấm',
      DUPLICATE_CONTENT: 'Nội dung trùng lặp',
    },
    log: {
      toxicity: 'Độ độc hại của chữ',
      imageUnsafe: 'Điểm không an toàn của ảnh',
      empty: 'Không có bản ghi nào khớp bộ lọc',
    },
    post: {
      empty: 'Không có gì cần duyệt',
      emptyDesc: 'Thử xoá bộ lọc, hoặc chọn trạng thái khác.',
      history: 'Lịch sử (${count})',
      noHistory: 'Bài này chưa có lịch sử',
      feedback: 'Lý do',
      feedbackHint:
        'Được lưu vào hồ sơ vi phạm của tác giả. Đây là chỗ duy nhất giữ lại lý do thật.',
      approve: 'Duyệt',
      reject: 'Từ chối',
      rejectConfirm: 'Từ chối',
      cancel: 'Huỷ',
      violationType: 'Loại vi phạm',
      violationTypeUnset: 'Chọn loại vi phạm',
      /* Không đặt sẵn giá trị: nó được ghi vào hồ sơ vi phạm của tác giả và chính họ đọc được,
         nên chọn nhầm là buộc tội oan — và SPAM với HATE_SPEECH khác nhau ở chỗ cái sau tính là
         nghiêm trọng, tức là gần lệnh cấm 7 ngày hơn. */
      violationTypeHint: 'Được ghi vào hồ sơ vi phạm và hiện cho tác giả. Bắt buộc khi từ chối.',
      rejectWarning:
        'Từ chối sẽ ghi một vi phạm cho tác giả. Đủ 2 vi phạm là bị cấm 7 ngày, và lệnh cấm chặn cả đăng nhập.',
    },
    banned: {
      empty: 'Chưa có ai bị cấm',
      active: 'Đang bị cấm · còn ${remaining}',
      expired: 'Đã hết hạn cấm',
      count: 'Đã bị cấm ${count} lần',
      triggeringPosts: 'Bài gây ra:',
    },
  },

  roadmap: {
    title: 'Lộ trình',
    list: {
      loadFailed: 'Không tải được lộ trình',
      empty: 'Chưa có lộ trình nào',
      emptyDesc: 'Quản trị viên tạo lộ trình xong thì chúng sẽ hiện ở đây.',
      categoryLabel: 'Lọc theo chủ đề',
      allCategories: 'Tất cả chủ đề',
      emptyCategory: 'Chủ đề này chưa có lộ trình',
      emptyCategoryDesc: 'Chọn chủ đề khác để xem các lộ trình còn lại.',
    },
    nodes: {
      pickRoadmap: 'Chọn một lộ trình để xem các kỹ năng',
      pickRoadmapDesc: 'Mỗi lộ trình là một tập kỹ năng bạn có thể ghi nhận.',
      loadFailed: 'Không tải được danh sách kỹ năng',
      empty: 'Lộ trình này chưa có kỹ năng nào',
      emptyDesc: 'Kỹ năng sẽ xuất hiện khi quản trị viên thêm vào lộ trình.',
    },
    path: {
      legend: {
        verified: 'Đã xác minh',
        pending: 'Chờ duyệt',
        open: 'Chưa bắt đầu',
      },
    },
    track: {
      // Số đã xác minh trên tổng số node của CẢ lộ trình, mọi cấp — xem ghi chú trong
      // `roadmap-track.tsx` về việc vì sao không đếm riêng cấp cao nhất.
      progress: 'Đã xác minh ${done}/${total} kỹ năng',
      progressLabel: 'Tiến độ lộ trình',
      hint: 'Bấm Ghi nhận ở một bước để tự khai, hoặc gửi minh chứng cho kiểm duyệt viên duyệt.',
    },
    verify: {
      claim: 'Ghi nhận',
      claiming: 'Đang ghi nhận: ${node}',
      tierLabel: 'Bạn chứng minh bằng cách nào?',
      tier: {
        self: 'Tự khai',
        mod: 'Nhờ kiểm duyệt viên duyệt',
        quiz: 'Kết quả trắc nghiệm, có kiểm duyệt viên duyệt',
        auto: 'Repository trên GitHub đã liên kết',
      },
      tierHint: {
        self: 'Ghi nhận ngay. Có cộng điểm uy tín.',
        mod: 'Vào hàng chờ của kiểm duyệt viên và đợi quyết định.',
        quiz: 'Vào hàng chờ của kiểm duyệt viên và đợi quyết định.',
        auto: 'Kiểm ngay lập tức dựa trên tài khoản GitHub bạn đã liên kết.',
      },
      proofUrl: 'Link minh chứng',
      proofUrlHint: 'Không bắt buộc. Kiểm duyệt viên sẽ đọc link này.',
      proofUrlAutoHint:
        'Bắt buộc, và phải là repository thuộc chính tài khoản GitHub bạn đã liên kết — khác đi sẽ bị từ chối.',
      proofImage: 'Ảnh minh chứng',
      proofImageHint:
        'Không bắt buộc. Ảnh chụp để kiểm duyệt viên xem — không dùng cho kiểm tra GitHub.',
      proofImageAdd: 'Tải ảnh lên',
      proofImageRemove: 'Xoá ảnh',
      proofImageInvalid: 'Dùng ảnh JPEG, PNG hoặc WEBP dưới 20MB.',
      submit: 'Gửi',
      done: 'Xong',
      // Endpoint giờ trả về hàng kết quả, nên thông báo là kết quả thật — kể cả yêu cầu
      // AUTO_CERTIFIED bị từ chối sau một 200. Xem `skill-verification-form.tsx`.
      submitted: 'Đã gửi. Kết quả tuỳ vào cách chứng minh bạn chọn.',
      result: {
        verified: 'Đã xác minh. Kỹ năng này giờ hiển thị trên trang cá nhân của bạn.',
        pending: 'Đã gửi để duyệt. Kiểm duyệt viên sẽ quyết định.',
        rejected: 'Bị từ chối. Minh chứng không khớp với tài khoản GitHub bạn đã liên kết.',
      },
    },
    queue: {
      title: 'Chờ duyệt',
      loadFailed: 'Không tải được hàng chờ duyệt',
      empty: 'Không có yêu cầu nào chờ duyệt',
      approve: 'Duyệt',
      reject: 'Từ chối',
    },
    admin: {
      title: 'Quản lý lộ trình',
      newRoadmap: 'Lộ trình mới',
      roadmapName: 'Tên',
      roadmapDescription: 'Mô tả',
      roadmapCategory: 'Chủ đề',
      createRoadmap: 'Tạo lộ trình',
      newNode: 'Kỹ năng mới',
      pickRoadmap: 'Chọn một lộ trình ở trên để thêm kỹ năng vào đó.',
      nodeName: 'Tên',
      parentNode: 'Nằm dưới',
      noParent: 'Cấp cao nhất',
      parentHint: 'Chỉ những kỹ năng đã có trên lộ trình này mới làm cha được.',
      createNode: 'Thêm kỹ năng',
    },
  },

  trending: {
    sourceLabel: 'Lọc theo nguồn',
    allSources: 'Mọi nguồn',
    title: 'Xu hướng',
    subtitle: 'Những bài viết công nghệ nổi bật trên khắp mạng',
    error: 'Không thể tải nội dung xu hướng. Vui lòng thử lại.',
    retry: 'Thử lại',
    empty: {
      title: 'Chưa có nội dung xu hướng',
      desc: 'Quay lại sau để xem những bài viết mới nhất.',
    },
    allLoaded: 'Bạn đã xem hết nội dung xu hướng rồi',
    // `Mọi chủ đề`, KHÔNG PHẢI `Tất cả`: hồi tab đầu của bảng tin còn tên `Tất cả`, chip này nằm
    // ngay dưới nó — cùng một chữ mà hai nghĩa khác hẳn. Tab đã đổi tên thành `Bài viết` nhưng
    // vẫn giữ tên chip riêng cho rõ.
    allCategories: 'Mọi chủ đề',
    filters: 'Bộ lọc',
    // Tên cho trình đọc màn hình — con số trên nút là ký hiệu, đứng một mình không nói được
    // nó đếm cái gì.
    filtersActive: 'Bộ lọc, ${count} đang bật',
    clearFilters: 'Xoá lọc',
    errorTitle: 'Không tải được xu hướng',
    untitled: 'Không có tiêu đề',
    timeRangeLabel: 'Khoảng thời gian',
    categoryLabel: 'Chủ đề',
    timeRange: {
      today: 'Hôm nay',
      week: 'Tuần này',
      month: 'Tháng này',
    },
    categories: {
      OPENSOURCE: 'Mã nguồn mở',
      EVENT: 'Sự kiện',
      NEW_TECH: 'Công nghệ mới',
      REGULATION: 'Quy định',
      MINDSET: 'Tư duy',
      TOOL: 'Công cụ',
      CAREER: 'Sự nghiệp',
      OTHER: 'Khác',
    },
    sources: {
      HACKER_NEWS: 'Hacker News',
      DEV_TO: 'DEV Community',
      GITHUB: 'GitHub',
    },
  },

  createPost: {
    location: {
      add: 'Thêm địa điểm',
      placeholder: 'Mô tả địa điểm...',
      myLocation: 'Vị trí của tôi',
      searching: 'Đang tìm địa điểm...',
      notFoundTitle: 'Không tìm thấy địa điểm',
      notFoundDesc: 'Thử mô tả khác, hoặc dùng vị trí hiện tại của bạn.',
      clear: 'Bỏ địa điểm',
      openInMaps: 'Mở trong Google Maps',
      cancel: 'Huỷ',
      gpsDenied: 'Không lấy được vị trí. Hãy cho phép quyền truy cập vị trí rồi thử lại.',
      gpsUnavailable: 'Trình duyệt này không hỗ trợ định vị.',
    },
    visibilityLabel: 'Ai xem được bài này',
    tag: {
      chipRemove: 'Bỏ gắn thẻ ${name}',
      privateWarning: 'Bài riêng tư không gắn thẻ được ai — bỏ thẻ hoặc đổi chế độ hiển thị.',
    },
    submittedPendingReview:
      'Đã gửi bài. Bài viết có thể phải qua kiểm duyệt trước khi xuất hiện trên bảng tin.',
    contentPlaceholderNoName: 'Bạn đang nghĩ gì vậy?',
    photo: 'Ảnh',
    posting: 'Đang đăng...',
    post: 'Đăng bài',
    cancel: 'Huỷ',
    dialogTitle: 'Soạn bài · ${type}',
    dialogNote: 'Bài viết có thể phải qua kiểm duyệt trước khi xuất hiện trên bảng tin.',
    /* Bước xác nhận. `open` là nút chính của form soạn bài nên nó gọi tên BƯỚC, không gọi tên
       kết quả — nút đăng thật nằm trong bản xem trước và vẫn là `post`. */
    preview: {
      open: 'Xem trước',
      title: 'Xem trước bài đăng',
      note: 'Bài của bạn sẽ hiện trên bảng tin gần như thế này. Bài có thể phải qua kiểm duyệt trước khi xuất hiện, và hashtag do máy chủ tách ra sau khi đăng.',
      back: 'Quay lại sửa',
      quizAttached: 'Có đính kèm câu đố · ${count} câu hỏi',
      quizAttachedTitled: 'Câu đố "${title}" · ${count} câu hỏi',
    },
    visibility: {
      PUBLIC: 'Công khai',
      FRIENDS: 'Bạn bè',
      PRIVATE: 'Chỉ mình tôi',
    },
    removeType: 'Bỏ',
    type: {
      REGULAR: 'Trạng thái',
      CODE_SNIPPET: 'Code',
      ARTICLE: 'Bài viết',
      QNA: 'Câu hỏi',
      POLL: 'Bình chọn',
      LINK: 'Liên kết',
      BOOK: 'Sách',
      EVENT: 'Sự kiện',
    },
    contentPlaceholder: {
      REGULAR: '${fullname} đang nghĩ gì vậy?',
      CODE_SNIPPET: 'Giải thích đoạn code này làm gì...',
      ARTICLE: 'Viết bài của bạn...',
      QNA: 'Đặt câu hỏi thật đầy đủ — càng chi tiết càng dễ nhận câu trả lời tốt.',
      POLL: 'Thêm bối cảnh cho cuộc bình chọn (không bắt buộc)...',
      LINK: 'Nói vì sao nên mở liên kết này (không bắt buộc)...',
      BOOK: 'Nói cuốn sách này viết về gì và hợp với ai (không bắt buộc)...',
      EVENT: 'Nói thêm về sự kiện này (không bắt buộc)...',
    },
    quiz: {
      label: 'Câu đố',
      remove: 'Bỏ câu đố',
      title: 'Tên câu đố',
      titlePlaceholder: 'Câu đố này về chủ đề gì?',
      questionN: 'Câu ${index}',
      questionPlaceholder: 'Nhập nội dung câu hỏi',
      removeQuestion: 'Bỏ câu hỏi',
      addQuestion: 'Thêm câu hỏi',
      options: 'Đáp án',
      optionPlaceholder: 'Đáp án ${index}',
      addOption: 'Thêm đáp án',
      removeOption: 'Bỏ đáp án',
      markCorrect: 'Chọn đáp án ${index} là đáp án đúng',
      correctHint: 'Chọn đáp án đúng. Mỗi câu cần ít nhất hai đáp án.',
      explanation: 'Giải thích',
      explanationHint: 'Không bắt buộc — hiện sau khi người làm trả lời xong.',
    },
    code: {
      language: 'Ngôn ngữ',
      code: 'Code',
      codePlaceholder: 'Dán đoạn code vào đây',
      languages: {
        plaintext: 'Văn bản thuần',
        typescript: 'TypeScript',
        javascript: 'JavaScript',
        python: 'Python',
        java: 'Java',
        kotlin: 'Kotlin',
        go: 'Go',
        rust: 'Rust',
        c: 'C',
        cpp: 'C++',
        csharp: 'C#',
        php: 'PHP',
        ruby: 'Ruby',
        swift: 'Swift',
        sql: 'SQL',
        html: 'HTML',
        css: 'CSS',
        shell: 'Shell',
        json: 'JSON',
        yaml: 'YAML',
        dart: 'Dart',
        scala: 'Scala',
        groovy: 'Groovy',
        objectivec: 'Objective-C',
        lua: 'Lua',
        perl: 'Perl',
        r: 'R',
        haskell: 'Haskell',
        elixir: 'Elixir',
        erlang: 'Erlang',
        clojure: 'Clojure',
        powershell: 'PowerShell',
        dockerfile: 'Dockerfile',
        makefile: 'Makefile',
        nginx: 'Nginx',
        graphql: 'GraphQL',
        markdown: 'Markdown',
        xml: 'XML',
        ini: 'INI / TOML',
        scss: 'SCSS',
        less: 'Less',
        diff: 'Diff / Patch',
      },
    },
    article: {
      title: 'Tiêu đề bài viết',
      titlePlaceholder: 'Tiêu đề nói rõ bài này về cái gì',
      summary: 'Tóm tắt',
      summaryHint: 'Hiện trên card bảng tin thay cho toàn bộ nội dung.',
      coverImage: 'Ảnh bìa',
      coverImageHint:
        'Ảnh hiện trên card bảng tin cho bài viết này. Dán liên kết ảnh, hoặc tải một ảnh lên từ máy.',
    },
    qna: {
      noticeTitle: 'Nội dung bài chính là câu hỏi',
      noticeDesc:
        'Viết câu hỏi ở phía trên. Khi có người trả lời, bạn chọn được một câu là câu trả lời được chấp nhận, và tác giả câu đó nhận điểm uy tín.',
    },
    poll: {
      question: 'Câu hỏi bình chọn',
      questionPlaceholder: 'Bạn muốn hỏi gì?',
      options: 'Các lựa chọn',
      optionPlaceholder: 'Lựa chọn ${index}',
      addOption: 'Thêm lựa chọn',
      removeOption: 'Bỏ lựa chọn',
      mode: 'Cách trả lời',
      modeSingle: 'Chọn một',
      modeMultiple: 'Chọn nhiều',
      endDate: 'Đóng lúc',
      endDateHint: 'Không bắt buộc.',
    },
    link: {
      url: 'URL liên kết',
      urlInvalid: 'Nhập địa chỉ đầy đủ bắt đầu bằng http:// hoặc https://',
      title: 'Tiêu đề liên kết',
      titleHint: 'Không bắt buộc. Lấy xem trước hoặc tự nhập.',
      description: 'Mô tả liên kết',
      thumbnailUrl: 'Ảnh thu nhỏ',
      thumbnailUrlHint: 'Không bắt buộc. Dán liên kết ảnh, hoặc tải một ảnh lên từ máy.',
      fetchPreview: 'Lấy xem trước',
      fetching: 'Đang lấy xem trước…',
      previewFailed: 'Không đọc được trang đó — bạn tự điền các ô bên dưới.',
    },
    event: {
      button: 'Sự kiện',
      title: 'Tên sự kiện',
      description: 'Mô tả sự kiện',
      startTime: 'Thời gian bắt đầu',
      endTime: 'Thời gian kết thúc',
      endShortcut: '+${hours} giờ',
      location: 'Địa điểm tổ chức',
      onlineUrl: 'Link trực tuyến (tuỳ chọn)',
      maxAttendees: 'Số người tham gia tối đa (tuỳ chọn)',
    },
    images: {
      label: 'Ảnh trong bài',
      hintArticle: 'Ảnh nằm trong nội dung bài.',
      hintLink: 'Ảnh nằm trong nội dung bài, tách biệt với ảnh thu nhỏ của liên kết ở trên.',
      add: 'Thêm ảnh',
      remove: 'Bỏ ảnh',
      tooMany: 'Mỗi bài tối đa ${count} ảnh',
      invalidFormat: 'Chỉ hỗ trợ JPEG, PNG, WEBP và GIF',
      fileTooLarge: 'Mỗi ảnh phải từ 20MB trở xuống',
      batchTooLarge: 'Tổng dung lượng một lần chọn phải dưới 25MB',
      uploadFailed: 'Không tải được ảnh lên, thử lại',
    },
    book: {
      button: 'Sách',
      title: 'Tên sách',
      description: 'Mô tả sách',
      file: 'Tệp sách (PDF hoặc EPUB)',
      cover: 'Ảnh bìa (tuỳ chọn)',
      price: 'Giá (VND, để trống nếu miễn phí)',
      previewPages: 'Số trang xem trước (bắt buộc với sách có phí)',
      cancel: 'Huỷ sách',
      fileRequired: 'Vui lòng chọn tệp PDF hoặc EPUB',
      fileInvalidFormat: 'Chỉ hỗ trợ định dạng PDF và EPUB',
      fileTooLarge: 'Tệp phải từ 20MB trở xuống',
      previewPagesHint: 'Phải nhỏ hơn tổng số trang (EPUB thì tính theo chương).',
      chooseFile: 'Chọn tệp',
      chooseCover: 'Chọn ảnh bìa',
      removeFile: 'Xoá',
      previewError: 'Không thể xem trước tệp PDF này',
      previewPageCount: '${count} trang',
    },
  },

  time: {
    justNow: 'Vừa xong',
    minutesAgo: '${minutes} phút trước',
    hoursAgo: '${hours} giờ trước',
    daysAgo: '${days} ngày trước',
  },

  post: {
    reactors: {
      title: 'Ai đã bày tỏ cảm xúc',
      count: '${count} người',
      all: 'Tất cả',
      empty: 'Chưa có ai ở mục này',
      loadError: 'Không tải được danh sách',
      loadMore: 'Tải thêm',
    },
    backToFeed: 'Về bảng tin',
    permalink: {
      notFoundTitle: 'Không xem được bài viết này',
      notFoundDesc: 'Bài viết có thể đã bị gỡ, hoặc bạn không có quyền xem nó.',
      open: 'Mở bài viết',
    },
    pendingReview: {
      title: 'Bài viết đang chờ kiểm duyệt',
      desc: 'Bài của bạn đã được gửi và đang chờ kiểm duyệt. Khi được duyệt, bài sẽ tự hiển thị ở đây.',
    },
    /* Trước đây không phân biệt được với "chờ duyệt": FE đoán trạng thái bằng cách dò feed của
       chính tác giả, mà bài bị từ chối thì không bao giờ vào feed — nên nó nằm mãi ở câu "đang
       chờ". Giờ `moderationStatus` nói thẳng, và một bài bị từ chối phải nói ra là bị từ chối. */
    rejected: {
      title: 'Bài viết không được duyệt',
      desc: 'Bài này vi phạm quy định nội dung nên không được đăng. Bạn có thể sửa lại rồi đăng bài mới, hoặc gửi khiếu nại ở trang Tài khoản.',
    },
    unknownAuthor: 'Tác giả không xác định',
    qna: {
      accept: 'Chọn làm đáp án',
      acceptedAnswer: 'Đáp án được chọn',
      unaccept: 'Bỏ chọn đáp án',
    },
    quiz: {
      title: 'Trắc nghiệm',
      submit: 'Nộp bài',
      score: 'Đúng ${score}/${total}',
      resultNotSaved: 'Kết quả này không được lưu — rời trang là mất.',
    },
    edit: {
      edit: 'Sửa',
      menuLabel: 'Tuỳ chọn bài viết',
      deleteTitle: 'Xoá bài viết?',
      deleteDesc: 'Bài viết cùng mọi bình luận và phản ứng của nó sẽ bị gỡ. Không thể hoàn tác.',
      save: 'Lưu thay đổi',
      content: 'Nội dung',
      delete: 'Xoá',
      deleteConfirm: 'Xoá bài này?',
      pendingReview: 'Lưu xong bài sẽ qua kiểm duyệt lại — có thể tạm biến khỏi bảng tin một lúc.',
      /* `UpdatePostRequestDto` không có `eventDetails` lẫn `bookDetails`, nên hai loại này giữ
         nguyên những gì đã đặt lúc đăng. Nói thẳng ra, thay vì để tác giả đi tìm một ô ngày
         tháng không tồn tại. */
      immutable: {
        EVENT:
          'Chi tiết sự kiện không sửa được sau khi đăng. Chỉ sửa được nội dung và phạm vi xem.',
        BOOK: 'Thông tin sách và tệp đã tải lên không sửa được sau khi đăng. Chỉ sửa được nội dung và phạm vi xem.',
      },
      quizKeyLoading: 'Đang tải đáp án quiz…',
      /* Chỉ hiện khi đọc đáp án (chỉ tác giả) thất bại (403). Bình thường đáp án thật sẽ tải về
         và trình soạn mở sẵn với đáp án đã đánh dấu. Xem `post-editor.tsx`. */
      quizKeyLost:
        'Không tải được đáp án đúng, nên lưu sẽ xoá mất chúng. Hãy đánh dấu lại đáp án đúng cho từng câu trước khi lưu.',
    },
    comments: {
      show: 'Bình luận',
      viewAll: 'Xem tất cả ${count} bình luận',
      unknownAuthor: 'Người dùng',
      hide: 'Ẩn bình luận',
      empty: 'Chưa có bình luận',
      loadFailed: 'Không tải được bình luận',
      loadMore: 'Xem thêm bình luận',
      reply: 'Trả lời',
      replyPlaceholder: 'Viết câu trả lời...',
      edit: 'Sửa',
      save: 'Lưu',
      edited: 'đã sửa',
      cancel: 'Huỷ',
      delete: 'Xoá',
      deleteYes: 'Xoá',
      deleteConfirm: 'Xoá bình luận này?',
      deleteWithReplies: 'Xoá bình luận này và ${count} câu trả lời của nó.',
      mentionFriends: 'Bạn bè',
      mentionOthers: 'Khác',
    },
    /* Ba nhãn đầu là bộ của design system — Hữu ích · Sáng tỏ · Ghi nhận — và từ B5 chúng có
       giá trị enum thật ở backend (`INSIGHT`, `CLAP`), nên không còn là bản vá nhãn nữa. Bốn
       nhãn sau giữ lại vì dữ liệu cũ đã dùng chúng; `HAHA` trả về đúng nghĩa của nó. */
    reaction: {
      LIKE: 'Hữu ích',
      INSIGHT: 'Sáng tỏ',
      CLAP: 'Ghi nhận',
      LOVE: 'Xuất sắc',
      HAHA: 'Haha',
      CRY: 'Khó hiểu',
      ANGRY: 'Không đồng tình',
      pick: 'Chọn cảm xúc',
      count: '${count} cảm xúc',
    },
    body: {
      code: 'Mã nguồn',
      openLink: 'Mở trong tab mới',
      qnaResolved: 'Đã có đáp án',
      qnaUnresolved: 'Chưa có đáp án',
      pollNoVoting: 'Chưa bình chọn được.',
      pollClosed: 'Đã đóng lúc ${date}.',
      bookUnits: '${count} trang/chương',
    },
    showMore: 'Xem thêm',
    openInMaps: 'Mở trong Google Maps',
    commentCount: '${count} bình luận',
    commentPlaceholder: 'Viết bình luận...',
    send: 'Gửi',
    event: {
      status: {
        upcoming: 'Sắp diễn ra',
        ongoing: 'Đang diễn ra',
        past: 'Đã kết thúc',
      },
      joinOnline: 'Tham gia trực tuyến',
      maxAttendees: 'Tối đa ${count} người tham gia',
      rsvp: {
        going: 'Sẽ tham gia',
        interested: 'Quan tâm',
        notGoing: 'Không tham gia',
        goingCount: '${count} người tham gia',
        full: 'Sự kiện đã đủ người.',
      },
      attendees: {
        title: 'Người tham gia',
        show: 'Xem người tham gia',
        hide: 'Ẩn người tham gia',
        all: 'Tất cả',
        empty: 'Chưa có ai phản hồi',
        loadFailed: 'Không tải được danh sách người tham gia',
        unknownPerson: 'Người dùng đã xoá',
      },
      calendar: {
        download: 'Tải file .ics',
        add: 'Thêm vào Google Calendar',
        added: 'Đã thêm vào lịch',
        connect: 'Kết nối Google Calendar',
      },
    },
    book: {
      free: 'Miễn phí',
      reviewCount: '${count} đánh giá',
      preview: 'Xem trước',
      hidePreview: 'Ẩn xem trước',
      previewUrlError: 'Không thể tải bản xem trước',
      previewUnavailableHint: 'Tệp của sách này đang không truy cập được.',
      openPreview: 'Mở bản xem trước',
      reviews: 'Đánh giá',
      hideReviews: 'Ẩn đánh giá',
      reviewsError: 'Không thể tải đánh giá',
      noReviews: 'Chưa có đánh giá nào',
      /* Gắn trên đánh giá do chính người đang đăng nhập viết — hàng duy nhất trong danh sách mà họ
         sửa được bằng cách gửi lại biểu mẫu. */
      yourReview: 'Đánh giá của bạn',
      /* Không xác định được người đánh giá: mỗi đánh giá chỉ mang id người dùng, và cầu nối
         id→username (`ReputationResponseDto.username`) rỗng với người đăng ký bằng mật khẩu. */
      anonymousReviewer: 'Một người đọc',
      viewReviewer: 'Xem trang của ${name}',
      feedbackPlaceholder: 'Viết đánh giá (không bắt buộc)',
      submitReview: 'Gửi',
      ratingLabel: 'Chấm điểm',
      readerLoadError: 'Không thể mở sách để đọc',
      previousPage: 'Trước',
      nextPage: 'Sau',
      pageIndicator: 'Trang ${current} / ${total}',
      buy: 'Mua',
      /* Hai mức chắc chắn khác nhau nên phải là hai câu. `resumePayment` đứng trên một lần thanh
         toán chính app này mở, có sẵn đường quay lại trang MoMo; `checkPayment` đứng trên mã đơn
         bóc ra từ lời từ chối của backend, lúc đó app chỉ hỏi được là đơn đã xong chưa. */
      resumePayment: 'Tiếp tục thanh toán',
      checkPayment: 'Kiểm tra thanh toán',
      unavailable: 'Không khả dụng',
      download: 'Tải xuống',
    },
  },

  /* `/onboarding/professional` — cổng 428 đi từng bước một. Đặt cạnh `knowledge` vì hồ sơ nghề
     nghiệp thuộc miền đó, nhưng đây là route riêng với giao diện riêng (wizard, không phải form
     tóm tắt trước). */
  onboarding: {
    professional: {
      /* The browser-tab title. Report G001: this route had no metadata at all and
         reported the root layout's bare product name — see its `layout.tsx`. */
      pageTitle: 'Thiết lập hồ sơ nghề nghiệp',
      stepOf: 'Bước ${step} / ${total}',
      progressLabel: 'Tiến độ thiết lập',
      back: 'Quay lại',
      next: 'Tiếp',
      skip: 'Để sau',
      finish: 'Hoàn tất',
      steps: {
        '1': {
          title: 'Bạn đang làm gì',
          hint: 'Trình giải thích điều chỉnh câu trả lời theo vai trò và cấp bậc của bạn. Đây là phần nó dựa vào nhiều nhất.',
        },
        '2': {
          title: 'Bạn làm việc với gì',
          hint: 'Công nghệ và lĩnh vực, ngăn cách bằng dấu phẩy. Cũng dùng cho gợi ý bạn bè và dự án.',
        },
        '3': {
          title: 'Bạn thích giải thích kiểu nào',
          hint: 'Không bắt buộc — đặt giọng mặc định cho AI khi trả lời. Đổi lúc nào cũng được.',
        },
        '4': {
          title: 'Bạn đã làm ở đâu',
          hint: 'Không bắt buộc. Muốn thêm sau thì bấm Hoàn tất luôn.',
        },
      },
    },
  },

  knowledge: {
    profileMoved:
      'Hồ sơ nghề nghiệp đã chuyển sang trang cá nhân — thiếu nó thì trình giải thích không chạy.',
    profileMovedLink: 'Mở trang cá nhân',
    title: 'Kho lưu trữ',
    // Không phải "Thư viện" — rail đã dùng từ đó cho kho sách (`/library`).
    savedTitle: 'Giải thích đã lưu',
    libraryDesc: 'Các bản giải thích AI bạn đã lưu, nhóm theo chủ đề.',
    tabs: {
      library: 'Thư viện',
      vault: 'Ghi chú đã đồng bộ',
      settings: 'Cài đặt',
    },
    profile: {
      title: 'Hồ sơ nghề nghiệp',
      notSetUp: 'Bạn chưa tạo hồ sơ nghề nghiệp. Điền và lưu để tạo mới.',
      /* Hai nhóm câu hỏi của biểu mẫu. Trước đây bảy ô xếp cách đều nhau nên không nói được ô nào
         đi với ô nào; hai tiêu đề này là chỗ dựa cho đường kẻ ngăn giữa chúng. */
      groupRole: 'Vị trí hiện tại',
      groupStyle: 'Trình giải thích',
      groupExperience: 'Kinh nghiệm làm việc',
      work: {
        hint: 'Các vị trí đã làm. Giúp AI chọn cách giải thích, và gợi ý bạn bè / dự án.',
        company: 'Công ty',
        role: 'Vị trí',
        domain: 'Lĩnh vực',
        durationMonths: 'Số tháng',
        add: 'Thêm vị trí',
        remove: 'Xoá vị trí',
      },
      jobTitle: 'Chức danh',
      jobTitlePlaceholder: 'Kỹ sư backend',
      seniority: 'Cấp độ',
      primaryRole: 'Mảng chính',
      years: 'Số năm kinh nghiệm',
      explanationStyle: 'Kiểu giải thích',
      explanationStyleHint: 'Ảnh hưởng cách AI diễn đạt khi giải thích bài viết.',
      techStack: 'Công nghệ đang dùng',
      /* Placeholder THAY CHO câu `Ngăn cách bằng dấu phẩy` (đã xoá): dấu phẩy nằm ngay trong ví
         dụ, và dãy thẻ dưới ô nhập cho thấy chuỗi vừa gõ được tách ra thành gì. */
      techStackPlaceholder: 'React, TypeScript, PostgreSQL',
      domains: 'Lĩnh vực quan tâm',
      domainsPlaceholder: 'Fintech, Hệ phân tán',
      unset: 'Chưa chọn',
      save: 'Lưu hồ sơ',
      edit: 'Chỉnh sửa',
      cancel: 'Huỷ',
      discard: 'Huỷ thay đổi',
      unsaved: 'Có thay đổi chưa lưu',
      saved: 'Đã lưu',
      loadError: 'Không tải được hồ sơ nghề nghiệp',
      saveError: 'Không lưu được hồ sơ',
    },
    tokens: {
      title: 'Token truy cập cá nhân',
      /* Ở lại trên màn hình bất kể có token hay chưa. Trước đây `emptyDesc` là chỗ DUY NHẤT nói
         token dùng để làm gì, nên lời giải thích biến mất ngay khi người dùng tạo token đầu
         tiên — đúng lúc họ vẫn còn cần nó. */
      sectionHint: 'Token để plugin Obsidian đồng bộ với thư viện của bạn. Trỏ plugin về ${url}.',
      create: 'Tạo token',
      createTitle: 'Tạo token truy cập',
      createHint: 'Dùng cho ứng dụng ngoài (plugin Obsidian) để đồng bộ ghi chú.',
      createdTitle: 'Đã tạo token',
      onceWarning:
        'Đây là lần DUY NHẤT token được hiển thị. Sao chép và cất giữ ngay — không xem lại được.',
      name: 'Tên token',
      nameHint: 'Đặt tên để sau này biết token nào của thiết bị nào.',
      permission: 'Quyền',
      /* Backend không có endpoint PATCH cho token nên đây đúng là vĩnh viễn. Nói thẳng ra vẫn
         hơn để người dùng đi tìm nút sửa chưa từng được viết. */
      permissionLocked:
        'Không đổi được quyền sau khi tạo — muốn đổi thì thu hồi token này rồi tạo token mới.',
      expiry: 'Hạn dùng',
      expiryHint: 'Hạn ngắn giúp giới hạn thiệt hại nếu token lỡ bị lộ.',
      expiry30: '30 ngày',
      expiry90: '90 ngày',
      expiry365: '1 năm',
      expiryNever: 'Không hết hạn',
      copy: 'Sao chép',
      copied: 'Đã sao chép',
      /* Trình duyệt có thể từ chối quyền clipboard. Trước đây lỗi rơi vào catch rỗng nên nút
         không phản ứng gì — không phân biệt được với một cú bấm thành công, mà token thì mất
         ngay khi đóng dialog. */
      copyFailed: 'Không sao chép được — hãy bôi đen chuỗi trên và copy thủ công.',
      done: 'Xong',
      cancel: 'Huỷ',
      closeUncopiedTitle: 'Chưa sao chép token',
      closeUncopiedDesc:
        'Bạn chưa sao chép token này. Đóng lại là mất vĩnh viễn — muốn có token khác thì phải thu hồi token này và tạo token mới.',
      closeUncopiedCancel: 'Quay lại sao chép',
      closeUncopiedConfirm: 'Vẫn đóng',
      nextSteps: 'Bước tiếp theo',
      nextStep1: 'Mở phần cài đặt của plugin Obsidian.',
      nextStep2: 'Dán token này vào ô API token.',
      nextStep3: 'Đặt địa chỉ máy chủ là ${url}.',
      revoke: 'Thu hồi',
      revokeAria: 'Thu hồi token ${name}',
      revokeTitle: 'Thu hồi token này?',
      revokeDesc:
        'Ứng dụng đang dùng "${name}" sẽ ngừng đồng bộ ngay lập tức. Không khôi phục được — bạn sẽ phải tạo token mới và cài đặt lại ứng dụng đó.',
      revokeCancel: 'Giữ token',
      revokeConfirm: 'Thu hồi',
      createdOn: 'Tạo ngày ${date}',
      lastUsed: 'Dùng lần cuối ${date}',
      neverUsed: 'Chưa từng được dùng',
      expiresOn: 'Hết hạn ${date}',
      expiresInDays: 'Hết hạn sau ${days} ngày',
      expiresToday: 'Hết hạn hôm nay',
      expired: 'Đã hết hạn',
      expiredHint: 'Thu hồi để dọn danh sách.',
      neverExpires: 'Không hết hạn',
      emptyTitle: 'Chưa có token nào',
      emptyDesc: 'Tạo token để ứng dụng ngoài đồng bộ được thư viện của bạn.',
      loadError: 'Không tải được danh sách token',
      createError: 'Không tạo được token',
      revokeError: 'Không thu hồi được token',
    },
    explain: {
      viewSource: 'Xem bài gốc',
      action: 'Giải thích bằng AI',
      working: 'Đang nhờ AI giải thích...',
      retry: 'Thử lại',
      regenerate: 'Tạo lại',
      save: 'Lưu vào thư viện',
      saved: 'Đã lưu',
      saveError: 'Không lưu được giải thích',
      error: 'Không tạo được giải thích',
      // 429 từ endpoint explain (B32) — bấm lại chỉ tốn nốt lượt còn lại để lỗi y hệt, nên nhánh
      // này không có nút "Thử lại".
      rateLimited: 'AI đang quá tải hoặc đã hết lượt lúc này — thử lại sau ít phút.',
      // 503 — Gemini quá tải/timeout. Đo 30/08: có lúc kéo dài nhiều phút nên không hứa "giây
      // lát"; vẫn giữ nút "Thử lại" vì đây là lỗi thoáng qua, không phải tường quota.
      unavailable: 'AI đang quá tải, chưa tạo được giải thích lúc này. Thử lại sau ít phút.',
      profileRequired: 'Cần có hồ sơ nghề nghiệp trước khi dùng AI giải thích.',
      profileRequiredCta: 'Thiết lập hồ sơ nghề nghiệp',
      byAi: 'Giải thích bằng AI',
      byAiNote: 'Nội dung do mô hình sinh ra — hãy tự kiểm chứng',
      collapse: 'Thu gọn',
      expand: 'Mở lại',
      dismiss: 'Bỏ giải thích này',
      complexity: 'Độ khó ${score}/10',
      version: 'Bản ${version}',
      concepts: 'Khái niệm',
      prerequisites: 'Cần biết trước',
      links: 'Đọc thêm',
      /* Tạo lại là tốn quota Gemini. Không kèm ghi chú nói chỗ nào chưa ổn thì lần gọi thứ hai
         hỏi đúng câu cũ và trả tiền cho đúng câu trả lời cũ — `feedbackNote` nằm sẵn trên
         `ExplainRequestDto` từ đầu mà không ai gửi. */
      feedbackLabel: 'Chỗ nào chưa rõ?',
      feedbackPlaceholder: 'Ví dụ: phần cache còn trừu tượng, cho mình ví dụ code',
      feedbackHint: 'Không bắt buộc, nhưng tạo lại mà không có nó thường ra đúng kết quả cũ.',
      feedbackSubmit: 'Tạo lại',
      feedbackCancel: 'Huỷ',
      download: 'Tải về .md',
      /* Công tắc này làm hiện ra một quyết định mà sản phẩm vẫn đang tự quyết trong im lặng: mô
         hình có được biết người đọc đã ghi chú về những gì hay không. */
      useVault: 'Dùng ghi chú trong vault',
      useVaultOn: 'AI sẽ thấy tên file, thẻ và liên kết của ghi chú — không thấy nội dung.',
      useVaultOff: 'Giải thích thuần, không tham chiếu tới những gì bạn đã ghi chú.',
      referencedNotes: {
        title: 'Dựa trên ${count} ghi chú trong Vault của bạn',
        desc: 'Những ghi chú trong vault mà câu trả lời này có tham chiếu tới.',
        concept: 'khái niệm: ${concept}',
      },
    },
    library: {
      title: 'Giải thích đã lưu',
      count: '${count} giải thích đã lưu',
      emptyTitle: 'Thư viện còn trống',
      emptyDesc: 'Giải thích một bài viết rồi lưu lại, nó sẽ nằm ở đây.',
      loadError: 'Không tải được thư viện',
      countFiltered: '${count} trong ${total} giải thích đã lưu',
      categoryLabel: 'Lọc theo chủ đề',
      allCategories: 'Tất cả chủ đề',
      emptyCategoryTitle: 'Chủ đề này chưa lưu gì',
      emptyCategoryDesc: 'Chọn chủ đề khác để xem phần còn lại trong thư viện.',
    },
    /**
     * Tải một bản giải thích về dạng file `.md`, dành cho người không cài plugin.
     *
     * Template được áp Ở ĐÂY, trong trình duyệt. Template lưu phía server chỉ có nghĩa nếu plugin
     * Obsidian đọc nó, mà `/sync/pull` trả JSON chứ không trả markdown — người ráp file là
     * plugin, và plugin nằm ở một repo khác.
     */
    export: {
      title: 'Mẫu file Markdown khi tải về',
      desc: 'Áp dụng cho các file .md tải từ trang này. Chỉ lưu trong trình duyệt này.',
      templateLabel: 'Mẫu',
      /* Placeholder viết kiểu `{{name}}`, cố ý KHÔNG dùng `${name}`: hàm `interpolate` của i18n
         sẽ nuốt mất `${...}` ngay trong chính dòng hint này và in ra rỗng. */
      templateHint: 'Placeholder: ${placeholders}',
      reset: 'Về mặc định',
      saved: 'Đã lưu mẫu',
    },
    /**
     * Ghi chú mà plugin Obsidian đã đẩy lên.
     *
     * Trước khi có màn này, `push` lưu tối đa 500 note mỗi lần gọi mà không có chỗ nào cho chính
     * chủ nhân của chúng xem hay xoá. Chữ ở đây bám vào việc nói đúng sự thật: đây là BẢN SAO TRÊN
     * MÁY CHỦ, xoá nó không đụng vào vault của người dùng, và plugin sẽ đẩy note đó lên lại ở lần
     * đồng bộ kế tiếp.
     */
    vault: {
      title: 'Ghi chú đã đồng bộ',
      desc: 'Những gì plugin Obsidian đã đẩy lên máy chủ. AI dùng tên file, thẻ và liên kết của chúng làm ngữ cảnh — không bao giờ dùng nội dung note.',
      count: '${count} ghi chú',
      view: 'Xem',
      viewAria: 'Xem ${name}',
      delete: 'Xoá',
      deleteAria: 'Xoá ${name} khỏi máy chủ',
      deleteTitle: 'Xoá ghi chú này khỏi máy chủ?',
      deleteDesc:
        'Xoá bản sao của "${name}" trên máy chủ. Vault của bạn không bị đụng tới — và plugin sẽ đẩy note này lên lại ở lần đồng bộ sau, trừ khi bạn ngừng đồng bộ nó ở phía đó.',
      deleteCancel: 'Giữ lại',
      deleteConfirm: 'Xoá',
      deleteAll: 'Xoá tất cả',
      deleteAllTitle: 'Xoá toàn bộ ghi chú đã đồng bộ?',
      deleteAllDesc:
        'Xoá bản sao trên máy chủ của cả ${count} ghi chú. Vault của bạn không bị đụng tới, và một token quyền hai chiều sẽ đẩy tất cả lên lại ở lần đồng bộ sau.',
      deleteAllConfirm: 'Xoá tất cả',
      deleted: 'Đã xoá ${count} ghi chú',
      loadMore: 'Tải thêm',
      noTags: 'Không có thẻ',
      syncedOn: 'Đồng bộ ${date}',
      emptyTitle: 'Chưa đồng bộ gì',
      emptyDesc:
        'Ghi chú sẽ xuất hiện ở đây sau khi một token quyền hai chiều đẩy chúng lên từ vault của bạn.',
      loadError: 'Không tải được danh sách ghi chú',
      noteError: 'Không mở được ghi chú đó',
      deleteError: 'Không xoá được ghi chú',
      viewLabel: 'Chế độ xem',
      viewList: 'Danh sách',
      viewGraph: 'Sơ đồ liên kết',
      graph: {
        ariaLabel: 'Sơ đồ liên kết giữa các ghi chú đã đồng bộ',
        openNoteAria: 'Xem ghi chú ${name}',
        unresolvedLinks: '${count} liên kết trỏ tới ghi chú chưa đồng bộ',
        truncated:
          'Đã tải ${count} ghi chú đầu tiên — vault còn nhiều hơn, sơ đồ có thể chưa đầy đủ.',
      },
    },
    /**
     * Bộ lọc thẻ: ghi chú nào trong vault được phép vào ngữ cảnh AI.
     *
     * VÌ SAO CẦN CHỮ CẨN THẬN Ở ĐÂY. Trước khi có bộ lọc, lựa chọn duy nhất người dùng có là nhị
     * phân và nằm ở chỗ khác hẳn: token có quyền hai chiều hay không. Ai muốn AI thấy ghi chú kỹ
     * thuật nhưng không thấy nhật ký cá nhân thì chỉ còn cách ngừng đồng bộ cả vault.
     *
     * "LOẠI TRỪ THẮNG" PHẢI NÓI THÀNH LỜI, không để người dùng tự suy ra. Một note vừa mang thẻ
     * được chọn ở ô trên vừa mang thẻ ở ô dưới thì bị loại — nếu ngược lại, một lựa chọn rộng ở ô
     * trên sẽ âm thầm phá một quyết định hẹp ở ô dưới, đúng kiểu lỗi tai hại nhất với quyền riêng
     * tư.
     *
     * Thẻ được lưu KHÔNG có dấu `#` và viết thường — máy chủ tự chuẩn hoá khi ghi.
     */
    vaultFilter: {
      title: 'Ghi chú nào AI được dùng',
      desc: 'Chọn theo thẻ. Không chọn gì nghĩa là mọi ghi chú đã đồng bộ đều được dùng — như trước khi có mục này.',
      includeLabel: 'Chỉ dùng ghi chú có thẻ',
      includeHint: 'Để trống nghĩa là không giới hạn.',
      excludeLabel: 'Không bao giờ dùng ghi chú có thẻ',
      excludeHint: 'Luôn thắng ô trên: note vừa được chọn ở trên vừa bị loại ở đây thì bị loại.',
      allowAll: 'Hiện tại: mọi ghi chú đã đồng bộ đều được dùng.',
      summaryInclude: 'Chỉ ghi chú mang một trong ${tags}.',
      summaryExclude: 'Bỏ qua ghi chú mang ${tags}.',
      save: 'Lưu bộ lọc',
      saving: 'Đang lưu…',
      saved: 'Đã lưu bộ lọc',
      clear: 'Bỏ lọc',
      /* Bấm vào thẻ đang bật để tắt — nói ra vì chip trông giống nhãn tĩnh hơn là nút. */
      toggleAria: '${tag} — bấm để đổi',
      loadError: 'Không tải được bộ lọc',
      saveError: 'Không lưu được bộ lọc',
      emptyTitle: 'Chưa có thẻ nào để lọc',
      emptyDesc:
        'Bộ lọc chạy theo thẻ trong ghi chú. Khi vault đẩy lên ghi chú có thẻ, chúng sẽ hiện ở đây.',
    },
    seniority: {
      JUNIOR: 'Junior',
      MID: 'Middle',
      SENIOR: 'Senior',
      LEAD: 'Lead',
      PRINCIPAL: 'Principal',
    },
    primaryRole: {
      BACKEND: 'Backend',
      FRONTEND: 'Frontend',
      FULLSTACK: 'Fullstack',
      MOBILE: 'Mobile',
      DEVOPS: 'DevOps',
      DATA_ML: 'Data / ML',
      SECURITY: 'Bảo mật',
      QA: 'QA',
      OTHER: 'Khác',
    },
    explanationStyle: {
      CONCISE: 'Ngắn gọn',
      DETAILED: 'Chi tiết',
      CODE_HEAVY: 'Nhiều ví dụ code',
      ANALOGY_HEAVY: 'Nhiều ví von',
    },
    /**
     * NHÃN MÔ TẢ HÀNH VI, VÀ HÀNH VI ĐÓ LỚN HƠN "CHIỀU ĐỒNG BỘ".
     *
     * `ExplanationService.loadVaultContext` trả null trừ khi người dùng có ít nhất một token
     * BIDIRECTIONAL, nên trường này còn là công tắc bật/tắt "AI có được nhìn vault của tôi hay
     * không". Trước đây không có chữ nào trong UI nói điều đó. Nhãn dài nói ra.
     */
    vaultPermission: {
      WRITE_ONLY: 'Một chiều — chỉ tải giải thích về vault',
      BIDIRECTIONAL: 'Hai chiều — vault gửi ghi chú lên, AI dùng làm ngữ cảnh',
    },
    /** Dùng cho badge trong danh sách, nơi không đủ chỗ cho cả câu. */
    vaultPermissionShort: {
      WRITE_ONLY: 'Một chiều',
      BIDIRECTIONAL: 'Hai chiều',
    },
    vaultPermissionDesc: {
      WRITE_ONLY:
        'App không đọc gì từ vault. AI sẽ giải thích mà không biết bạn đã ghi chú những gì.',
      BIDIRECTIONAL:
        'Tên file, thẻ và liên kết của ghi chú sẽ được gửi cho AI làm ngữ cảnh (không gửi nội dung note).',
    },
  },

  friends: {
    title: 'Bạn bè',
    all: {
      title: 'Tất cả bạn bè',
      subtitle: '${count} bạn bè',
      empty: {
        title: 'Chưa có bạn bè',
        desc: 'Những người bạn kết nối sẽ xuất hiện ở đây.',
      },
      allLoaded: 'Bạn đã xem hết danh sách bạn bè',
      unfriend: 'Huỷ kết bạn',
      unfriendAria: 'Huỷ kết bạn với ${name}',
      unfriendTitle: 'Huỷ kết bạn?',
      unfriendDesc: 'Bạn và ${name} sẽ không còn là bạn bè. Có thể gửi lời mời lại bất cứ lúc nào.',
      unfriendCancel: 'Giữ kết bạn',
      unfriendConfirm: 'Huỷ kết bạn',
      unfriendError: 'Không thể huỷ kết bạn',
    },
    suggestions: {
      title: 'Gợi ý kết bạn',
      subtitle: 'Những người bạn có thể biết',
      addFriend: 'Thêm bạn bè',
      ignore: 'Bỏ qua',
      requestSent: 'Đã gửi lời mời',
      suggestedForYou: 'Gợi ý cho bạn',
      mutualFriends: '${count} bạn chung',
      empty: {
        title: 'Không có gợi ý nào',
        desc: 'Chúng tôi sẽ gợi ý thêm bạn bè khi có người phù hợp với bạn.',
      },
    },
    requests: {
      title: 'Lời mời kết bạn',
      subtitle: 'Quản lý lời mời kết bạn của bạn',
      tabReceived: 'Đã nhận',
      tabSent: 'Đã gửi',
      confirm: 'Xác nhận',
      delete: 'Xóa',
      cancelRequest: 'Hủy lời mời',
      awaiting: 'Đang chờ phản hồi',
      receivedEmpty: {
        title: 'Không có lời mời nào',
        desc: 'Khi ai đó gửi lời mời kết bạn cho bạn, chúng sẽ xuất hiện ở đây.',
      },
      sentEmpty: {
        title: 'Chưa gửi lời mời nào',
        desc: 'Các lời mời kết bạn bạn đã gửi sẽ xuất hiện ở đây.',
      },
    },
    action: {
      sendError: 'Không thể gửi lời mời kết bạn',
    },
  },

  ledger: {
    label: 'Tóm lược',
    evidence: 'Năng lực',
    // Hai nhãn cho cùng một thẻ: `matched` khi `GET /projects/suggested` xếp hạng được theo hồ sơ
    // nghề nghiệp của người đọc, `hiring` khi danh sách rơi về "mới nhất còn tuyển" — xem
    // `OpeningsSection`. Không dùng chung một nhãn: gọi danh sách chưa xếp hạng là "phù hợp" là
    // một lời hứa dữ liệu không đỡ nổi.
    matched: 'Phù hợp với bạn',
    matchedOn: 'Khớp:',
    hiring: 'Đang tuyển',
    external: 'Từ bên ngoài',
    contributions: 'đóng góp',
    recentWeeks: '18 tuần gần nhất',
  },

  moderationMine: {
    title: 'Vi phạm & khiếu nại',
    tabs: {
      violations: 'Vi phạm của tôi',
      appeals: 'Khiếu nại',
    },
    loadError: 'Không tải được lịch sử kiểm duyệt của bạn',
    emptyTitle: 'Chưa có ghi nhận nào',
    emptyDesc: 'Khi một bài của bạn bị gỡ, ghi nhận và quyền khiếu nại sẽ xuất hiện ở đây.',
    appealsEmptyTitle: 'Chưa có khiếu nại nào',
    appealsEmptyDesc: 'Khiếu nại bạn gửi từ tab vi phạm sẽ hiện ở đây kèm kết quả.',
    appeal: 'Khiếu nại',
    appealPending: 'Đã gửi khiếu nại, đang chờ xét',
    appealsTitle: 'Khiếu nại của bạn',
    appealTitle: 'Gửi khiếu nại',
    appealDesc: 'Nói rõ vì sao bạn cho rằng quyết định này chưa đúng. Một người sẽ đọc và trả lời.',
    reasonLabel: 'Lý do khiếu nại',
    reasonPlaceholder: 'Bài này nói về... và không vi phạm vì...',
    submitAppeal: 'Gửi khiếu nại',
    cancel: 'Huỷ',
    submitError: 'Không gửi được khiếu nại. Vui lòng thử lại.',
    status: {
      PENDING: 'Đang chờ xét',
      APPROVED: 'Đã chấp nhận',
      REJECTED: 'Đã từ chối',
    },
  },
  projects: {
    matching: {
      // Từ B26, backend chấm điểm và sắp theo `matchScore` — đây là một bảng xếp hạng thật,
      // không còn là tập không thứ tự nữa, nên nhãn đổi từ "đã có N người" sang "phù hợp nhất".
      title: '${count} người phù hợp nhất với vị trí này',
      score: '${score} điểm phù hợp',
      years: '${count} năm',
      unnamedRole: 'Chưa đặt chức danh',
      more: 'và ${count} người nữa',
    },
    suggested: {
      title: 'Dự án phù hợp với bạn',
      subtitle: 'Xếp theo kỹ năng và lĩnh vực bạn quan tâm trong hồ sơ nghề nghiệp.',
    },
    allTitle: 'Tất cả dự án',
    title: 'Dự án',
    tabs: {
      board: 'Bảng dự án',
      mine: 'Đơn của tôi',
    },
    loadError: 'Không tải được danh sách dự án',
    emptyTitle: 'Chưa có dự án nào',
    emptyDesc: 'Hãy là người đầu tiên đăng một dự án và mở vị trí tuyển.',
    openPositions: '${count} vị trí đang mở',
    quantity: 'Cần ${count} người',
    backToBoard: 'Về bảng dự án',
    apply: 'Ứng tuyển',
    applyTitle: 'Ứng tuyển · ${title}',
    applyDesc: 'Nói ngắn gọn bạn làm được gì cho vị trí này. Chủ dự án sẽ đọc đúng đoạn này.',
    messageLabel: 'Nội dung ứng tuyển',
    messagePlaceholder: 'Tôi đã làm... và có thể nhận phần...',
    submitApplication: 'Gửi đơn',
    applyError: 'Không gửi được đơn. Vị trí có thể đã đóng.',
    cancel: 'Huỷ',
    accept: 'Nhận',
    reject: 'Từ chối',
    decisionError: 'Không xử lý được đơn này. Có thể vị trí vừa đủ người.',
    status: {
      OPEN: 'Đang mở',
      CLOSED: 'Đã đóng',
      COMPLETED: 'Đã hoàn thành',
    },
    positionStatus: {
      OPEN: 'Đang mở',
      FILLED: 'Đã đủ người',
      CLOSED: 'Đã đóng',
    },
    applicationStatus: {
      PENDING: 'Đang chờ',
      ACCEPTED: 'Đã nhận',
      REJECTED: 'Đã từ chối',
      REMOVED: 'Đã bị loại',
    },
    manage: {
      edit: 'Sửa',
      save: 'Lưu thay đổi',
      editTitle: 'Sửa dự án',
      editDesc: 'Đổi tên, mô tả, ảnh bìa và thẻ. Các vị trí được quản lý riêng ở dưới.',
      editError: 'Không lưu được thay đổi. Vui lòng thử lại.',
      changeStatus: 'Trạng thái dự án',
      completedFinal: 'Dự án đã hoàn thành thì không mở lại được.',
      completeConfirmTitle: 'Đánh dấu dự án đã hoàn thành?',
      completeConfirmDesc:
        'Thao tác này không thể hoàn tác — dự án đã hoàn thành không thể mở lại, không sửa được và không nhận đơn mới.',
      completeConfirm: 'Đánh dấu hoàn thành',
      statusError: 'Không đổi được trạng thái. Vui lòng thử lại.',
      delete: 'Xoá',
      deleteConfirmTitle: 'Xoá dự án này?',
      deleteConfirmDesc:
        'Dự án, mọi vị trí và mọi đơn ứng tuyển sẽ bị xoá vĩnh viễn, và điểm uy tín mà các thành viên đã nhận cũng bị gỡ. Không thể hoàn tác.',
      deleteError: 'Không xoá được dự án. Vui lòng thử lại.',
      addRole: 'Thêm vị trí',
      editRole: 'Sửa vị trí',
      roleSaveError: 'Không lưu được vị trí. Vui lòng thử lại.',
      roleStatusError: 'Không đổi được vị trí. Có thể vị trí đã đủ người.',
      positionQuantityLow: 'Không lưu được vị trí. Số lượng không thể ít hơn số người đã nhận.',
      positionHasMembers: 'Loại các thành viên đã nhận trước khi xoá vị trí này.',
      closeRole: 'Đóng vị trí',
      reopenRole: 'Mở lại vị trí',
      deleteRole: 'Xoá vị trí',
      deleteRoleConfirmTitle: 'Xoá vị trí này?',
      deleteRoleConfirmDesc:
        'Các đơn đang chờ và đã từ chối của vị trí này bị xoá kèm. Vị trí còn thành viên đã nhận thì không xoá được.',
      members: 'Thành viên',
      noMembers: 'Chưa có thành viên nào',
      membersError: 'Không tải được danh sách thành viên',
      unknownMember: 'Thành viên ẩn danh',
      removeMember: 'Loại',
      removeMemberConfirmTitle: 'Loại ${name}?',
      removeMemberConfirmDesc:
        'Người này bị loại khỏi mọi vị trí họ giữ trong dự án, điểm uy tín họ nhận khi tham gia bị gỡ, và vị trí họ lấp sẽ mở lại.',
      removeMemberError: 'Không loại được thành viên này. Vui lòng thử lại.',
      withdraw: 'Rút đơn',
      withdrawConfirmTitle: 'Rút đơn ứng tuyển này?',
      withdrawConfirmDesc:
        'Đơn sẽ bị xoá. Bạn có thể ứng tuyển lại khi vị trí còn mở, nhưng đó là một đơn mới.',
      withdrawError: 'Không rút được đơn. Có thể chủ dự án đã xử lý.',
    },
    detail: {
      positions: 'Vị trí tuyển',
      noPositions: 'Dự án này chưa mở vị trí nào',
      applications: 'Đơn ứng tuyển',
      noApplications: 'Chưa có ai ứng tuyển',
      applicationsError: 'Không tải được đơn ứng tuyển',
      notFoundTitle: 'Không tìm thấy dự án',
      notFoundDesc: 'Dự án này không tồn tại hoặc đã bị gỡ.',
    },
    mine: {
      loadError: 'Không tải được đơn của bạn',
      emptyTitle: 'Bạn chưa ứng tuyển vị trí nào',
      emptyDesc: 'Đơn bạn gửi và kết quả sẽ hiện ở đây.',
    },
    create: {
      action: 'Đăng dự án',
      title: 'Đăng dự án mới',
      desc: 'Mô tả dự án và các vị trí bạn cần. Vị trí không sửa được sau khi đăng.',
      projectTitle: 'Tên dự án',
      projectTitlePlaceholder: 'Ví dụ: Nền tảng học tiếng Việt cho lập trình viên',
      description: 'Mô tả dự án',
      descriptionPlaceholder: 'Dự án làm gì, đang ở giai đoạn nào, cần gì ở người tham gia...',
      positions: 'Vị trí tuyển',
      positionsNote:
        'Không có endpoint sửa hay thêm vị trí sau khi đăng — danh sách này là cuối cùng.',
      positionTitle: 'Tên vị trí',
      positionTitlePlaceholder: 'Ví dụ: Backend Engineer',
      positionDescription: 'Mô tả vị trí',
      positionDescriptionPlaceholder: 'Người này sẽ làm gì (không bắt buộc)',
      positionQuantity: 'Số lượng',
      positionQuantityHint: 'Số người cần cho vị trí này.',
      skills: 'Kỹ năng yêu cầu',
      skillsPlaceholder: 'Kỹ năng, cách nhau bằng dấu phẩy: Kotlin, PostgreSQL',
      addPosition: 'Thêm vị trí',
      removePosition: 'Bỏ vị trí',
      tags: 'Thẻ chủ đề',
      tagsPlaceholder: 'Không bắt buộc, cách nhau bằng dấu phẩy: Blockchain, Fintech',
      banner: 'Ảnh bìa',
      bannerAdd: 'Tải ảnh bìa',
      bannerRemove: 'Xoá ảnh bìa',
      bannerInvalid: 'Dùng ảnh JPEG, PNG hoặc WEBP dưới 20MB.',
      submit: 'Đăng dự án',
      error: 'Không đăng được dự án. Vui lòng thử lại.',
    },
  },
  blocks: {
    block: 'Chặn',
    unblock: 'Bỏ chặn',
    cancel: 'Huỷ',
    title: 'Người bạn đã chặn',
    confirmTitle: 'Chặn ${name}?',
    confirmDesc:
      'Hai người sẽ không thấy bài viết của nhau, và tình bạn hiện có sẽ bị xoá — bỏ chặn sau này không khôi phục lại tình bạn đó.',
    blockError: 'Không chặn được người này. Vui lòng thử lại.',
    unblockError: 'Không bỏ chặn được người này. Vui lòng thử lại.',
    loadError: 'Không tải được danh sách đã chặn',
    emptyTitle: 'Bạn chưa chặn ai',
    emptyDesc: 'Người bạn chặn sẽ biến mất khỏi bảng tin, tìm kiếm và danh sách bạn bè của bạn.',
    unknownUser: 'Người dùng',
  },
  /* MỘT BỘ CHỦ ĐỀ, BA MIỀN. `LearningCategory` là enum trong `com.socialapp.common.enums`, được
     sách (`library`), bản giải thích AI đã lưu (`knowledge`) và lộ trình (`roadmap`) dùng chung,
     nên chín nhãn viết một lần ở đây thay vì ba lần trong ba khối. Mỗi feature tự khai KIỂU của
     riêng nó — lý do nằm ở ghi chú `LearningCategory` bên `bookstore` — nhưng thứ thực sự dễ lệch
     là chữ, và file này là chỗ chặn điều đó.

     `OTHER` là `Khác`, không phải `Chưa phân loại`: mọi hàng có trước khi cột này tồn tại đều mang
     giá trị đó, nên đây là một kệ có sách thật, và đọc như một chủ đề thì đúng hơn là như một lời
     thú nhận. */
  learningCategory: {
    BACKEND: 'Backend',
    FRONTEND: 'Frontend',
    MOBILE: 'Mobile',
    DEVOPS: 'DevOps',
    DATA_ML: 'Data / ML',
    SECURITY: 'Bảo mật',
    QA: 'QA',
    CAREER: 'Nghề nghiệp',
    OTHER: 'Khác',
  },

  library: {
    tabs: {
      browse: 'Duyệt sách',
      purchased: 'Sách đã mua',
      mine: 'Sách tôi đăng',
    },
    title: 'Thư viện',
    owned: 'Đã sở hữu',
    loadError: 'Không thể tải thư viện',
    storageError: 'Không tải được sách: kho lưu trữ tệp đang không truy cập được.',
    emptyTitle: 'Thư viện còn trống',
    emptyDesc: 'Khi có người đăng sách, sách sẽ xuất hiện ở đây.',
    categoryLabel: 'Lọc theo chủ đề',
    allCategories: 'Tất cả chủ đề',
    emptyCategoryTitle: 'Chủ đề này chưa có sách',
    emptyCategoryDesc: 'Thử một chủ đề khác, hoặc xem tất cả.',
    purchasedLoadError: 'Không thể tải sách đã mua',
    purchasedEmptyTitle: 'Bạn chưa mua cuốn sách nào',
    purchasedEmptyDesc: 'Sách bạn mua sẽ xuất hiện ở đây, kể cả khi bạn đọc lại sau này.',
  },

  bookDetail: {
    /* Accessible name for each bar in the rating breakdown — the bars became real
       `ProgressBar`s (report B002) and a progressbar needs a label. */
    ratingBarLabel: '${stars} sao',
    back: 'Về thư viện',
    untitled: 'Sách chưa đặt tên',
    pages: 'Số trang',
    pageCount: '${count} trang',
    size: 'Dung lượng tệp',
    downloads: 'Lượt tải',
    reviewsTitle: 'Đánh giá',
    // "Không xem được" chứ không phải "không tồn tại": endpoint trả 404 cho sách đã xoá và 503
    // cho sách còn đó nhưng tệp trong kho đã mất — trang không phân biệt được, nên không đoán.
    notFoundTitle: 'Không xem được sách này',
    notFoundDesc: 'Sách có thể đã bị gỡ, hoặc tệp của nó đang không truy cập được.',
  },

  publicProfile: {
    /* Ba tab — Bài viết, Kỹ năng, GitHub — theo Plate 03 của atlas. Bài viết đứng đầu vì người lạ
       theo link được chia sẻ vào để xem người này viết gì, không phải xem bản tóm tắt. */
    tabs: {
      posts: 'Bài viết',
      skills: 'Kỹ năng',
      github: 'GitHub',
    },
    skillsTitle: 'Kỹ năng đã xác minh',
    reputationTitle: 'Uy tín',
    postsEmpty: 'Không có bài viết nào bạn xem được',
    postsError: 'Không tải được bài viết',
    notFoundTitle: 'Không tìm thấy người này',
    notFoundDesc: 'Không có tài khoản nào với tên @${username}.',
  },

  reputation: {
    remaining: 'còn',
    title: 'Elite Score',
    desc: 'Điểm uy tín tích luỹ từ đóng góp của bạn',
    // Bản cho trang cá nhân người khác — "của bạn" ở đó là gán nhầm điểm của người ta cho người đọc.
    descOther: 'Điểm uy tín tích luỹ từ đóng góp của người này',
    verifiedExpert: 'Chuyên gia đã xác minh',
    toNextLevel: 'Còn ${remaining} điểm nữa để đạt ${next}',
    topLevel: 'Bạn đã ở cấp cao nhất',
  },

  profile: {
    network: {
      title: 'Mạng lưới của bạn',
      viewAll: 'Tất cả bạn bè',
    },
    /* Khối chữ trong hero, dùng chung cho `/profile` và `/u/{username}` vì hai route dựng cùng một
       `ProfileHero`. Nằm dưới `profile` chứ không phải `publicProfile`: `publicProfile` là không
       gian của riêng màn người lạ, mà mấy chuỗi này thì cả hai màn đều in. */
    hero: {
      joined: 'Tham gia ${date}',
      verifiedSkills: '${count} kỹ năng đã xác minh',
    },
    /* Vốn là `dashboard.stats.*`, chuyển sang đây khi xoá `/dashboard`. Route đó đã bị `/profile`
       hấp thụ từ P5.2 và bản redirect giữ URL cũ nay cũng đã gỡ, nên một khối `dashboard` ở cấp
       cao nhất là tiêu đề cho một trang không còn tồn tại. */
    stats: {
      friends: 'Bạn bè',
      friendsDesc: 'Tổng kết nối',
      pending: 'Đang chờ',
      pendingDesc: 'Lời mời kết bạn',
    },
    books: {
      title: 'Sách của bạn',
      loadError: 'Không thể tải sách của bạn',
      emptyTitle: 'Chưa có sách nào',
      emptyDesc: 'Sách bạn đăng từ trình soạn bài sẽ hiện ở đây.',
      // Trên hồ sơ người khác: người đọc không đăng sách hộ được.
      emptyDescOther: 'Người này chưa xuất bản cuốn sách nào.',
      titleOther: 'Sách đã xuất bản',
      delete: 'Xoá',
      deleteAria: 'Xoá ${title}',
      deleteTitle: 'Xoá cuốn sách này?',
      deleteDesc: '“${title}” sẽ bị gỡ với tất cả mọi người. Không thể hoàn tác.',
      deleteCancel: 'Huỷ',
      deleteConfirm: 'Xoá sách',
      deleteError: 'Không thể xoá cuốn sách này',
    },
    skills: {
      title: 'Kỹ năng của bạn',
      /* Ba mục của tab `Chuyên môn` xếp theo độ khó của lời tuyên bố: bạn tự nói mình làm gì →
         hệ thống đã xác minh được gì → mã nguồn của bạn cho thấy gì. Trước đây thứ tự ấy chỉ có
         trong bình luận của tệp nguồn; hai câu này (và `professionalHint`) nói nó ra thành lời. */
      desc: 'Những gì đã được xác minh, kèm cả yêu cầu đang chờ duyệt.',
      loadError: 'Không thể tải kỹ năng của bạn',
      emptyTitle: 'Chưa ghi nhận kỹ năng nào',
      emptyDesc: 'Ghi nhận một kỹ năng từ lộ trình, nó sẽ hiện ở đây.',
      // Người xem hồ sơ người khác không "ghi nhận kỹ năng" hộ được, nên câu hướng dẫn kia sai đối tượng.
      emptyDescOther: 'Người này chưa có kỹ năng nào được xác minh.',
      browseRoadmaps: 'Xem lộ trình',
      status: {
        verified: 'Đã xác minh',
        pending: 'Đang chờ duyệt',
        rejected: 'Bị từ chối',
      },
    },
    github: {
      desc: 'Những gì mã nguồn công khai của bạn cho thấy.',
      moved: 'Kết nối, đồng bộ và huỷ liên kết GitHub giờ nằm trong Cài đặt.',
    },
    professionalHint: 'Trình giải thích dùng hồ sơ này để nói vừa tầm bạn.',
    moderationPointer: 'Bài của bạn từng bị gỡ, và khiếu nại bạn đã gửi, giờ nằm ở trang riêng.',
    moderationPointerCta: 'Mở trang kiểm duyệt',
    /* `title` vẫn còn hai nơi đọc — tiêu đề tab trình duyệt trong `profile/layout.tsx` và
       `aria-label` của dải tab — nhưng không còn là tiêu đề hiển thị: `<h1>` của hero là tên
       người dùng. `subtitle` đi theo tiêu đề mà nó thuộc về; "quản lý cài đặt tài khoản" giờ chỉ
       mô tả một trong ba tab. */
    title: 'Trang cá nhân',
    uploadHint: 'Nhấp để tải ảnh mới lên (JPG, PNG, WebP, tối đa 5MB)',
    /* Ảnh bìa đi qua `POST /v1/api/media` chứ không phải endpoint ảnh đại diện, nên trần là 20MB
       chứ không phải 5MB — hai con số khác nhau vì hai endpoint khác nhau. Không nhắc GIF: kho
       media nhận GIF, nhưng ô chọn ảnh bìa thì không, lý do ghi trong `ProfileCoverControl`. */
    cover: {
      add: 'Thêm ảnh bìa',
      change: 'Đổi ảnh bìa',
      remove: 'Gỡ ảnh bìa',
      hint: 'JPG, PNG hoặc WebP, tối đa 20MB',
      error: 'Không đặt được ảnh bìa. Vui lòng thử lại.',
    },
    id: 'ID: ${id}',
    /* Trang chia làm ba tab, và đây không phải hai khoá cũ. `info` / `password` đặt tên cho một
       cặp tab chưa bao giờ dựng — hai biểu mẫu vẫn xếp chồng lên nhau và không nơi nào đọc hai
       khoá đó. Cách chia thay thế đúng với những gì trang có: hệ thống chấm bạn bao nhiêu · bạn
       chứng minh được mình làm gì · và bản thân tài khoản. */
    tabs: {
      overview: 'Tổng quan',
      professional: 'Chuyên môn',
      account: 'Tài khoản',
    },
    info: {
      title: 'Thông tin cá nhân',
      desc: 'Cập nhật tên hiển thị của bạn',
      fullname: 'Họ và tên',
      save: 'Lưu thay đổi',
      saving: 'Đang lưu...',
      saved: 'Đã lưu',
    },
    password: {
      title: 'Đổi mật khẩu',
      desc: 'Chọn mật khẩu mạnh để bảo vệ tài khoản của bạn',
      currentPassword: 'Mật khẩu hiện tại',
      currentPlaceholder: 'Nhập mật khẩu hiện tại',
      newPassword: 'Mật khẩu mới',
      newPlaceholder: 'Ít nhất 6 ký tự',
      confirm: 'Xác nhận mật khẩu',
      confirmPlaceholder: 'Nhập lại mật khẩu',
      update: 'Cập nhật mật khẩu',
      updating: 'Đang cập nhật...',
      updated: 'Đã đổi mật khẩu',
    },
  },

  chat: {
    messageUser: 'Nhắn tin',
    messageUserError: 'Không mở được cuộc trò chuyện. Vui lòng thử lại.',
    sayHi: 'Hãy chào để bắt đầu cuộc trò chuyện!',
    chats: 'Chats',
    search: 'Tìm trong tin nhắn',
    noConversations: 'Chưa có cuộc trò chuyện nào',
    all: 'Tất cả',
    unread: 'Chưa đọc',
    newChat: 'Tin nhắn mới',
    selectConversation: 'Chọn một cuộc trò chuyện',
    selectConversationDesc:
      'Chọn từ các cuộc trò chuyện hiện có, hoặc bắt đầu cuộc trò chuyện mới.',
    startNewChat: 'Bắt đầu cuộc trò chuyện mới',
    searchFriends: 'Tìm bạn bè...',
    noFriendsToMessage: 'Không có bạn bè để nhắn tin',
    addFriendsFirst: 'Thêm bạn bè trước để bắt đầu nhắn tin.',
    creating: 'Đang mở...',
    back: 'Quay lại',
    noResults: 'Không có kết quả',
    filterLabel: 'Lọc cuộc trò chuyện',
    unknownPerson: 'Người dùng',
    messagePlaceholder: 'Nhắn tin...',
    send: 'Gửi',
    attachFile: 'Đính kèm tệp',
    removeAttachment: 'Bỏ ${name}',
    attachmentUploading: 'Đang tải lên',
    attachmentFailed: 'Có tệp không tải lên được.',
    attachmentTooLarge: 'Tệp phải nhỏ hơn ${size} MB.',
    imageAttachment: 'Hình ảnh',
    fileAttachment: 'Tệp',
    loadError: 'Không mở được cuộc trò chuyện',
    connecting: 'Đang kết nối...',
    connectionError: 'Không kết nối được tới dịch vụ chat. Tải lại trang để thử lại.',
    unconfigured: 'Chat chưa được cấu hình trên máy chủ.',
    startFailed: 'Không mở được cuộc trò chuyện. Vui lòng thử lại.',
    peerNotReady:
      'Người này chưa dùng chat bao giờ nên chưa nhắn được. Nhờ họ mở mục Chats một lần.',
    newChatModeLabel: 'Kiểu cuộc trò chuyện',
    modeDirect: 'Một người',
    modeGroup: 'Nhóm',
    groupNamePlaceholder: 'Tên nhóm',
    createGroup: 'Tạo nhóm',
    groupSelected: 'Đã chọn ${count} người',
    groupNeedsMore: 'Chọn thêm ${count} người nữa',
    groupFailed: 'Không tạo được nhóm. Vui lòng thử lại.',
    info: {
      label: 'Thông tin cuộc trò chuyện',
      memberCount: '${count} thành viên',
      membersHeading: 'Thành viên',
      verifiedSkills: 'Kỹ năng đã xác minh',
      sharedImages: 'Ảnh · ${count}',
      sharedFiles: 'Tệp · ${count}',
      /* Nhãn cho ảnh đại diện đã thành link — chữ "Xem trang cá nhân" không hiện ra màn hình,
         nó là tên của cái link cho trình đọc màn hình, nên phải kèm tên người. */
      viewProfile: 'Xem trang cá nhân của ${name}',
    },
  },

  toast: {
    dismiss: 'Đóng',
  },

  session: {
    expiredTitle: 'Phiên đăng nhập đã hết hạn',
    expiredDesc: 'Để bảo mật tài khoản, bạn đã được đăng xuất. Đăng nhập lại để tiếp tục.',
    expiredCta: 'Đăng nhập lại',
  },
};
