export const en = {
  app: {
    name: 'Elite Nexus',
  },

  /* The route-level boundaries: `app/error.tsx`, `app/(main)/error.tsx` and `app/not-found.tsx`.
     `global-error.tsx` is NOT here and cannot be — it renders with the provider gone, so its
     copy is inlined there. Kept at the top of the bundle beside `app`, because these belong to
     the shell rather than to any one domain. */
  error: {
    title: 'Something broke on this screen',
    description:
      'The page could not finish rendering. Trying again usually works — your data is safe.',
    retry: 'Try again',
    goHome: 'Back to newsfeed',
    /* Printed only when React supplies one, which in practice means a production build. It is
       the only handle that ties this screen to a line in the server log. */
    digest: 'Error code: ${digest}',
  },

  /* The atlas's F4 sheet — HTTP status → what the reader sees — as copy. `ApiErrorNotice` renders
     these; `shared/lib/resolve-api-error.ts` decides which one a failure gets. Beside `error`
     because both are the shell's language for "this did not work", not any domain's.

     THE COPY NEVER BLAMES THE READER and never leaks the mechanism. "This did not load" and a
     retry, not "GET returned 500". The one place the backend's own sentence is shown is `generic`
     and `invalid`, where the server wrote something a person can act on. */
  apiError: {
    retry: 'Try again',
    network: {
      title: 'No response from the server',
      description: 'Check your connection and try again.',
    },
    auth: {
      title: 'Sign in to see this',
      description: 'This part needs an account.',
    },
    banned: {
      title: 'Your account is locked',
    },
    forbidden: {
      title: "This isn't available to you",
      description: 'Your account does not have access to this.',
    },
    notFound: {
      title: 'Not found',
      description: 'This does not exist, or it has been removed.',
    },
    conflict: {
      title: 'This changed while you were here',
      description: 'Someone updated it. Reload to see the current version.',
    },
    invalid: {
      title: 'Some of this needs fixing',
    },
    profileRequired: {
      title: 'Set up your professional profile first',
      description: 'The AI features and matching read it. It takes a minute.',
      cta: 'Set it up',
    },
    rateLimited: {
      title: 'Try again in a little while',
      description: 'That was a lot at once. Give it a moment.',
    },
    unavailable: {
      title: 'Temporarily unavailable',
      description: 'An outside service is down. Try again shortly.',
    },
    generic: {
      title: 'Something went wrong',
    },
  },

  /* The shared MediaUploader (`features/media`). One picker behind the composer's image grid, the
     profile cover, the skill-proof field and the project banner — so its copy is here, not folded
     into any one of those domains. Every message names a rule the server also enforces; the point
     is to fail in a sentence rather than a round trip. */
  mediaUploader: {
    add: 'Add image',
    replace: 'Replace',
    remove: 'Remove',
    failed: 'The upload did not go through. Try again.',
    wrongType: 'That file type is not supported.',
    fileTooLarge: 'That file is over the 20MB limit.',
    batchTooLarge: 'Those files are over the 25MB limit for one upload.',
    tooMany: 'Up to ${count} images.',
    cropTitle: 'Position the image',
    cropCancel: 'Cancel',
    cropConfirm: 'Use this',
  },

  /* `/settings/*` — the machinery-config hub. Six panels that used to be scattered across
     `/profile` and `/knowledge`; the hub is where "configure a thing" lives, so its copy is here
     rather than folded into either of those domains. */
  settings: {
    title: 'Settings',
    tabs: {
      notifications: 'Notifications',
      github: 'GitHub',
      tokens: 'Access tokens',
      vault: 'Vault',
      calendar: 'Calendar',
      picture: 'Picture',
    },
    notifications: {
      title: 'Notifications',
      desc: 'Which events reach you, and how.',
    },
    github: {
      title: 'GitHub',
      desc: 'Link your account so your contributions show on your profile.',
    },
    tokens: {
      title: 'Access tokens',
      desc: 'For the Obsidian vault client. A token is shown once — copy it then.',
    },
    vault: {
      title: 'Synced notes',
      desc: 'What the vault client has pushed, and which of it the AI may read.',
    },
    exportTemplate: {
      title: 'Export template',
      desc: 'The shape of the file the explanation download button produces.',
    },
    calendar: {
      title: 'Google Calendar',
      desc: 'Connect once so "Add to calendar" works on any event.',
      connected: 'Connected',
      notConnected: 'Not connected',
      connectHint: 'You will be sent to Google to authorise access, then back here.',
      reconnectHint:
        'A token can stop working without this changing. Reconnect if adding an event fails.',
      connect: 'Connect Google Calendar',
      reconnect: 'Reconnect',
    },
    picture: {
      avatarTitle: 'Avatar',
      avatarDesc: 'JPEG, PNG or WEBP, up to 5MB.',
      avatarChange: 'Change avatar',
      coverTitle: 'Cover image',
      coverDesc: 'The band behind your name on your profile.',
    },
  },

  /* Browser-tab titles, for the routes whose own copy makes a poor one. Read only by
     `core/i18n/server.ts`, never by a component — see the note there on why these are nouns
     rather than the page's heading: `auth.forgotPassword.title` is the question "Forgot
     password?", which is a fine heading and a strange tab, and a dynamic route's heading is a
     book or a person this layer never fetches. */
  meta: {
    login: 'Sign in',
    register: 'Sign up',
    forgotPassword: 'Reset your password',
    resetPassword: 'New password',
    magicLink: 'Magic link',
    verifyEmail: 'Verify email',
    /* Deliberately the KIND, not the item. Naming the post or the book would mean fetching it
       during server render, on a route whose data the client loads with the reader's own session;
       "Post · Elite Nexus" is honest and still tells the tabs apart from the feed. */
    post: 'Post',
    book: 'Book',
    project: 'Project',
    developer: 'Developer profile',
    payment: 'Payment result',
    paymentPending: 'Waiting for payment',
  },

  notFound: {
    title: 'This page does not exist',
    description: 'The link may be out of date, or the item it pointed at has been removed.',
    goHome: 'Back to newsfeed',
  },

  payment: {
    invalidTitle: 'Invalid payment link',
    invalidDesc: 'This link is missing order information.',
    checkingTitle: 'Confirming your payment...',
    checkingDesc: 'Please wait while we verify the transaction with MoMo.',
    failedTitle: 'Payment failed',
    failedDesc: 'Your payment could not be completed. Please try again.',
    pendingTitle: 'Payment not confirmed yet',
    pendingDesc:
      'MoMo has not reported back. If you were charged, access opens within a few minutes — reload this page to check.',
    successTitle: 'Payment successful',
    successDesc: 'Thank you! You now have full access to this book.',
    backToNewsfeed: 'Back to newsfeed',
    /* The screen the app waits on while the buyer pays, which is a different situation from the
       one MoMo redirects into: nothing has been paid yet, and the QR is scanned on a phone. The
       copy has to say that this page resolves itself, or the reader closes it and loses the ref. */
    awaitTitle: 'Waiting for your payment',
    awaitDesc:
      'Finish the payment in the MoMo tab, or scan the QR code with the MoMo app. This page updates by itself the moment MoMo confirms — there is nothing else for you to do here.',
    awaitTimeoutTitle: 'No payment yet',
    awaitTimeoutDesc:
      'We stopped checking after a few minutes. If you have paid, check again — access opens as soon as MoMo reports the order.',
    expiresIn: 'The order expires in ${time}',
    openMomo: 'Open the MoMo payment page',
    checkAgain: 'Check again',
    // Shown only in non-production builds (B27) — calls `dev-settle` directly, a shortcut for a
    // demo with no phone on hand to scan MoMo's QR.
    devSettle: 'Mark as paid (demo)',
  },

  admin: {
    title: 'Moderation Admin',
    // Only `title` survives here: the rest of this block belonged to the legacy moderation
    // components, deleted at P2.15cd. The screen's own copy now lives under `moderation.*`,
    // owned by the feature that renders it. This one key stays because the `(admin)` layout —
    // shell, not feature — uses it to label the nav link.
    //
    // THE READER'S REPORT DIALOG MOVED OUT TOO, and it had never worked from in here: it was
    // nested under `admin.moderation.report.*` while every caller asked for `moderation.report.*`,
    // so the `⋯` menu on a post printed the raw key `moderation.report.title` and the whole
    // dialog behind it was untranslated. It is a reader-facing surface, not an admin one.
    moderation: {
      title: 'Moderation',
    },
  },

  nav: {
    roadmap: 'Roadmaps',
    library: 'Library',
    knowledge: 'Archive',
    newsfeed: 'Newsfeed',
    notifications: 'Notifications',
    friends: 'Friends',
    friendsAll: 'All Friends',
    friendsSuggestions: 'Suggestions',
    friendsRequests: 'Friend Requests',
    chats: 'Chats',
    projects: 'Projects',
    profile: 'Profile',
    logout: 'Logout',
    primary: 'Main navigation',
    groupCommunity: 'Community',
    groupStream: 'Stream',
    groupGrowth: 'Growth',
    groupNetwork: 'Network',
    openMenu: 'Open navigation',
  },

  // The command palette is app chrome, so its strings sit next to `nav` rather than under a
  // domain. `shortcutHint` is the visible key hint on the topbar button.
  palette: {
    label: 'Command palette',
    placeholder: 'Jump to a page, or search everything…',
    goTo: 'Go to',
    searchEverywhere: 'Search everywhere for what you typed',
    empty: 'Nothing matches that',
    shortcutHint: 'Ctrl K',
  },

  /**
   * THE SIGNED-OUT READER. Sits beside `nav` and `palette` because it is chrome, not a domain:
   * these strings appear in the top bar, the rail, the ledger and one dialog that can be raised
   * from any screen under `(main)`.
   *
   * THE COPY NEVER APOLOGISES FOR THE WALL. "Sign in to react" tells someone what to do; "you do
   * not have permission" tells them they did something wrong. A guest has done nothing wrong —
   * they arrived, which is what the whole surface is for.
   */
  guest: {
    signIn: 'Sign in',
    register: 'Sign up',
    /* Read out for the padlock on a rail row a guest cannot open — an icon alone is silent. */
    locked: 'Sign in required',
    prompt: {
      title: 'Sign in to join in',
      description:
        'You are browsing as a guest. Reading is open to everyone; reacting, commenting and connecting need an account.',
      dismiss: 'Keep reading',
    },
    ledger: {
      overline: 'Join Elite Nexus',
      body: 'Build a profile that proves what you can do: verified skills, a reputation score, and the posts behind both.',
    },
    profile: {
      /* On someone else's profile, where the message/block pair would be. */
      join: 'Join to connect',
    },
  },

  auth: {
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    password: 'Password',
    passwordShow: 'Show password',
    passwordHide: 'Hide password',
    fullname: 'Full Name',
    fullNamePlaceholder: 'John Doe',
    // The label on the auth screens' way out — see `(auth)/home-link.tsx`. Names the
    // destination, not the gesture: the arrow beside it is what says "back".
    backHome: 'Home',
    brand: {
      tagline: 'Where ability is proven, not claimed',
      subtagline:
        'A profile built from verified skills, the books you wrote and the projects you shipped — not from a paragraph about yourself.',
      command: 'nexus init',
      pointProfile: 'A reputation backed by verification',
      pointRoadmap: 'Skill roadmaps, one step at a time',
      pointLibrary: 'A library the community publishes',
      pointProjects: 'Projects looking for people to build with',
      pointChat: 'Talk it through without leaving the app',
      footer: 'Elite Nexus — a network for people who build.',
    },
    login: {
      title: 'Welcome back',
      subtitle: 'Sign in to your Elite Nexus account',
      forgotPassword: 'Forgot password?',
      passwordPlaceholder: 'Enter your password',
      submit: 'Sign in',
      submitting: 'Signing in...',
      magicLink: 'Sign in with a magic link',
      noAccount: "Don't have an account?",
      signUp: 'Sign up',
      banned: {
        title: 'This account is locked until ${until}.',
        titleNoTime: 'This account is locked.',
        remaining: '${remaining}',
        violationType: 'Recorded as',
        reason: 'Reason',
        appealHint:
          'Once the lock lifts you can sign in and appeal it from the moderation page. Appeals filed during a lock are accepted, but there is no signed-out screen for them yet.',
        retry: 'Try signing in again',
      },
      unverifiedHint: 'Your email is not verified yet.',
      useMagicLink: 'Verify and sign in with a magic link',
      magicSending: 'Sending…',
      magicSent: 'If that address has an account, a magic link is on its way.',
    },
    register: {
      title: 'Create an account',
      subtitle: 'Join Elite Nexus and start connecting with others',
      profilePicture: 'Profile Picture',
      optional: '(optional)',
      changePhoto: 'Change photo',
      uploadPhoto: 'Upload a photo',
      photoFormats: 'JPG, PNG or WebP. Max 5MB.',
      photoTooLarge: 'Image is too large. Max 5MB.',
      passwordPlaceholder: 'At least 6 characters',
      submit: 'Create account',
      submitting: 'Creating...',
      checkEmailTitle: 'Verify your email',
      checkEmailDesc:
        "We've sent a verification link to ${email}. Open it to activate your account.",
      backToLogin: 'Back to login',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
    },
    oauth: {
      divider: 'or',
      google: 'Continue with Google',
      github: 'Continue with GitHub',
      exchanging: 'Signing you in…',
      failedTitle: 'Sign-in failed',
      failed: "We couldn't complete sign-in. Please try again.",
      denied: 'Access was denied. You can try a different method.',
      missingCode: 'The sign-in link is missing its authorization code.',
      backToLogin: 'Back to login',
    },
    forgotPassword: {
      title: 'Forgot password?',
      subtitle: "Enter your email and we'll send you a reset link",
      submit: 'Send reset link',
      submitting: 'Sending...',
      successTitle: 'Check your email',
      successDesc:
        "We've sent a password reset link to your email address. Please check your inbox.",
      backToLogin: 'Back to login',
    },
    magicLink: {
      title: 'Sign in with a magic link',
      subtitle: "We'll email you a link to sign in without a password",
      submit: 'Send magic link',
      submitting: 'Sending...',
      successTitle: 'Check your email',
      successDesc: 'If an account exists for that email, we sent a sign-in link. Check your inbox.',
      backToLogin: 'Back to login',
    },
    verifyEmail: {
      verifying: 'Verifying your email…',
      verifiedTitle: 'Email verified',
      verifiedDesc: 'Your email has been verified. You can now sign in.',
      failedTitle: 'Verification failed',
      failedDesc: 'This verification link is invalid or has expired.',
      invalidTitle: 'Invalid link',
      invalidDesc: 'This verification link is missing its token. Use the link from your email.',
      continue: 'Continue to sign in',
      backToLogin: 'Back to login',
    },
    magicLogin: {
      signingIn: 'Signing you in…',
      invalidTitle: 'Invalid link',
      invalidDesc: 'This magic link is invalid or has expired. Please request a new one.',
      requestNewLink: 'Request a new link',
    },
    resetPassword: {
      title: 'Reset your password',
      subtitle: 'Enter a new password for your account',
      newPassword: 'New password',
      newPasswordPlaceholder: 'At least 6 characters',
      confirmPassword: 'Confirm password',
      confirmPasswordPlaceholder: 'Re-enter your password',
      submit: 'Reset password',
      submitting: 'Resetting…',
      invalidTitle: 'Invalid link',
      invalidDesc: 'This reset link is invalid or has expired. Please request a new one.',
      requestNewLink: 'Request a new link',
      successTitle: 'Password reset',
      successDesc: 'Your password has been changed. You can now sign in.',
      continue: 'Continue to sign in',
      backToLogin: 'Back to login',
    },
  },

  newsfeed: {
    tabs: {
      skills: 'My skills',
      label: 'Filter the feed',
      // Replaces the old `All` tab, which merged crawled items into `/posts/public` by
      // `publishedAt` and lost `TrendingController`'s own ranking in the process. `Posts` is
      // `/posts/public` alone now — every post in the product, no crawled content, no re-sort.
      posts: 'Posts',
      friends: 'Friends',
      // Names the CONTENT, the way its three neighbours do — the old `/trending` named a sort
      // order instead. Also the default tab: bare `/newsfeed` opens here.
      tech: 'Tech',
    },
    title: 'Newsfeed',
    subtitle: 'Latest updates from your friends and people you follow',
    error: 'Failed to load posts. Please try again.',
    retry: 'Try again',
    empty: {
      title: 'No posts yet',
      desc: 'Be the first to post or add more friends to see updates!',
    },
    allLoaded: "You've seen all posts \uD83C\uDF89",
    // Icon-only button in the sticky filter bar, so this string is the `aria-label` and the
    // tooltip rather than a visible label — it names the whole action, not one word.
    composeInBar: 'Write a new post',
    // The `?hashtag=` filter on the `Posts` tab (B31).
    hashtag: {
      filteredBy: 'Filtered by',
      clear: 'Clear the #${tag} filter',
      emptyTitle: 'No posts tagged #${tag}',
      emptyDesc:
        'Nobody has posted with this hashtag yet, or the ones that exist are not visible to you.',
    },
  },

  hashtags: {
    // "12 posts" — the count beside a tag in the suggestion list.
    postCount: '${count} posts',
    search: {
      placeholder: 'Search hashtags',
      placeholderActive: 'Showing #${tag} — search another hashtag',
      trendingLabel: 'Popular this week',
    },
  },

  notifications: {
    title: 'Notifications',
    unreadCount: '${count} unread',
    allRead: "You're all caught up",
    unreadMarker: 'Unread',
    markAllRead: 'Mark all as read',
    error: 'Could not load notifications. Please try again.',
    markReadError: 'Could not mark this notification as read. Please try again.',
    markAllReadError: 'Could not mark all notifications as read. Please try again.',
    retry: 'Try again',
    allLoaded: "You've seen all notifications",
    bell: {
      label: 'Notifications',
      labelUnread: 'Notifications, ${count} unread',
      loading: 'Loading…',
      viewAll: 'See all notifications',
    },
    empty: {
      title: 'No notifications yet',
      desc: 'When someone interacts with you, it will show up here.',
    },
    prefs: {
      channels: 'Delivery channels',
      push: 'Push notifications',
      pushDesc: 'Shown by your browser while you are in another app',
      pushNotConfigured: 'Push delivery is not set up on this deployment yet.',
      pushDenied:
        'Your browser is blocking notifications for this site. Allow them in your browser settings to turn this on.',
      email: 'Email notifications',
      emailDesc: 'Sent as soon as something happens',
      types: 'Notification types',
      typesDesc: 'Turn one off and you will stop receiving that kind',
      error: 'Could not load your notification settings',
      saveError: 'Could not save that change. Please try again.',
    },
    types: {
      POST_LIKED: 'Someone reacts to your post',
      POST_COMMENTED: 'Someone comments on your post',
      POST_TAGGED: 'Someone mentions you in a post',
      FRIEND_REQUEST: 'New friend request',
      FRIEND_ACCEPTED: 'Friend request accepted',
      EVENT_RSVP: 'Someone responds to your event',
      EVENT_REMINDER: 'A day before an event you are going to',
      BOOK_REVIEW: 'New review on your book',
      BOOK_PURCHASED: 'Someone buys your book',
    },
  },

  search: {
    booksSection: 'Books (${count})',
    placeholder: 'Search people, posts and books...',
    error: 'Search failed. Please try again.',
    empty: 'No results for "${query}"',
    usersSection: 'People (${count})',
    postsSection: 'Posts (${count})',
    projectsSection: 'Projects (${count})',
    roadmapsSection: 'Roadmaps (${count})',
    title: 'Search',
    prompt: 'Type something and press Enter to search',
    promptTitle: 'Search for something',
    emptyTitle: 'No results',
    errorTitle: 'Search failed',
    clear: 'Clear search',
    backToResults: 'Search results',
    /* The line under a project result: it matched "${query}" on a position's skill (which the
       card does not otherwise show), not on the title — the exact thing that confused
       matchmaking/4034. */
    projectMatch: 'Matched "${query}":',
    unknownPerson: 'Unknown user',
    untitledBook: 'Untitled book',
    free: 'Free',
    price: '${price} đ',
    priceUnknown: 'Price unavailable',
    /* The result tabs. `all` keeps the stacked people/posts/books sections; the rest narrow to
       one kind. Since B33 all five tabs read the one `/search` call. */
    tabs: {
      all: 'All',
      people: 'People',
      posts: 'Posts',
      books: 'Books',
      projects: 'Projects',
      roadmaps: 'Roadmaps',
    },
    filters: {
      sortLabel: 'Sort',
      sortRelevance: 'As found',
      sortRep: 'Highest reputation',
      kindLabel: 'Post type',
      kindAll: 'All types',
      priceLabel: 'Price',
      priceAll: 'Any price',
      priceFree: 'Free',
      pricePaid: 'Paid',
      statusLabel: 'Status',
      statusAll: 'Any status',
      categoryLabel: 'Topic',
      categoryAll: 'All topics',
    },
    openPositions: '${count} open',
  },

  github: {
    link: {
      action: 'Link GitHub',
      linking: 'Linking your GitHub account…',
      failed: 'Could not link the GitHub account',
      cancelledTitle: 'You cancelled linking',
      cancelledDesc: 'Nothing changed. Open your profile to try again.',
      noCodeTitle: 'Authorisation code missing',
      noCodeDesc: 'GitHub did not send a code. Start again from the link button on your profile.',
    },
    title: 'GitHub',
    subtitle: 'Your linked GitHub account, as this app last saw it.',
    loadFailed: 'Could not load GitHub stats',
    notLinked: {
      title: 'No GitHub account linked',
      desc: 'Link a GitHub account to show your contribution activity and pinned repositories on your profile.',
    },
    // The viewer's variant: it does not explain B23, because "how do I fix this?" is not a
    // question anyone asks about somebody else's account.
    notLinkedOther: {
      title: 'No GitHub account linked',
      desc: 'This person has not connected a GitHub account to their profile.',
    },
    sync: 'Sync now',
    // Never "synced": the endpoint answers 200 whether or not GitHub replied.
    syncRateLimited: 'Already synced recently. GitHub data can be refreshed once an hour.',
    unlink: 'Unlink',
    repos: '${count} public repos',
    followers: '${count} followers',
    lastSynced: 'Synced ${when}',
    neverSynced: 'Never synced',
    pinned: {
      title: 'Pinned repositories',
    },
    graph: {
      total: '${count} contributions in the last year',
      day: '${count} contributions on ${date}',
    },
  },

  moderation: {
    title: 'Moderation',
    subtitle: 'Review reported posts, audit the decision log, and see who has been banned',
    loadFailed: 'Could not load',
    pageOf: 'Page ${page} / ${totalPages}',
    tabs: {
      posts: 'Queue',
      reports: 'Reports',
      logs: 'Decision log',
      banned: 'Banned users',
      appeals: 'Appeals',
      system: 'System',
    },
    rebuild: {
      title: 'Rebuild the newsfeed',
      desc: "Recompute every user's personalised feed from scratch. Slow, and rarely needed — use it after a data migration or if feeds look stale.",
      button: 'Rebuild newsfeed',
      confirm: 'Yes, rebuild now',
      cancel: 'Cancel',
      result: 'Done — ${processed} feeds rebuilt, ${skipped} skipped.',
      error: 'Could not rebuild the newsfeed.',
    },
    banBanner: {
      title: 'Your account is restricted — ${remaining} left.',
      titleNoTime: 'Your account is restricted.',
      remainingDays: '${days}d ${hours}h',
      remainingHours: '${hours}h ${minutes}m',
      remainingMinutes: '${minutes}m',
      link: 'See the reason and appeal',
    },
    report: {
      /* The `⋯` menu row. Deliberately shorter than `title`: it sits between `Edit` and
         `Delete`, which are one word each. */
      action: 'Report',
      title: 'Report post',
      description: 'Pick the closest reason. Reports go to the moderators, not to the author.',
      reasonLabel: 'Reason',
      reason: {
        SPAM: 'Spam or advertising',
        HARASSMENT: 'Harassment or personal attacks',
        HATE_SPEECH: 'Hate speech',
        ADULT_CONTENT: 'Adult content',
        VIOLENCE: 'Violence',
        MISINFORMATION: 'Misinformation',
        OTHER: 'Something else',
      },
      detailsLabel: 'Anything to add (optional)',
      detailsPlaceholder: 'What made you report this post?',
      submit: 'Send report',
      cancel: 'Cancel',
      failed: 'Could not send the report',
      sentTitle: 'Report sent',
      sentBody: 'Thank you. The report has been recorded and passed to the moderators.',
      done: 'Close',
    },
    /* The reader-report queue. Read-only by the shape of the API — there is no endpoint that
       marks a report handled — which is what `readOnly` has to say out loud. */
    reports: {
      readOnly:
        'Reports are a signal, not a task list: nothing here can be marked handled. Open the post to decide it.',
      total: '${count} reports',
      empty: 'No one has reported anything',
      emptyForPost: 'No reports on post #${postId}',
      viewPost: 'Open post #${postId}',
      reporter: 'Reported by #${reporterId}',
    },
    appeals: {
      filter: 'Filter by status',
      loadError: 'Could not load appeals',
      empty: 'No appeals with this status',
      approve: 'Approve',
      reject: 'Reject',
      note: 'Reviewer note',
      notePlaceholder: 'Note (optional)',
      decisionError: 'Could not process this appeal. Please try again.',
    },
    filters: {
      postId: 'Post ID',
      userId: 'User ID',
      status: 'Status',
      anyStatus: 'Any status',
    },
    status: {
      PENDING_MODERATION: 'Awaiting the classifier',
      APPROVED: 'Approved',
      PENDING_REVIEW: 'Needs a decision',
      REJECTED: 'Rejected',
    },
    // All nine members of the backend `ViolationType` enum, in its own order. Written out rather
    // than derived: a union has no runtime value to map over, and a missing key here renders the
    // raw enum name to a moderator rather than failing at compile time.
    violation: {
      HATE_SPEECH: 'Hate speech',
      NSFW: 'NSFW',
      SPAM: 'Spam',
      VIOLENCE: 'Violence',
      THREAT: 'Threat',
      INSULT: 'Insult',
      SEXUALLY_EXPLICIT: 'Sexually explicit',
      KEYWORD_BLACKLIST: 'Blacklisted keyword',
      DUPLICATE_CONTENT: 'Duplicate content',
    },
    log: {
      toxicity: 'Text toxicity',
      imageUnsafe: 'Image unsafe score',
      empty: 'No log entries match these filters',
    },
    post: {
      empty: 'Nothing to review',
      emptyDesc: 'Try clearing the filters, or pick a different status.',
      history: 'History (${count})',
      noHistory: 'No history for this post yet',
      feedback: 'Reason',
      // Says what the field is FOR, because the backend files every rejection as HATE_SPEECH
      // regardless (B22) — this text is the only record of what actually happened.
      feedbackHint:
        'Stored on the author’s violation record. It is the only place the real reason is kept.',
      approve: 'Approve',
      reject: 'Reject',
      rejectConfirm: 'Yes, reject',
      cancel: 'Cancel',
      rejectWarning:
        'Rejecting records a violation against the author. Two violations ban them for 7 days, and a ban blocks sign-in.',
    },
    banned: {
      empty: 'Nobody has been banned',
      active: 'Banned · ${remaining} left',
      expired: 'Ban expired',
      count: 'Banned ${count} time(s)',
      triggeringPosts: 'Triggered by:',
    },
  },

  roadmap: {
    title: 'Roadmaps',
    list: {
      loadFailed: 'Could not load the roadmaps',
      empty: 'No roadmaps yet',
      emptyDesc: 'Roadmaps show up here once an admin creates them.',
      categoryLabel: 'Filter by topic',
      allCategories: 'All topics',
      emptyCategory: 'No roadmaps on this topic',
      emptyCategoryDesc: 'Pick another topic to see the rest of the tracks.',
    },
    nodes: {
      pickRoadmap: 'Pick a roadmap to see its skills',
      pickRoadmapDesc: 'Each roadmap is a set of skills you can claim.',
      loadFailed: 'Could not load the skills',
      empty: 'This roadmap has no skills yet',
      emptyDesc: 'Skills appear as an admin adds them to the roadmap.',
    },
    path: {
      legend: {
        verified: 'Verified',
        pending: 'Awaiting review',
        open: 'Not started',
      },
    },
    track: {
      // Verified count over EVERY node on the track, at every depth — see the note in
      // `roadmap-track.tsx` on why this is not the top-level count.
      progress: 'Verified ${done}/${total} skills',
      progressLabel: 'Track progress',
      hint: 'Claim a step to record it on your own word, or send proof for a moderator to review.',
    },
    verify: {
      claim: 'Claim',
      claiming: 'Claiming: ${node}',
      tierLabel: 'How are you backing this up?',
      tier: {
        self: 'My own word',
        mod: 'Review by a moderator',
        quiz: 'Quiz result, reviewed by a moderator',
        auto: 'A repository on my linked GitHub',
      },
      tierHint: {
        self: 'Recorded immediately. Earns reputation.',
        mod: 'Goes into the moderator queue and waits for a decision.',
        quiz: 'Goes into the moderator queue and waits for a decision.',
        auto: 'Checked straight away against your linked GitHub account.',
      },
      proofUrl: 'Proof link',
      proofUrlHint: 'Optional. A moderator reads this.',
      proofUrlAutoHint:
        'Required, and must be a repository under your own linked GitHub account — anything else is turned down.',
      proofImage: 'Proof image',
      proofImageHint:
        'Optional. A screenshot a moderator can look at — not used for GitHub checks.',
      proofImageAdd: 'Upload image',
      proofImageRemove: 'Remove image',
      proofImageInvalid: 'Use a JPEG, PNG or WEBP under 20MB.',
      submit: 'Submit',
      // Never "verified": the endpoint returns nothing, and an AUTO_CERTIFIED claim can be turned
      // down while still answering 200. See the note in `skill-verification-form.tsx`.
      submitted: 'Submitted. The outcome depends on the option you picked.',
    },
    queue: {
      title: 'Awaiting review',
      loadFailed: 'Could not load the review queue',
      empty: 'Nothing is waiting for review',
      approve: 'Approve',
      reject: 'Reject',
    },
    admin: {
      title: 'Manage roadmaps',
      newRoadmap: 'New roadmap',
      roadmapName: 'Name',
      roadmapDescription: 'Description',
      roadmapCategory: 'Topic',
      createRoadmap: 'Create roadmap',
      newNode: 'New skill',
      pickRoadmap: 'Pick a roadmap above to add a skill to it.',
      nodeName: 'Name',
      parentNode: 'Sits under',
      noParent: 'Top level',
      parentHint: 'Only skills already on this roadmap can be the parent.',
      createNode: 'Add skill',
    },
  },

  trending: {
    sourceLabel: 'Filter by source',
    allSources: 'All sources',
    title: 'Trending',
    subtitle: 'Popular stories in tech from around the web',
    error: 'Failed to load trending items. Please try again.',
    retry: 'Try again',
    empty: {
      title: 'No trending items',
      desc: 'Check back later for the latest stories.',
    },
    allLoaded: "You've seen all trending items",
    // `All topics`, not `All`: back when the feed's first tab was also `All`, this chip sat
    // directly under it — one word meaning two unrelated things. The tab is `Posts` now, but the
    // chip keeps its own distinct name.
    allCategories: 'All topics',
    filters: 'Filters',
    // The screen-reader name — the numeral on the button is a glyph, and alone it does not
    // say what it counts.
    filtersActive: 'Filters, ${count} active',
    clearFilters: 'Clear filters',
    errorTitle: 'Could not load trending',
    untitled: 'Untitled',
    timeRangeLabel: 'Time range',
    categoryLabel: 'Topic',
    timeRange: {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
    },
    categories: {
      OPENSOURCE: 'Open Source',
      EVENT: 'Event',
      NEW_TECH: 'New Tech',
      REGULATION: 'Regulation',
      MINDSET: 'Mindset',
      TOOL: 'Tool',
      CAREER: 'Career',
      OTHER: 'Other',
    },
    sources: {
      HACKER_NEWS: 'Hacker News',
      DEV_TO: 'DEV Community',
      GITHUB: 'GitHub',
    },
  },

  createPost: {
    location: {
      add: 'Add location',
      placeholder: 'Describe a place...',
      myLocation: 'My location',
      searching: 'Looking up places...',
      notFoundTitle: 'No places found',
      notFoundDesc: 'Try describing it differently, or use your current location.',
      clear: 'Remove location',
      openInMaps: 'Open in Google Maps',
      cancel: 'Cancel',
      gpsDenied: "Couldn't get your location. Allow location access and try again.",
      gpsUnavailable: 'This browser does not support geolocation.',
    },
    visibilityLabel: 'Who can see this',
    tag: {
      chipRemove: 'Remove tag for ${name}',
      privateWarning:
        'A private post cannot tag anyone — remove the tags or change the visibility.',
    },
    submittedPendingReview:
      'Post submitted. It may need to pass moderation before it shows up in the feed.',
    contentPlaceholderNoName: "What's on your mind?",
    photo: 'Photo',
    posting: 'Posting...',
    post: 'Post',
    cancel: 'Cancel',
    dialogTitle: 'New post · ${type}',
    dialogNote: 'Your post may need to pass moderation before it appears in the feed.',
    /* The confirm step. `open` is the composer's primary button, so it names the step rather
       than the outcome — the button that posts is inside the preview and says `post`. */
    preview: {
      open: 'Preview',
      title: 'Preview your post',
      note: 'This is roughly how it will look in the feed. It may need to pass moderation before it appears, and hashtags are picked out by the server after posting.',
      back: 'Keep editing',
      quizAttached: 'Quiz attached · ${count} questions',
      quizAttachedTitled: 'Quiz "${title}" · ${count} questions',
    },
    visibility: {
      PUBLIC: 'Public',
      FRIENDS: 'Friends',
      PRIVATE: 'Only me',
    },
    removeType: 'Remove',
    type: {
      REGULAR: 'Status',
      CODE_SNIPPET: 'Code',
      ARTICLE: 'Article',
      QNA: 'Question',
      POLL: 'Poll',
      LINK: 'Link',
      BOOK: 'Book',
      EVENT: 'Event',
    },
    contentPlaceholder: {
      REGULAR: "What's on your mind, ${fullname}?",
      CODE_SNIPPET: 'Explain what this code does...',
      ARTICLE: 'Write your article...',
      QNA: 'Ask your question in full — details get better answers.',
      POLL: 'Add context for your poll (optional)...',
      LINK: 'Say why this link is worth opening (optional)...',
      BOOK: 'Say what this book covers and who it is for (optional)...',
      EVENT: 'Say more about this event (optional)...',
    },
    quiz: {
      label: 'Quiz',
      remove: 'Remove quiz',
      title: 'Quiz title',
      titlePlaceholder: 'What is this quiz about?',
      questionN: 'Question ${index}',
      questionPlaceholder: 'Write the question',
      removeQuestion: 'Remove question',
      addQuestion: 'Add question',
      options: 'Answers',
      optionPlaceholder: 'Answer ${index}',
      addOption: 'Add answer',
      removeOption: 'Remove answer',
      markCorrect: 'Mark answer ${index} as correct',
      correctHint: 'Select the correct answer. Every question needs at least two answers.',
      explanation: 'Explanation',
      explanationHint: 'Optional — shown after the quiz is answered.',
    },
    code: {
      language: 'Language',
      code: 'Code',
      codePlaceholder: 'Paste your snippet here',
      languages: {
        plaintext: 'Plain text',
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
      title: 'Article title',
      titlePlaceholder: 'A headline that says what it is about',
      summary: 'Summary',
      summaryHint: 'Shown on the feed card instead of the full body.',
      coverImage: 'Cover image URL',
      coverImageHint: 'Paste a link to an image — there is no upload for cover images yet.',
    },
    qna: {
      noticeTitle: 'Your post becomes the question',
      noticeDesc:
        'Write the question above. Once people answer, you can mark one answer as accepted, which earns its author reputation.',
    },
    poll: {
      question: 'Poll question',
      questionPlaceholder: 'What do you want to ask?',
      options: 'Options',
      optionPlaceholder: 'Option ${index}',
      addOption: 'Add option',
      removeOption: 'Remove option',
      mode: 'Answers',
      modeSingle: 'Single choice',
      modeMultiple: 'Multiple choice',
      endDate: 'Closes at',
      endDateHint: 'Optional.',
    },
    link: {
      url: 'Link URL',
      urlInvalid: 'Enter a full http:// or https:// address',
      title: 'Link title',
      titleHint: 'Optional. Fetch a preview, or type it yourself.',
      description: 'Link description',
      thumbnailUrl: 'Thumbnail URL',
      thumbnailUrlHint: 'Optional. Paste a link to an image.',
      fetchPreview: 'Fetch preview',
      fetching: 'Fetching preview…',
      previewFailed: "Couldn't read that page — fill the fields in yourself.",
    },
    event: {
      button: 'Event',
      title: 'Event title',
      description: 'Event description',
      startTime: 'Start time',
      endTime: 'End time',
      // Sets the end time relative to the start; ${hours} is 1, 2 or 3.
      endShortcut: '+${hours}h',
      location: 'Venue',
      onlineUrl: 'Online link (optional)',
      maxAttendees: 'Max attendees (optional)',
    },
    images: {
      add: 'Add photos',
      remove: 'Remove photo',
      tooMany: 'Up to ${count} photos per post',
      invalidFormat: 'Only JPEG, PNG, WEBP and GIF are supported',
      fileTooLarge: 'Each photo must be 20MB or smaller',
      batchTooLarge: 'One selection must total under 25MB',
      uploadFailed: 'Upload failed, please try again',
    },
    book: {
      button: 'Book',
      title: 'Book title',
      description: 'Book description',
      file: 'Book file (PDF or EPUB)',
      cover: 'Cover image (optional)',
      price: 'Price in VND (leave empty for free)',
      previewPages: 'Preview pages (required for paid books)',
      cancel: 'Cancel book',
      fileRequired: 'Please select a PDF or EPUB file',
      fileInvalidFormat: 'Only PDF and EPUB files are supported',
      fileTooLarge: 'The file must be 20MB or smaller',
      previewPagesHint: 'Must be fewer than the total pages (chapters for EPUB).',
      chooseFile: 'Choose file',
      chooseCover: 'Choose cover image',
      removeFile: 'Remove',
      previewError: 'Could not preview this PDF',
      previewPageCount: '${count} page(s)',
    },
  },

  time: {
    justNow: 'Just now',
    minutesAgo: '${minutes}m ago',
    hoursAgo: '${hours}h ago',
    daysAgo: '${days}d ago',
  },

  post: {
    reactors: {
      title: 'Who reacted',
      count: '${count} people',
      all: 'All',
      empty: 'Nobody here yet',
      loadError: 'Could not load the list',
      loadMore: 'Load more',
    },
    backToFeed: 'Back to the feed',
    permalink: {
      notFoundTitle: 'This post is not available',
      notFoundDesc: 'It may have been removed, or you may not have access to it.',
      open: 'Open post',
    },
    unknownAuthor: 'Unknown author',
    qna: {
      accept: 'Accept answer',
      acceptedAnswer: 'Accepted answer',
      unaccept: 'Undo accept',
    },
    quiz: {
      title: 'Quiz',
      submit: 'Submit answers',
      score: '${score}/${total} correct',
      resultNotSaved: 'This result is not saved — it disappears when you leave the page.',
    },
    edit: {
      edit: 'Edit',
      menuLabel: 'Post options',
      deleteTitle: 'Delete this post?',
      deleteDesc:
        'The post and every comment and reaction on it will be removed. This cannot be undone.',
      save: 'Save changes',
      content: 'Content',
      delete: 'Delete',
      deleteConfirm: 'Delete this post?',
      pendingReview:
        'Saving sends the post back through review — it may briefly disappear from the feed.',
      /* `UpdatePostRequestDto` carries no `eventDetails` and no `bookDetails`, so these two
         kinds keep whatever they were created with. Stated rather than left to be discovered
         by an author hunting for a date field that is not there. */
      immutable: {
        EVENT: 'Event details cannot be changed after posting. Only the text and who can see it.',
        BOOK: 'Book details and the uploaded file cannot be changed after posting. Only the text and who can see it.',
      },
      quizKeyLoading: 'Loading the quiz answers…',
      /* Shown only when the author-only read fails (a 403). Normally the real answers load and
         the composer opens with them marked. See `post-editor.tsx`. */
      quizKeyLost:
        'The correct answers could not be loaded, so saving would clear them. Mark the right answer on each question again before saving.',
    },
    comments: {
      // The feed's toggle, not the thread's: `CommentThread` fetches on mount, so the feed
      // decides when it exists at all.
      show: 'Comments',
      viewAll: 'View all ${count} comments',
      unknownAuthor: 'Someone',
      hide: 'Hide comments',
      empty: 'No comments yet',
      loadFailed: 'Could not load comments',
      loadMore: 'Show more comments',
      reply: 'Reply',
      replyPlaceholder: 'Write a reply...',
      edit: 'Edit',
      save: 'Save',
      edited: 'edited',
      cancel: 'Cancel',
      delete: 'Delete',
      deleteYes: 'Delete',
      deleteConfirm: 'Delete this comment?',
      deleteWithReplies: 'Deletes this comment and its ${count} replies.',
      mentionFriends: 'Friends',
      mentionOthers: 'Others',
    },
    /* Labels retuned to a technical register; the wire values are untouched. See the note
       in vi.ts and docs/backend-plan.md B5 — the kit's three knowledge reactions do not
       exist in the backend enum, so relabelling is the closest reachable thing. */
    reaction: {
      LIKE: 'Useful',
      INSIGHT: 'Insightful',
      CLAP: 'Respect',
      LOVE: 'Excellent',
      HAHA: 'Funny',
      CRY: 'Confusing',
      ANGRY: 'Disagree',
      pick: 'Pick a reaction',
      count: '${count} reactions',
    },
    body: {
      code: 'Code',
      coverAlt: 'Article cover',
      openLink: 'Opens in a new tab',
      qnaResolved: 'Resolved',
      qnaUnresolved: 'Unanswered',
      pollNoVoting: 'Voting is not available yet.',
      pollClosed: 'Closed on ${date}.',
      bookUnits: '${count} pages/chapters',
    },
    showMore: 'See more',
    openInMaps: 'Open in Google Maps',
    commentCount: '${count} comments',
    commentPlaceholder: 'Write a comment...',
    send: 'Send',
    event: {
      status: {
        upcoming: 'Upcoming',
        ongoing: 'Happening now',
        past: 'Ended',
      },
      joinOnline: 'Join online',
      maxAttendees: 'Up to ${count} attendees',
      rsvp: {
        going: 'Going',
        interested: 'Interested',
        notGoing: 'Not going',
        // GOING only — the same figure the backend checks against the organiser's cap.
        goingCount: '${count} going',
        full: 'This event is full.',
      },
      attendees: {
        title: 'Attendees',
        show: 'See who responded',
        hide: 'Hide attendees',
        all: 'Everyone',
        empty: 'Nobody has responded yet',
        loadFailed: 'Could not load the attendee list',
        unknownPerson: 'Deleted user',
      },
      calendar: {
        download: 'Download .ics',
        add: 'Add to Google Calendar',
        added: 'Added to your calendar',
        connect: 'Connect Google Calendar',
      },
    },
    book: {
      free: 'Free',
      reviewCount: '${count} reviews',
      preview: 'Preview',
      hidePreview: 'Hide preview',
      previewUrlError: 'Could not load preview',
      previewUnavailableHint: "This book's file is currently unreachable.",
      openPreview: 'Open preview',
      reviews: 'Reviews',
      hideReviews: 'Hide reviews',
      reviewsError: 'Could not load reviews',
      noReviews: 'No reviews yet',
      feedbackPlaceholder: 'Write a review (optional)',
      submitReview: 'Submit',
      ratingLabel: 'Your rating',
      readerLoadError: 'Could not open this book for reading',
      previousPage: 'Previous',
      nextPage: 'Next',
      pageIndicator: 'Page ${current} of ${total}',
      buy: 'Buy',
      /* Two different certainties, which is why they are two strings. `resumePayment` sits on a
         payment this browser started and can link straight back to MoMo's page; `checkPayment`
         sits on a ref recovered from the backend's rejection, where all the app can offer is to
         ask whether it went through. */
      resumePayment: 'Resume payment',
      checkPayment: 'Check payment',
      unavailable: 'Unavailable',
      download: 'Download',
    },
  },

  /* `/onboarding/professional` — the 428 gate walked one step at a time. Beside `knowledge`
     because the professional profile is that domain's, but this is its own route and its own
     chrome (a wizard, not the summary-first form). */
  onboarding: {
    professional: {
      stepOf: 'Step ${step} of ${total}',
      progressLabel: 'Setup progress',
      back: 'Back',
      next: 'Next',
      skip: 'Skip for now',
      finish: 'Finish setup',
      steps: {
        '1': {
          title: 'What you do now',
          hint: 'The explainer pitches its answers to your role and seniority. This is the part it leans on most.',
        },
        '2': {
          title: 'What you work with',
          hint: 'Tech and domains, comma-separated. Also feeds friend and project suggestions.',
        },
        '3': {
          title: 'How you like explanations',
          hint: 'Optional — sets the default tone the AI writes back in. You can change it any time.',
        },
        '4': {
          title: 'Where you have worked',
          hint: 'Optional past roles. Skip straight to finish if you would rather add these later.',
        },
      },
    },
  },

  knowledge: {
    profileMoved:
      'Your professional profile moved to the profile page — the explainer will not run without it.',
    profileMovedLink: 'Open profile',
    title: 'Archive',
    libraryDesc: 'AI explanations you have saved, grouped by topic.',
    tabs: {
      library: 'Library',
      vault: 'Synced notes',
      settings: 'Settings',
    },
    profile: {
      title: 'Professional profile',
      notSetUp:
        "You haven't set up a professional profile yet. Fill this in and save to create one.",
      /* The form's two questions. Seven equidistant fields could not say which field belonged
         with which; these two titles are what the rule between them divides. */
      groupRole: 'Current role',
      groupStyle: 'Your explainer',
      groupExperience: 'Work history',
      work: {
        hint: 'Past roles. Helps the AI pitch explanations, and feeds friend and project suggestions.',
        company: 'Company',
        role: 'Role',
        domain: 'Domain',
        durationMonths: 'Months',
        add: 'Add a role',
        remove: 'Remove role',
      },
      jobTitle: 'Job title',
      jobTitlePlaceholder: 'Backend engineer',
      seniority: 'Seniority',
      primaryRole: 'Primary role',
      years: 'Years of experience',
      explanationStyle: 'Explanation style',
      explanationStyleHint: 'Shapes how the AI phrases its explanations of posts.',
      techStack: 'Tech stack',
      /* Placeholders REPLACED the `Comma separated` hint (deleted): the comma is in the example,
         and the chips under the field show what the typed string parsed to. */
      techStackPlaceholder: 'React, TypeScript, PostgreSQL',
      domains: 'Interested domains',
      domainsPlaceholder: 'Fintech, Distributed systems',
      unset: 'Not set',
      save: 'Save profile',
      edit: 'Edit',
      cancel: 'Cancel',
      discard: 'Discard changes',
      unsaved: 'Unsaved changes',
      saved: 'Saved',
      loadError: 'Could not load your professional profile',
      saveError: 'Could not save your profile',
    },
    tokens: {
      title: 'Personal access tokens',
      /* Stays on screen whether or not tokens exist. `emptyDesc` used to be the only place that
         said what these are for, so the explanation vanished the moment somebody created their
         first one — exactly when they still needed it. */
      sectionHint:
        'A token lets the Obsidian plugin sync with your library. Point the plugin at ${url}.',
      create: 'Create token',
      createTitle: 'Create access token',
      createHint: 'For an external app (the Obsidian plugin) to sync your notes.',
      createdTitle: 'Token created',
      onceWarning:
        'This is the ONLY time this token is shown. Copy it now — it cannot be retrieved later.',
      name: 'Token name',
      nameHint: 'Name it so you can tell later which device it belongs to.',
      permission: 'Permission',
      /* The backend has no PATCH for a token, so this really is permanent. Saying so beats
         letting someone hunt for an edit control that was never built. */
      permissionLocked:
        'Permission cannot be changed later — to change it, revoke this token and create a new one.',
      expiry: 'Expires',
      expiryHint: 'A shorter life limits the damage if the token ever leaks.',
      expiry30: 'In 30 days',
      expiry90: 'In 90 days',
      expiry365: 'In a year',
      expiryNever: 'Never',
      copy: 'Copy',
      copied: 'Copied',
      /* The clipboard call can be denied outright. It used to fail into an empty catch, so the
         button simply did not react — indistinguishable from a click that worked, and the secret
         is gone once the dialog closes. */
      copyFailed: 'Could not copy — select the value above and copy it manually.',
      done: 'Done',
      cancel: 'Cancel',
      closeUncopiedTitle: 'Token not copied yet',
      closeUncopiedDesc:
        'You have not copied this token. Closing loses it for good — the only way to get another is to revoke this one and create a new token.',
      closeUncopiedCancel: 'Back to copying',
      closeUncopiedConfirm: 'Close anyway',
      nextSteps: 'Next steps',
      nextStep1: 'Open the Obsidian plugin settings.',
      nextStep2: 'Paste this token into the API token field.',
      nextStep3: 'Set the server address to ${url}.',
      revoke: 'Revoke',
      revokeAria: 'Revoke token ${name}',
      revokeTitle: 'Revoke this token?',
      revokeDesc:
        'Any app using "${name}" stops syncing immediately. This cannot be undone — you would have to create a new token and set the app up again.',
      revokeCancel: 'Keep token',
      revokeConfirm: 'Revoke',
      createdOn: 'Created ${date}',
      lastUsed: 'Last used ${date}',
      neverUsed: 'Never used',
      expiresOn: 'Expires ${date}',
      expiresInDays: 'Expires in ${days} days',
      expiresToday: 'Expires today',
      expired: 'Expired',
      expiredHint: 'Revoke it to tidy the list.',
      neverExpires: 'No expiry',
      emptyTitle: 'No tokens yet',
      emptyDesc: 'Create one so an external app can sync your library.',
      loadError: 'Could not load your tokens',
      createError: 'Could not create the token',
      revokeError: 'Could not revoke the token',
    },
    explain: {
      viewSource: 'View source post',
      action: 'Explain with AI',
      working: 'Asking the AI...',
      retry: 'Try again',
      regenerate: 'Regenerate',
      save: 'Save to library',
      saved: 'Saved',
      saveError: 'Could not save the explanation',
      error: 'Could not generate an explanation',
      // 429 from the explain endpoint (B32) — retrying just spends whatever allowance is left to
      // fail the same way, so this branch has no "Try again" button.
      rateLimited: 'The AI is overloaded or out of quota right now — try again in a few minutes.',
      // 503 — Gemini overloaded / timed out. Measured 30/08: can persist for minutes, so no
      // "in a moment" promise; the "Try again" button stays — this is a blip, not the quota wall.
      unavailable:
        "The AI is overloaded and couldn't generate the explanation right now. Try again in a few minutes.",
      profileRequired: 'You need a professional profile before using AI explanations.',
      profileRequiredCta: 'Set up your professional profile',
      byAi: 'Explained by AI',
      byAiNote: 'Model-generated — verify before relying on it',
      collapse: 'Collapse',
      expand: 'Expand',
      dismiss: 'Dismiss this explanation',
      complexity: 'Complexity ${score}/10',
      version: 'Version ${version}',
      concepts: 'Concepts',
      prerequisites: 'Prerequisites',
      links: 'Further reading',
      /* Regenerating spends Gemini quota. Without a note saying what was wrong, the second call
         asks the same question and bills for the same answer — `feedbackNote` has been on
         `ExplainRequestDto` all along and nothing was sending it. */
      feedbackLabel: 'What was unclear?',
      feedbackPlaceholder: 'e.g. the caching part stayed abstract — show me code',
      feedbackHint: 'Optional, but a regeneration without it usually returns the same answer.',
      feedbackSubmit: 'Regenerate',
      feedbackCancel: 'Cancel',
      download: 'Download .md',
      /* The switch makes visible a decision the product has been taking silently: whether the
         model is told what the reader already has notes about. */
      useVault: 'Use my vault notes',
      useVaultOn: 'The AI will see your note filenames, tags and links — not their contents.',
      useVaultOff: 'A plain explanation, with no reference to what you have already noted down.',
      referencedNotes: {
        title: 'Based on ${count} notes in your Vault',
        desc: 'The vault notes this answer draws on.',
        concept: 'concept: ${concept}',
      },
    },
    library: {
      title: 'Saved explanations',
      count: '${count} saved explanations',
      emptyTitle: 'Your library is empty',
      emptyDesc: 'Explain a post and save it, and it will show up here.',
      loadError: 'Could not load your library',
      countFiltered: '${count} of ${total} saved explanations',
      categoryLabel: 'Filter by topic',
      allCategories: 'All topics',
      emptyCategoryTitle: 'Nothing saved on this topic',
      emptyCategoryDesc: 'Pick another topic to see the rest of your library.',
    },
    /**
     * Downloading an explanation as a `.md` file, for readers who never install the plugin.
     *
     * The template is applied HERE, in the browser. A server-side template would only matter if
     * the Obsidian plugin read it, and `/sync/pull` returns JSON rather than markdown — the
     * plugin is what assembles the file, and it lives in another repository.
     */
    export: {
      title: 'Markdown download template',
      desc: 'Applied to the .md files you download from this page. Stored in this browser only.',
      templateLabel: 'Template',
      /* Placeholders are `{{name}}`, deliberately NOT `${name}`: the i18n `interpolate` would
         eat a `${...}` in this very hint and print it empty. */
      templateHint: 'Placeholders: ${placeholders}',
      reset: 'Reset to default',
      saved: 'Template saved',
    },
    /**
     * The notes the Obsidian plugin has pushed up.
     *
     * Until this screen existed, `push` stored up to 500 notes per request and nothing anywhere
     * let the person they belong to see them or remove them. The copy leans on saying what is and
     * is not true: this is the SERVER'S COPY, deleting it does not touch their own vault, and the
     * plugin will push the note again on its next sync.
     */
    vault: {
      title: 'Synced notes',
      desc: 'What your Obsidian plugin has pushed to the server. The AI uses these filenames, tags and links as context — never the note bodies.',
      count: '${count} notes',
      view: 'View',
      viewAria: 'View ${name}',
      delete: 'Delete',
      deleteAria: 'Delete ${name} from the server',
      deleteTitle: 'Delete this note from the server?',
      deleteDesc:
        'Removes the server\'s copy of "${name}". Your own vault is untouched — and the plugin will push this note back on its next sync unless you stop syncing it there.',
      deleteCancel: 'Keep it',
      deleteConfirm: 'Delete',
      deleteAll: 'Delete all',
      deleteAllTitle: 'Delete every synced note?',
      deleteAllDesc:
        "Removes the server's copy of all ${count} notes. Your own vault is untouched, and a token with two-way permission will push them all back on the next sync.",
      deleteAllConfirm: 'Delete all',
      deleted: 'Removed ${count} notes',
      loadMore: 'Load more',
      noTags: 'No tags',
      syncedOn: 'Synced ${date}',
      emptyTitle: 'Nothing synced yet',
      emptyDesc:
        'Notes appear here after a token with two-way permission pushes them from your vault.',
      loadError: 'Could not load your synced notes',
      noteError: 'Could not open that note',
      deleteError: 'Could not delete the note',
      viewLabel: 'View',
      viewList: 'List',
      viewGraph: 'Link graph',
      graph: {
        ariaLabel: 'Graph of links between your synced notes',
        openNoteAria: 'View note ${name}',
        unresolvedLinks: '${count} links point to notes that are not synced',
        truncated:
          'Showing the first ${count} notes — your vault has more; the graph may be incomplete.',
      },
    },
    /**
     * The tag filter: which vault notes may enter the AI's context.
     *
     * WHY THE WORDING IS CAREFUL. Before this filter the only choice a user had was binary and
     * lived somewhere else entirely — whether a token carried two-way permission. Somebody who
     * wanted the AI to see their technical notes but not their journal had to stop syncing the
     * whole vault.
     *
     * "EXCLUDE WINS" IS SAID OUT LOUD rather than left to be inferred. A note carrying both a tag
     * chosen above and a tag chosen below is dropped; the other way round would let a broad
     * inclusion quietly undo a deliberate exclusion, which on a privacy control is the mistake
     * that matters.
     *
     * Tags are stored WITHOUT a leading `#` and lower-cased — the server normalises on write.
     */
    vaultFilter: {
      title: 'Which notes the AI may use',
      desc: 'Pick by tag. Choosing nothing means every synced note is eligible — what this page did before the filter existed.',
      includeLabel: 'Only use notes tagged',
      includeHint: 'Leave empty for no restriction.',
      excludeLabel: 'Never use notes tagged',
      excludeHint:
        'Always beats the field above: a note picked there and excluded here is excluded.',
      allowAll: 'Right now: every synced note is eligible.',
      summaryInclude: 'Only notes carrying one of ${tags}.',
      summaryExclude: 'Skipping notes carrying ${tags}.',
      save: 'Save filter',
      saving: 'Saving…',
      saved: 'Filter saved',
      clear: 'Clear filter',
      /* Click a selected tag to unselect it — spelled out because a chip reads more like a static
         label than a button. */
      toggleAria: '${tag} — click to change',
      loadError: 'Could not load your filter',
      saveError: 'Could not save the filter',
      emptyTitle: 'No tags to filter on yet',
      emptyDesc:
        'The filter works on the tags in your notes. Once your vault pushes up tagged notes they appear here.',
    },
    seniority: {
      JUNIOR: 'Junior',
      MID: 'Mid',
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
      SECURITY: 'Security',
      QA: 'QA',
      OTHER: 'Other',
    },
    explanationStyle: {
      CONCISE: 'Concise',
      DETAILED: 'Detailed',
      CODE_HEAVY: 'Code-heavy',
      ANALOGY_HEAVY: 'Analogy-heavy',
    },
    /**
     * THESE LABELS DESCRIBE BEHAVIOUR, AND THE BEHAVIOUR IS BIGGER THAN "SYNC DIRECTION".
     *
     * `ExplanationService.loadVaultContext` returns null unless the user holds at least one
     * BIDIRECTIONAL token, so this field is also the on/off switch for "may the AI see my vault
     * at all". Nothing in the UI used to say that. The long labels do.
     */
    vaultPermission: {
      WRITE_ONLY: 'One-way — only pull explanations into the vault',
      BIDIRECTIONAL: 'Two-way — the vault sends notes up, the AI uses them as context',
    },
    /** For the list badge, where the row has no space for the sentence. */
    vaultPermissionShort: {
      WRITE_ONLY: 'One-way',
      BIDIRECTIONAL: 'Two-way',
    },
    vaultPermissionDesc: {
      WRITE_ONLY:
        'The app reads nothing from your vault. The AI explains without knowing what you have already noted down.',
      BIDIRECTIONAL:
        'Note filenames, tags and links are sent to the AI as context (note contents are not).',
    },
  },

  friends: {
    title: 'Friends',
    all: {
      title: 'All Friends',
      subtitle: '${count} friends',
      empty: {
        title: 'No friends yet',
        desc: 'Friends you connect with will show up here.',
      },
      allLoaded: "You've seen all your friends",
      unfriend: 'Unfriend',
      unfriendAria: 'Unfriend ${name}',
      unfriendTitle: 'Remove this friend?',
      unfriendDesc:
        'You and ${name} will no longer be friends. You can send a new request any time.',
      unfriendCancel: 'Keep friend',
      unfriendConfirm: 'Unfriend',
      unfriendError: 'Could not remove this friend',
    },
    suggestions: {
      title: 'Friend Suggestions',
      subtitle: 'People you may know',
      addFriend: 'Add Friend',
      ignore: 'Ignore',
      requestSent: 'Request Sent',
      suggestedForYou: 'Suggested for you',
      mutualFriends: '${count} mutual friend(s)',
      empty: {
        title: 'No suggestions',
        desc: "We'll suggest friends when there are matching people for you.",
      },
    },
    requests: {
      title: 'Friend Requests',
      subtitle: 'Manage your friend requests',
      tabReceived: 'Received',
      tabSent: 'Sent',
      confirm: 'Confirm',
      delete: 'Delete',
      cancelRequest: 'Cancel Request',
      awaiting: 'Awaiting response',
      receivedEmpty: {
        title: 'No friend requests',
        desc: 'When someone sends you a friend request, it will appear here.',
      },
      sentEmpty: {
        title: "You haven't sent any requests",
        desc: 'Friend requests you send will appear here.',
      },
    },
    action: {
      sendError: 'Could not send friend request',
    },
  },

  ledger: {
    label: 'Summary',
    evidence: 'Capability',
    // Two labels for one card: `matched` when `GET /projects/suggested` can rank against the
    // reader's professional profile, `hiring` when the list falls back to "newest still hiring" —
    // see `OpeningsSection`. Never one label for both: calling an unranked list a fit is a promise
    // the data does not carry.
    matched: 'Fits you',
    matchedOn: 'Matched:',
    hiring: 'Hiring now',
    external: 'From outside',
    contributions: 'contributions',
    recentWeeks: 'Last 18 weeks',
  },

  moderationMine: {
    title: 'Violations & appeals',
    tabs: {
      violations: 'My violations',
      appeals: 'Appeals',
    },
    loadError: 'Could not load your moderation history',
    emptyTitle: 'Nothing on record',
    emptyDesc: 'If one of your posts is removed, the record and your right to appeal appear here.',
    appealsEmptyTitle: 'No appeals yet',
    appealsEmptyDesc:
      'An appeal you submit from the violations tab shows up here with its outcome.',
    appeal: 'Appeal',
    appealPending: 'Appeal submitted, awaiting review',
    appealsTitle: 'Your appeals',
    appealTitle: 'Submit an appeal',
    appealDesc: 'Say why you think this decision is wrong. A person will read it and reply.',
    reasonLabel: 'Reason for the appeal',
    reasonPlaceholder: 'This post was about... and does not violate... because...',
    submitAppeal: 'Submit appeal',
    cancel: 'Cancel',
    submitError: 'Could not submit the appeal. Please try again.',
    status: {
      PENDING: 'Awaiting review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    },
  },
  projects: {
    matching: {
      // Since B26 the backend scores and sorts by `matchScore` — this is a real ranking now,
      // not an unordered set, so the label moved from "N people have" to "best match".
      title: '${count} best matches for this position',
      score: '${score} match score',
      years: '${count} yrs',
      unnamedRole: 'No job title set',
      more: 'and ${count} more',
    },
    suggested: {
      title: 'Projects that fit you',
      subtitle: 'Ranked against the skills and domains in your professional profile.',
    },
    title: 'Projects',
    tabs: {
      board: 'Project board',
      mine: 'My applications',
    },
    loadError: 'Could not load projects',
    emptyTitle: 'No projects yet',
    emptyDesc: 'Be the first to post a project and open a role.',
    openPositions: '${count} open roles',
    quantity: 'Needs ${count} people',
    backToBoard: 'Back to the board',
    apply: 'Apply',
    applyTitle: 'Apply · ${title}',
    applyDesc: 'Say briefly what you can do for this role. The owner reads exactly this.',
    messageLabel: 'Your application',
    messagePlaceholder: 'I have worked on... and could take on...',
    submitApplication: 'Send application',
    applyError: 'Could not send the application. The role may have closed.',
    cancel: 'Cancel',
    accept: 'Accept',
    reject: 'Reject',
    decisionError: 'Could not process this application. The role may have just filled up.',
    status: {
      OPEN: 'Open',
      CLOSED: 'Closed',
    },
    positionStatus: {
      OPEN: 'Open',
      FILLED: 'Filled',
      CLOSED: 'Closed',
    },
    applicationStatus: {
      PENDING: 'Pending',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
    },
    detail: {
      positions: 'Open roles',
      noPositions: 'This project has no roles yet',
      applications: 'Applications',
      noApplications: 'Nobody has applied yet',
      applicationsError: 'Could not load applications',
      notFoundTitle: 'Project not found',
      notFoundDesc: 'This project does not exist or has been removed.',
    },
    mine: {
      loadError: 'Could not load your applications',
      emptyTitle: 'You have not applied to anything',
      emptyDesc: 'Applications you send, and their outcomes, show up here.',
    },
    create: {
      action: 'Post a project',
      title: 'Post a new project',
      desc: 'Describe the project and the roles you need. Roles cannot be edited after posting.',
      projectTitle: 'Project name',
      projectTitlePlaceholder: 'e.g. A Vietnamese learning platform for developers',
      description: 'Project description',
      descriptionPlaceholder: 'What it does, where it is, what you need from people joining...',
      positions: 'Roles',
      positionsNote:
        'There is no endpoint to add or edit roles after posting — this list is final.',
      positionTitle: 'Role title',
      positionTitlePlaceholder: 'e.g. Backend Engineer',
      positionDescription: 'Role description',
      positionDescriptionPlaceholder: 'What this person will work on (optional)',
      positionQuantity: 'How many',
      positionQuantityHint: 'People needed for this role.',
      skills: 'Required skills',
      skillsPlaceholder: 'Comma-separated skills: Kotlin, PostgreSQL',
      addPosition: 'Add a role',
      removePosition: 'Remove role',
      tags: 'Tags',
      tagsPlaceholder: 'Optional, comma-separated: Blockchain, Fintech',
      banner: 'Banner image',
      bannerAdd: 'Upload banner',
      bannerRemove: 'Remove banner',
      bannerInvalid: 'Use a JPEG, PNG or WEBP under 20MB.',
      submit: 'Post project',
      error: 'Could not post the project. Please try again.',
    },
  },
  blocks: {
    block: 'Block',
    unblock: 'Unblock',
    cancel: 'Cancel',
    title: 'People you blocked',
    confirmTitle: 'Block ${name}?',
    confirmDesc:
      'Neither of you will see the other’s posts, and any existing friendship is deleted — unblocking later does not restore it.',
    blockError: 'Could not block this person. Please try again.',
    unblockError: 'Could not unblock this person. Please try again.',
    loadError: 'Could not load your block list',
    emptyTitle: 'You have not blocked anyone',
    emptyDesc: 'Blocked people disappear from your feed, your search results and your friends.',
    unknownUser: 'User',
  },
  /* ONE TOPIC TAXONOMY, THREE DOMAINS. `LearningCategory` is a `com.socialapp.common.enums` enum
     carried by books (`library`), saved AI explanations (`knowledge`) and learning tracks
     (`roadmap`) alike, so the nine labels live once, here at the top level, rather than three
     times inside those blocks. Each feature declares its own copy of the TYPE — see the note on
     `bookstore`'s `LearningCategory` for why — but the wording is what would actually have
     drifted, and this is the file that prevents it.

     `OTHER` is `Other`, not `Uncategorised`: every row that predates the columns carries it, so it
     is a shelf with books on it and reads better as a topic than as a confession. */
  learningCategory: {
    BACKEND: 'Backend',
    FRONTEND: 'Frontend',
    MOBILE: 'Mobile',
    DEVOPS: 'DevOps',
    DATA_ML: 'Data / ML',
    SECURITY: 'Security',
    QA: 'QA',
    CAREER: 'Career',
    OTHER: 'Other',
  },

  library: {
    tabs: {
      browse: 'Browse',
      purchased: 'Purchased',
      mine: 'My books',
    },
    title: 'Library',
    owned: 'Owned',
    loadError: 'Could not load the library',
    storageError: 'Books are unavailable: the file storage cannot be reached.',
    emptyTitle: 'The library is empty',
    emptyDesc: 'Books show up here as people publish them.',
    categoryLabel: 'Filter by topic',
    allCategories: 'All topics',
    emptyCategoryTitle: 'No books on this topic yet',
    emptyCategoryDesc: 'Try another topic, or browse all of them.',
    purchasedLoadError: 'Could not load your purchased books',
    purchasedEmptyTitle: "You haven't bought any books yet",
    purchasedEmptyDesc: 'Books you buy show up here, so you can come back and read them anytime.',
  },

  bookDetail: {
    back: 'Back to the library',
    untitled: 'Untitled book',
    pages: 'Pages',
    pageCount: '${count} pages',
    size: 'File size',
    downloads: 'Downloads',
    reviewsTitle: 'Reviews',
    // "Not available", not "does not exist": the endpoint answers 404 for a deleted book and 503
    // for one whose storage object is missing. The page cannot tell them apart, so it does not
    // claim to.
    notFoundTitle: 'This book is not available',
    notFoundDesc: 'It may have been removed, or its file cannot be reached right now.',
  },

  publicProfile: {
    /* Three tabs — Posts, Skills, GitHub — the atlas's Plate 03 split. Posts leads because a
       stranger following a shared link came to see what this person wrote, not a summary. */
    tabs: {
      posts: 'Posts',
      skills: 'Skills',
      github: 'GitHub',
    },
    skillsTitle: 'Verified skills',
    reputationTitle: 'Reputation',
    postsEmpty: 'No posts you can see',
    postsError: 'Could not load posts',
    notFoundTitle: 'No such person',
    notFoundDesc: 'There is no account with the handle @${username}.',
  },

  reputation: {
    remaining: 'needs',
    title: 'Elite Score',
    desc: 'Reputation earned from your contributions',
    // The viewer's variant — "your" on someone else's profile attributes their score to the reader.
    descOther: 'Reputation earned from their contributions',
    verifiedExpert: 'Verified Expert',
    toNextLevel: '${remaining} points to reach ${next}',
    topLevel: "You're at the top level",
  },

  profile: {
    network: {
      title: 'Your network',
      viewAll: 'All friends',
    },
    // The hero's text block, shared by `/profile` and `/u/{username}` because both routes build the
    // same `ProfileHero`. Under `profile` rather than `publicProfile`, which is the namespace of
    // the stranger's screen alone — these two strings are printed by both.
    // `verifiedSkills` does not inflect at 1, following `github.repos` and `notifications.unreadCount`.
    hero: {
      joined: 'Joined ${date}',
      verifiedSkills: '${count} verified skills',
    },
    /* WAS `dashboard.stats.*`, MOVED HERE WHEN `/dashboard` WAS DELETED. The route was absorbed
       into `/profile` at P5.2 and the redirect stub that kept its URL alive is gone now, so a
       top-level `dashboard` block was a heading for a page that no longer exists — the rest of
       that block (a greeting, a subtitle, two section titles) had had no reader since P5.2 and
       went with the route. These four are the only keys that still had one. */
    stats: {
      friends: 'Friends',
      friendsDesc: 'Total connections',
      pending: 'Pending',
      pendingDesc: 'Friend requests',
    },
    // Grouped by SURFACE rather than by owning feature, which is the convention already in force:
    // `features/bookstore` reads `post.book.*` on the feed card and `payment.*` on the result page.
    // These keys belong to the books section of `/profile`.
    books: {
      title: 'Your books',
      loadError: 'Could not load your books',
      emptyTitle: 'No books yet',
      emptyDesc: 'Books you publish from the composer show up here.',
      // On someone else's profile: the reader cannot publish on their behalf.
      emptyDescOther: 'This person has not published any books.',
      titleOther: 'Published books',
      delete: 'Delete',
      deleteAria: 'Delete ${title}',
      deleteTitle: 'Delete this book?',
      deleteDesc: '“${title}” will be removed for everyone. This cannot be undone.',
      deleteCancel: 'Cancel',
      deleteConfirm: 'Delete book',
      deleteError: 'Could not delete this book',
    },
    skills: {
      title: 'Your skills',
      /* The `Chuyên môn` tab's three sections are ordered by how hard the claim is to make: what
         you say you do → what the app has verified → what your code shows. That order used to
         live only in a source comment; these two lines (with `professionalHint`) say it aloud. */
      desc: 'What has been verified, including claims still waiting on a reviewer.',
      loadError: 'Could not load your skills',
      emptyTitle: 'No skills claimed yet',
      emptyDesc: 'Claim a skill from a roadmap and it shows up here.',
      // The viewer cannot claim a skill on someone else's behalf, so the instruction is wrong here.
      emptyDescOther: 'This person has no verified skills yet.',
      browseRoadmaps: 'Browse roadmaps',
      status: {
        verified: 'Verified',
        pending: 'Awaiting review',
        rejected: 'Rejected',
      },
    },
    github: {
      desc: 'What your public code shows.',
      moved: 'Connecting, syncing and unlinking GitHub live in settings now.',
    },
    professionalHint: 'Your explainer uses this profile to pitch answers at your level.',
    moderationPointer:
      'Any post of yours that was removed, and any appeal you have filed, live on their own page now.',
    moderationPointerCta: 'Open moderation',
    /* `title` is still read twice — the browser-tab title in `profile/layout.tsx` and the tab
       strip's `aria-label` — but NOT as a heading any more: the hero's `<h1>` is the person's
       name. `subtitle` went with the heading it belonged to; "manage your account settings"
       described what is now one tab of three. */
    title: 'Profile',
    uploadHint: 'Click to upload new photo (JPG, PNG, WebP, max 5MB)',
    /* The cover goes through `POST /v1/api/media`, not the avatar endpoint, so the ceiling is 20MB
       rather than 5MB — two numbers because two endpoints. GIF goes unmentioned: the media store
       takes it, this picker does not, and `ProfileCoverControl` carries the reason. */
    cover: {
      add: 'Add cover',
      change: 'Change cover',
      remove: 'Remove cover',
      hint: 'JPG, PNG or WebP, max 20MB',
      error: 'Could not set the cover. Please try again.',
    },
    id: 'ID: ${id}',
    /* THE PAGE IS THREE TABS NOW, and these are not the two keys that used to sit here.
       `info` / `password` named a tab pair that never shipped — both forms were rendered one
       under the other and nothing ever read the keys. The split that replaced them is the one
       the page actually has: what the app scores you at · what you can prove you do · the
       account itself. */
    tabs: {
      overview: 'Overview',
      professional: 'Professional',
      account: 'Account',
    },
    info: {
      title: 'Profile Information',
      desc: 'Update your display name',
      fullname: 'Full Name',
      save: 'Save changes',
      saving: 'Saving...',
      saved: 'Saved',
    },
    password: {
      title: 'Change Password',
      desc: 'Choose a strong password to secure your account',
      currentPassword: 'Current Password',
      currentPlaceholder: 'Enter your current password',
      newPassword: 'New Password',
      newPlaceholder: 'At least 6 characters',
      confirm: 'Confirm Password',
      confirmPlaceholder: 'Re-enter your password',
      update: 'Update password',
      updating: 'Updating...',
      updated: 'Password updated',
    },
  },

  chat: {
    messageUser: 'Message',
    messageUserError: 'Could not open the conversation. Please try again.',
    sayHi: 'Say hi to start the conversation!',
    chats: 'Chats',
    search: 'Search messages',
    noConversations: 'No conversations yet',
    all: 'All',
    unread: 'Unread',
    newChat: 'New message',
    selectConversation: 'Select a conversation',
    selectConversationDesc: 'Choose from your existing conversations, or start a new one.',
    startNewChat: 'Start a new conversation',
    searchFriends: 'Search friends...',
    noFriendsToMessage: 'No friends to message',
    addFriendsFirst: 'Add some friends first to start chatting.',
    creating: 'Opening...',
    back: 'Back',
    noResults: 'No results',
    filterLabel: 'Filter conversations',
    unknownPerson: 'User',
    messagePlaceholder: 'Write a message...',
    send: 'Send',
    loadError: 'Could not open this conversation',
    connecting: 'Connecting...',
    connectionError: 'Could not reach the chat service. Reload the page to try again.',
    unconfigured: 'Chat is not configured on the server.',
    startFailed: 'Could not open the conversation. Please try again.',
    peerNotReady:
      'This person has never used chat, so they cannot be messaged yet. Ask them to open Chats once.',
    newChatModeLabel: 'What kind of conversation',
    modeDirect: 'One person',
    modeGroup: 'Group',
    groupNamePlaceholder: 'Group name',
    createGroup: 'Create group',
    groupSelected: '${count} selected',
    groupNeedsMore: 'Pick ${count} more',
    groupFailed: 'Could not create the group. Please try again.',
    info: {
      label: 'Conversation details',
      // Does not inflect at 1, following `profile.hero.verifiedSkills` and `github.repos`.
      memberCount: '${count} members',
      verifiedSkills: 'Verified skills',
    },
  },

  /* The fire-and-forget notification stack (`shared/components/toast.tsx`) — for background
     actions with no field or form to put an inline banner next to. */
  toast: {
    dismiss: 'Dismiss',
  },

  /* The dialog `core/api/axios.ts`'s refresh-failure path raises instead of silently
     hard-redirecting to `/login`. See `features/security`'s `SessionExpiredPrompt`. */
  session: {
    expiredTitle: 'Your session has expired',
    expiredDesc: 'For your security, you were signed out. Sign in again to continue.',
    expiredCta: 'Sign in again',
  },
};

export type Messages = typeof en;
