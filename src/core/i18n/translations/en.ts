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
      all: 'All',
      friends: 'Friends',
      // Names the CONTENT, the way its three neighbours do — the old `/trending` named a sort
      // order instead.
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
  },

  notifications: {
    title: 'Notifications',
    subtitle: 'Activity involving you, and how you want to hear about it',
    unreadCount: '${count} unread',
    allRead: "You're all caught up",
    unreadMarker: 'Unread',
    markAllRead: 'Mark all as read',
    error: 'Could not load notifications. Please try again.',
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
    title: 'Search',
    resultsFor: 'Results for "${query}"',
    prompt: 'Type something and press Enter to search',
    promptTitle: 'Search for something',
    emptyTitle: 'No results',
    errorTitle: 'Search failed',
    clear: 'Clear search',
    unknownPerson: 'Unknown user',
    untitledBook: 'Untitled book',
    free: 'Free',
    price: '${price} đ',
    priceUnknown: 'Price unavailable',
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
    subtitle: 'Learning tracks, and the skills on them.',
    list: {
      loadFailed: 'Could not load the roadmaps',
      empty: 'No roadmaps yet',
      emptyDesc: 'Roadmaps show up here once an admin creates them.',
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
    // `All topics`, not `All`: this chip sits directly under the feed's `All` tab, one word
    // meaning two unrelated things.
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
      titleHint: 'Optional — nothing reads the page for you, so type it yourself.',
      description: 'Link description',
      thumbnailUrl: 'Thumbnail URL',
      thumbnailUrlHint: 'Optional. Paste a link to an image.',
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
      /* The server never sends the answer key back — the feed carries the reader's copy of the
         quiz — so saving rewrites it from whatever is on screen. See `post-editor.tsx`. */
      quizKeyLost:
        'The correct answers are not sent back to this screen, so saving would clear them. Mark the right answer on each question again before saving.',
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
      unavailable: 'Unavailable',
      download: 'Download',
    },
  },

  knowledge: {
    profileMoved:
      'Your professional profile moved to the profile page — the explainer will not run without it.',
    profileMovedLink: 'Open profile',
    title: 'Archive',
    subtitle: 'Your sync tokens and saved explanations.',
    profile: {
      title: 'Professional profile',
      notSetUp:
        "You haven't set up a professional profile yet. Fill this in and save to create one.",
      /* The form's two questions. Seven equidistant fields could not say which field belonged
         with which; these two titles are what the rule between them divides. */
      groupRole: 'Current role',
      groupStyle: 'Your explainer',
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
      discard: 'Discard changes',
      unsaved: 'Unsaved changes',
      saved: 'Saved',
      loadError: 'Could not load your professional profile',
      saveError: 'Could not save your profile',
    },
    tokens: {
      title: 'Personal access tokens',
      create: 'Create token',
      createTitle: 'Create access token',
      createHint: 'For an external app (the Obsidian plugin) to sync your notes.',
      createdTitle: 'Token created',
      onceWarning:
        'This is the ONLY time this token is shown. Copy it now — it cannot be retrieved later.',
      name: 'Token name',
      nameHint: 'Name it so you can tell later which device it belongs to.',
      permission: 'Permission',
      copy: 'Copy',
      copied: 'Copied',
      done: 'Done',
      cancel: 'Cancel',
      revoke: 'Revoke',
      lastUsed: 'Last used ${date}',
      neverUsed: 'Never used',
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
      profileRequired:
        'You need a professional profile before using AI explanations — fill in the form above and try again.',
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
    },
    library: {
      title: 'Saved explanations',
      count: '${count} saved explanations',
      emptyTitle: 'Your library is empty',
      emptyDesc: 'Explain a post and save it, and it will show up here.',
      loadError: 'Could not load your library',
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
    vaultPermission: {
      WRITE_ONLY: 'Read from app only',
      BIDIRECTIONAL: 'Two-way',
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
  },

  ledger: {
    label: 'Summary',
    evidence: 'Capability',
    hiring: 'Hiring now',
    external: 'From outside',
    contributions: 'contributions',
    recentWeeks: 'Last 18 weeks',
  },

  moderationMine: {
    title: 'Violations & appeals',
    loadError: 'Could not load your moderation history',
    emptyTitle: 'Nothing on record',
    emptyDesc: 'If one of your posts is removed, the record and your right to appeal appear here.',
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
      title: '${count} people already have the skills this position asks for',
      years: '${count} yrs',
      unnamedRole: 'No job title set',
      more: 'and ${count} more',
    },
    title: 'Projects',
    subtitle: 'Find people to build with, or a place to contribute.',
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
      skills: 'Required skills',
      skillsPlaceholder: 'Comma-separated skills: Kotlin, PostgreSQL',
      addPosition: 'Add a role',
      removePosition: 'Remove role',
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
    loadError: 'Could not load your block list',
    emptyTitle: 'You have not blocked anyone',
    emptyDesc: 'Blocked people disappear from your feed, your search results and your friends.',
    unknownUser: 'User',
  },
  library: {
    tabs: {
      browse: 'Browse',
      mine: 'Written by me',
    },
    title: 'Library',
    subtitle: 'Books published by the community',
    owned: 'Owned',
    loadError: 'Could not load the library',
    storageError: 'Books are unavailable: the file storage cannot be reached.',
    emptyTitle: 'The library is empty',
    emptyDesc: 'Books show up here as people publish them.',
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
    /* Three tabs, deliberately NOT the same three as `profile.tabs`: there is no account here to
       administer, and what a stranger came to see — what this person has made — is worth a tab of
       its own rather than a third of one. */
    tabs: {
      overview: 'Overview',
      work: 'Work',
      posts: 'Posts',
    },
    skillsTitle: 'Verified skills',
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
    },
    professionalHint: 'Your explainer uses this profile to pitch answers at your level.',
    professionalHintLink: 'Go to Knowledge',
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
    minimize: 'Minimize',
    close: 'Close',
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
    openChat: 'Open chat',
    expand: 'Reopen chat window',
    info: {
      label: 'Conversation details',
      verifiedSkills: 'Verified skills',
    },
  },
};

export type Messages = typeof en;
