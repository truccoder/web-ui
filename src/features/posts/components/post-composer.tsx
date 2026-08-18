'use client';

import { useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Code2,
  FileText,
  HelpCircle,
  Link2,
  ListChecks,
  MessageSquare,
  X,
} from 'lucide-react';
import { Avatar, Button, Card, Dialog, Menu, Select, Textarea } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useMyProfile } from '@/features/security';
import { useT } from '@/core/i18n';
import { useCreateBookPost, useCreatePost } from '../hooks/use-post';
import type { LocationResolution } from '../types/location';
import type {
  ArticleDetails,
  CodeSnippetDetails,
  CreateBookRequest,
  CreatePostRequest,
  EventDetails,
  LinkDetails,
  PollDetails,
  PostType,
  PostVisibility,
  QuizDetails,
} from '../types/post';
import { ArticleFields } from './article-fields';
import {
  BOOK_FILE_EXTENSIONS,
  BOOK_FILE_MAX_BYTES,
  BookPostFields,
  bookFileExtension,
} from './book-post-fields';
import { CodeSnippetFields } from './code-snippet-fields';
import { EventFields } from './event-fields';
import { LinkFields, isValidLinkUrl } from './link-fields';
import { LocationPicker } from './location-picker';
import { PollFields, POLL_MIN_OPTIONS } from './poll-fields';
import { QnaFields } from './qna-fields';
import { QuizComposer, emptyQuiz, isQuizReady, normalizeQuiz } from './quiz-composer';

/**
 * The post composer. It covers all eight kinds: `REGULAR` (P2.4c-1), `CODE_SNIPPET`,
 * `ARTICLE`, `QNA`, `POLL`, `LINK` (P2.4c-3), `BOOK` (P2.4c-4) and finally `EVENT` (P2.4″d),
 * plus the quiz attachment.
 *
 * TWO ENDPOINTS, NOT ONE. Six kinds go to `POST /v1/api/posts` as JSON. `BOOK` cannot:
 * `PostService.createPost` throws a 400 the moment it sees `postType: 'BOOK'`, because a book
 * post carries file parts and must go to `POST /v1/api/posts/books` as multipart. Which call
 * `submit` makes is therefore decided by the selected kind, not by whether a file happens to be
 * attached.
 *
 * `EVENT` ARRIVED LAST, in cycle 3, and its arrival is what deleted the temporary
 * `create-event-form.tsx` bridge that had been sitting under this composer since P2.4d. Until
 * then the switcher deliberately had no `EVENT` entry: an entry that cannot produce a post is
 * worse than no entry. Its panel is the only one whose values are not payload-shaped — see
 * `detailsFor`.
 *
 * THE QUIZ IS AN ATTACHMENT, NOT A KIND, because the backend models it that way: there is no
 * `QUIZ` in `PostType`, and `validateQuizDetails` runs for any post carrying `quizDetails`. It
 * sits beside the location picker for the same reason.
 *
 * THE LEGACY PDF PREVIEW IS NOT PORTED. The old book form rendered page one with `react-pdf`
 * and counted the pages so the author could choose `previewPages` below the total (a rule
 * `BookService.generatePreview` does enforce). It is cut for three reasons: it only ever worked
 * for PDF, so the 400 stays reachable for EPUB and has to be handled well regardless; its
 * pdf.js worker is fetched from `unpkg.com` at runtime, which puts a third-party CDN in the
 * critical path of an app that otherwise speaks only to its own backend; and the server's error
 * names the actual total, so recovery is one edit rather than a guess. Revisit if the backend
 * ever reports a page count before upload.
 *
 * ONE STATE PER KIND, ONLY THE ACTIVE ONE SENT. `PostService.buildAndSavePost` copies the
 * request onto the entity with `BeanUtils.copyProperties`, which does not care whether a details
 * block matches `postType` — send `pollDetails` on an `ARTICLE` and it is stored anyway. So the
 * payload is assembled from exactly one key. Keeping the drafts separate rather than clearing
 * them on switch means flipping kinds to compare does not destroy what was typed.
 *
 * SUBMIT GATES ARE FRONTEND-ONLY. The backend validates just `EVENT` and an attached quiz;
 * `CODE_SNIPPET`, `ARTICLE`, `QNA`, `POLL` and `LINK` would all be accepted empty. The
 * per-kind checks in `isReady` exist to stop junk posts, and must not be described to anyone as
 * server rules.
 *
 * `onPosted` exists because the read side of a post lives in **another** domain: the feed.
 * Rather than invalidate `newsfeed`'s query keys from inside `posts` (which would hardcode
 * another feature's cache and fail the extraction test, CLAUDE.md §4), the composing page
 * passes a callback and refreshes its own feed. Same reasoning as the hooks layer.
 *
 * The success line is deliberately hedged: `PostService` saves new posts as
 * `PENDING_MODERATION` whenever moderation is enabled, so a freshly posted item may not
 * appear in the feed at all. Claiming "posted!" and showing nothing is how a working app
 * looks broken.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * R5-2: THE COMPOSER IS A LAUNCHER, THE FORM IS A DIALOG — and this is a bigger change than
 * "make it one line".
 *
 * Measured off the rendered kit rather than read off the spec, because the spec sentence
 * ("composer in one line", `layout-r7.md` §5.2) is the one thing prose gets wrong here. In the
 * kit the composer is 68px tall and holds exactly three things: a 32px avatar, a **`button`
 * styled to look like a text field**, and the type `Menu`. There is no textarea in it, no
 * visibility select, and NO POST BUTTON — the whole form lives in a `Dialog` 560 wide, titled
 * `Soạn bài · <type>`, whose footer is `Huỷ` + `Đăng bài`. `component-specs.md` confirms the
 * width from the other direction: "A confirm has no fields, so it never needs the composer's
 * 560".
 *
 * So the composer is not a small form; it is a **launcher for a form**. That is what buys the
 * top of the product's first screen — the most expensive space in the app was being spent on a
 * control most people touch once a session. R4-4 already made this argument when it collapsed
 * the nine type chips into a `Menu`; this finishes the same argument.
 *
 * THE DRAFT SURVIVES CLOSING, and that is why every piece of state stays HERE rather than
 * moving into the dialog. `Dialog` renders nothing while closed, so state held inside it would
 * be destroyed the moment someone dismissed the panel to check something in the feed. Holding
 * it in the always-mounted launcher costs nothing and makes the field-shaped button able to
 * show the draft back — closing is a pause, not a discard.
 *
 * NO TYPE SWITCHER INSIDE THE DIALOG, matching the kit and `feed-r12.md` §2.1: the type is
 * chosen once, by the composer's own menu, and the dialog title is where that choice is
 * confirmed. The panel's old `Bỏ` header went with it — it existed to name the type and to get
 * back to `REGULAR`, and the title now does the first while the launcher menu does the second.
 *
 * THE DIALOG DESCRIPTION IS **NOT** THE KIT'S. The kit reads "Giới hạn 5 bài mỗi phút. Nội dung
 * trùng trong 60 giây sẽ bị…" — a rate limit and a duplicate-content rule. Neither exists:
 * `PostService` has no rate limiting and no duplicate check (measured). Printing them would
 * announce a guarantee the server does not make. The moderation hedge is used instead, because
 * it describes something that IS true, and it is more useful before posting than after.
 */
export interface PostComposerProps {
  /** Called after a successful create, for the host page to refresh its feed. */
  onPosted?: () => void;
}

const VISIBILITIES: PostVisibility[] = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

/** Kinds this composer can actually produce, in switcher order. `REGULAR` is the default state. */
const SWITCHABLE_TYPES = [
  'CODE_SNIPPET',
  'ARTICLE',
  'QNA',
  'POLL',
  'LINK',
  'BOOK',
  'EVENT',
] as const;
/**
 * Keyed by `PostType`, not `SwitchableType`: the menu now labels itself with the CURRENT kind,
 * and the current kind can be `REGULAR` — which `SWITCHABLE_TYPES` deliberately excludes because
 * the old chip row only ever rendered the kinds you were not on.
 */
const TYPE_ICONS: Record<PostType, ReactNode> = {
  REGULAR: <MessageSquare />,
  CODE_SNIPPET: <Code2 />,
  ARTICLE: <FileText />,
  QNA: <HelpCircle />,
  POLL: <BarChart3 />,
  LINK: <Link2 />,
  BOOK: <BookOpen />,
  EVENT: <Calendar />,
};

const EMPTY_POLL: PollDetails = {
  allowMultipleVotes: false,
  options: Array.from({ length: POLL_MIN_OPTIONS }, (_, i) => ({
    id: i + 1,
    text: '',
    votesCount: 0,
  })),
};

export function PostComposer({ onPosted }: PostComposerProps) {
  const t = useT();
  const { data: profile } = useMyProfile();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [location, setLocation] = useState<LocationResolution | undefined>();
  const [postType, setPostType] = useState<PostType>('REGULAR');
  const [justPosted, setJustPosted] = useState(false);
  const [open, setOpen] = useState(false);

  const [code, setCode] = useState<CodeSnippetDetails>({ language: 'plaintext', code: '' });
  const [article, setArticle] = useState<ArticleDetails>({});
  const [poll, setPoll] = useState<PollDetails>(EMPTY_POLL);
  const [link, setLink] = useState<LinkDetails>({});
  const [book, setBook] = useState<CreateBookRequest>({ title: '' });
  const [event, setEvent] = useState<EventDetails>({});
  const [bookFile, setBookFile] = useState<File | undefined>();
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [bookFileError, setBookFileError] = useState<string | undefined>();

  // The quiz rides on any kind, so it is switched on separately from `postType`. `undefined`
  // means no `quizDetails` key in the payload at all — which is what keeps
  // `validateQuizDetails` from running.
  const [quiz, setQuiz] = useState<QuizDetails | undefined>();

  const reset = () => {
    setContent('');
    setLocation(undefined);
    setPostType('REGULAR');
    setCode({ language: 'plaintext', code: '' });
    setArticle({});
    setPoll(EMPTY_POLL);
    setLink({});
    setBook({ title: '' });
    setEvent({});
    setBookFile(undefined);
    setCoverFile(undefined);
    setBookFileError(undefined);
    setQuiz(undefined);
    setJustPosted(true);
    // The panel closes on success, so the confirmation has to land somewhere that is still on
    // screen — it renders under the launcher, not inside the dialog that just went away.
    setOpen(false);
    onPosted?.();
  };

  const create = useCreatePost({ onSuccess: reset });
  const createBook = useCreateBookPost({ onSuccess: reset });

  // One pair of flags for both calls: the form does not care which endpoint served it, only
  // whether something is in flight and whether the last attempt failed.
  const pending = create.isPending || createBook.isPending;
  const error = create.error ?? createBook.error;

  /**
   * `BookService.validateFile` checks the **filename extension**, not the MIME type, and
   * Spring's multipart config rejects anything over 20MB before the handler runs. Both are
   * cheaper to catch here than after uploading.
   */
  const selectBookFile = (file?: File) => {
    if (!file) {
      setBookFile(undefined);
      setBookFileError(undefined);
      return;
    }
    if (!BOOK_FILE_EXTENSIONS.includes(bookFileExtension(file.name) as 'pdf' | 'epub')) {
      setBookFile(undefined);
      setBookFileError(t('createPost.book.fileInvalidFormat'));
      return;
    }
    if (file.size > BOOK_FILE_MAX_BYTES) {
      setBookFile(undefined);
      setBookFileError(t('createPost.book.fileTooLarge'));
      return;
    }
    setBookFile(file);
    setBookFileError(undefined);
  };

  const trimmed = content.trim();
  const firstName = profile?.fullName?.trim().split(/\s+/).pop() ?? '';

  // What each kind needs before submitting is worth anything. `content` is the article body and
  // the Q&A question, so those two still require it; a snippet, poll or link carries its own
  // substance in its details block and may stand without prose.
  const isReady = (() => {
    switch (postType) {
      case 'CODE_SNIPPET':
        return (code.code ?? '').trim().length > 0;
      case 'ARTICLE':
        return (article.title ?? '').trim().length > 0 && trimmed.length > 0;
      case 'QNA':
        return trimmed.length > 0;
      case 'POLL':
        return (
          (poll.question ?? '').trim().length > 0 &&
          (poll.options ?? []).filter((option) => (option.text ?? '').trim().length > 0).length >=
            POLL_MIN_OPTIONS
        );
      case 'LINK':
        return isValidLinkUrl(link.url);
      // Real server rules too: `validateEventDetails` demands a title, both timestamps, and an
      // end that is not before the start.
      case 'EVENT':
        return (
          (event.eventTitle ?? '').trim().length > 0 &&
          Boolean(event.startTime) &&
          Boolean(event.endTime) &&
          new Date(event.endTime!).getTime() >= new Date(event.startTime!).getTime()
        );
      // The only branch whose conditions are real server rules rather than frontend manners:
      // `validateBookDetails` demands a non-blank title, `validateFile` demands the file, and
      // `buildAndSaveBook` demands `previewPages > 0` once a price is set.
      case 'BOOK':
        return (
          (book.title ?? '').trim().length > 0 &&
          bookFile !== undefined &&
          bookFileError === undefined &&
          ((book.price ?? 0) <= 0 || (book.previewPages ?? 0) > 0)
        );
      default:
        return trimmed.length > 0;
    }
  })();

  // An attached quiz gates every kind, because `validateQuizDetails` runs for every kind.
  const canSubmit = isReady && (quiz === undefined || isQuizReady(quiz)) && !pending;

  /** Exactly one details key, chosen by `postType` — see the note on `BeanUtils` above. */
  const detailsFor = (type: PostType): Partial<CreatePostRequest> => {
    switch (type) {
      case 'CODE_SNIPPET':
        return { codeSnippetDetails: code };
      case 'ARTICLE':
        return { articleDetails: article };
      // Not author input: an empty object is what keeps `acceptAnswer` reachable later, since it
      // rejects any QNA post whose `qnaDetails` is null. See `qna-fields.tsx`.
      case 'QNA':
        return { qnaDetails: { isResolved: false } };
      case 'POLL':
        return {
          pollDetails: {
            ...poll,
            options: (poll.options ?? [])
              .filter((option) => (option.text ?? '').trim().length > 0)
              .map((option, index) => ({ ...option, id: index + 1, text: option.text?.trim() })),
          },
        };
      case 'LINK':
        return { linkDetails: link };
      // The only kind whose panel keeps its values in a different format from the payload:
      // `datetime-local` speaks local `YYYY-MM-DDTHH:mm` and the backend parses ISO-8601, so
      // the conversion happens here, once, rather than in the field (which would have to parse
      // back on every render to fill the input).
      case 'EVENT':
        return {
          eventDetails: {
            ...event,
            eventTitle: event.eventTitle?.trim(),
            startTime: new Date(event.startTime!).toISOString(),
            endTime: new Date(event.endTime!).toISOString(),
          },
        };
      default:
        return {};
    }
  };

  const submit = () => {
    if (!canSubmit) return;
    setJustPosted(false);

    const base: CreatePostRequest = {
      content: trimmed,
      visibility,
      postType,
      // Spread the resolved candidate's own fields: the response mirrors the create request's
      // location shape on purpose. The legacy composer instead sent a flattened `location`
      // object, a key `CreatePostRequestDto` does not have — so every location it collected
      // was silently discarded by the backend.
      ...(location && {
        googlePlaceId: location.googlePlaceId,
        locationType: location.locationType,
        locationDetails: location.locationDetails,
      }),
      // Blank options are stripped and the correct index re-pointed at the same option before
      // it leaves — see `normalizeQuiz`.
      ...(quiz && { quizDetails: normalizeQuiz(quiz) }),
      ...detailsFor(postType),
    };

    if (postType === 'BOOK') {
      // `bookFile` is non-null here: `isReady` already refused to let `canSubmit` be true
      // without it, for the same reason the server refuses the call.
      createBook.mutate({
        metadata: { ...base, bookDetails: { ...book, title: (book.title ?? '').trim() } },
        bookFile: bookFile!,
        coverFile,
      });
      return;
    }

    create.mutate(base);
  };

  const typeLabel = t(`createPost.type.${postType}`);
  const placeholder = t(`createPost.contentPlaceholder.${postType}`, { fullname: firstName });

  return (
    <>
      {/**
       * THE LAUNCHER. One row, three controls, 34px tall — see the file note for why it is a
       * launcher rather than a form.
       *
       * THE FIELD IS A `button`, NOT AN `input`, and the kit is explicit about it. A real input
       * here would be a second place to type the same post: focus it, type a sentence, and the
       * dialog would have to either carry that text over or throw it away, and whichever it did
       * would surprise half the people who tried. A button has one behaviour — it opens the
       * thing you actually write in — and it can still SHOW the draft, which is the only job the
       * input shape was doing.
       */}
      <Card className="w-full">
        <div className="flex items-center gap-[var(--nx-space-pair)]">
          <Avatar src={profile?.profilePictureUrl} name={profile?.fullName} size="md" />

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'flex h-[34px] min-w-0 flex-1 items-center rounded-nx-sm border border-nx-border-default bg-nx-surface-raised px-2.5 text-left text-nx-ui',
              'transition-colors hover:bg-nx-surface-hover',
              trimmed ? 'text-nx-text-primary' : 'text-nx-text-faint'
            )}
          >
            <span className="truncate">{trimmed || placeholder}</span>
          </button>

          {/**
           * THE TYPE MENU MOVED HERE FROM THE FORM, and picking a type now OPENS the dialog in
           * the same gesture. Splitting them would make choosing `Câu hỏi` do nothing visible —
           * the panel that asks for the question is behind a second click nobody was told about.
           *
           * `REGULAR` IS IN THE LIST though it is not in `SWITCHABLE_TYPES` (see R4-4): the old
           * chip row could never offer a way back to a plain post because it only rendered the
           * types you were not on. A menu has room to say it, and now it is the ONLY way back —
           * the panel's `Bỏ` header went away with the inline form.
           */}
          <Menu
            width={220}
            trigger={
              <Button size="sm" variant="secondary" icon={TYPE_ICONS[postType]}>
                {typeLabel}
              </Button>
            }
            items={[
              {
                label: t('createPost.type.REGULAR'),
                icon: TYPE_ICONS.REGULAR,
                onSelect: () => {
                  setPostType('REGULAR');
                  setOpen(true);
                },
              },
              '-',
              ...SWITCHABLE_TYPES.filter((type) => type !== postType).map((type) => ({
                label: t(`createPost.type.${type}`),
                icon: TYPE_ICONS[type],
                onSelect: () => {
                  setPostType(type);
                  setOpen(true);
                },
              })),
            ]}
          />
        </div>

        {/* The confirmation lives under the launcher rather than in the dialog, because the
            dialog is gone by the time there is anything to confirm. */}
        {justPosted && !pending && (
          <p className="mt-3 rounded-nx-sm bg-nx-status-info-bg px-3 py-2 text-nx-body-sm text-nx-status-info-fg">
            {t('createPost.submittedPendingReview')}
          </p>
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        maxHeight="80vh"
        title={t('createPost.dialogTitle', { type: typeLabel })}
        // NOT `submittedPendingReview`, which is the *after* message and opens with "Đã gửi bài".
        // Read before posting it claims the post is already sent. Same fact, correct tense.
        description={t('createPost.dialogNote')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('createPost.cancel')}
            </Button>
            <Button onClick={submit} disabled={!canSubmit} loading={pending}>
              {/* A book post uploads a file, so it can be slow enough that "Đang đăng..." is not
                  enough of a signal on its own — the button also stays disabled throughout. */}
              {pending ? t('createPost.posting') : t('createPost.post')}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Textarea
            autoResize
            rows={2}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={placeholder}
            aria-label={t('createPost.post')}
          />

          {/* NO HEADER ON THIS PANEL ANY MORE. It used to carry the type's name and a `Bỏ`
              button; the dialog title names the type, and the launcher's menu is the way back to
              a plain post. Two places saying the same word was the thing worth removing — the
              panel is now just the fields the type needs. */}
          {postType !== 'REGULAR' && (
            <div className="flex flex-col gap-3 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3">
              {postType === 'CODE_SNIPPET' && <CodeSnippetFields value={code} onChange={setCode} />}
              {postType === 'ARTICLE' && <ArticleFields value={article} onChange={setArticle} />}
              {postType === 'QNA' && <QnaFields />}
              {postType === 'POLL' && <PollFields value={poll} onChange={setPoll} />}
              {postType === 'LINK' && <LinkFields value={link} onChange={setLink} />}
              {postType === 'EVENT' && <EventFields value={event} onChange={setEvent} />}
              {postType === 'BOOK' && (
                <BookPostFields
                  value={book}
                  onChange={setBook}
                  bookFile={bookFile}
                  coverFile={coverFile}
                  onBookFileChange={selectBookFile}
                  onCoverFileChange={setCoverFile}
                  fileError={bookFileError}
                />
              )}
            </div>
          )}

          {quiz && (
            <div className="flex flex-col gap-3 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-nx-body-sm font-semibold text-nx-text-primary">
                  {t('createPost.quiz.label')}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<X />}
                  onClick={() => setQuiz(undefined)}
                  aria-label={t('createPost.quiz.remove')}
                >
                  {t('createPost.quiz.remove')}
                </Button>
              </div>

              <QuizComposer value={quiz} onChange={setQuiz} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <LocationPicker value={location} onChange={setLocation} />

            {/* Beside the location picker rather than in the kind switcher: a quiz attaches to
                any kind, so it is never an alternative to one. */}
            {!quiz && (
              <Button
                size="sm"
                variant="ghost"
                icon={<ListChecks />}
                onClick={() => setQuiz(emptyQuiz())}
              >
                {t('createPost.quiz.label')}
              </Button>
            )}

            {/* Visibility sits with the other two attachment-shaped controls rather than in the
                footer: all three answer "what else is true about this post", while the footer is
                for committing it. The kit's footer holds only `Huỷ` and `Đăng bài`. */}
            <Select
              size="sm"
              className="w-auto"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as PostVisibility)}
              aria-label={t('createPost.visibilityLabel')}
              options={VISIBILITIES.map((value) => ({
                value,
                label: t(`createPost.visibility.${value}`),
              }))}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
            >
              {getErrorMessage(error)}
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
