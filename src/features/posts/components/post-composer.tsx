'use client';

import { useImperativeHandle, useState } from 'react';
import { ChevronDown, Eye, ListChecks, X } from 'lucide-react';
import { Avatar, Button, Card, Dialog, Select } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useMyProfile } from '@/features/security';
import { MentionTextarea } from '@/features/search';
import { useT } from '@/core/i18n';
import { applyTaggedMentions, type TaggedMention } from '../lib/tagged-mentions';
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
import { PostImagePicker } from './post-image-picker';
import { POST_TYPE_ICONS, PostTypeMenu } from './post-type-menu';
import { PostPreviewDialog } from './post-preview-dialog';
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
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * POSTING IS TWO STEPS NOW: the form's primary control is `Xem trước`, and `Đăng bài` lives
 * under the preview it opens (`post-preview-dialog.tsx`).
 *
 * WHY A STEP RATHER THAN A SIDE DOOR. An optional "preview" button beside "post" is the version
 * nobody presses, and this product gives the author no second chance worth relying on: a post
 * may enter `PENDING_MODERATION` the moment it is sent, editing is a separate flow on a card in
 * a feed, and a book post has already uploaded its file by the time anything is visible. The
 * cheapest place to catch "the code block is empty" or "this was going out publicly" is before
 * the request, not after it.
 *
 * THE TWO DIALOGS ARE MUTUALLY EXCLUSIVE, NOT STACKED. `Dialog` listens for Escape on the
 * document and locks `body` scroll while open, so two of them on screen at once means one
 * keypress dismissing both and two components fighting over the same style. Opening the preview
 * closes the form; going back reopens it. The draft is untouched either way, because the state
 * has always lived out here in the always-mounted launcher rather than inside a panel — the same
 * property that lets someone close the composer to check something in the feed.
 *
 * THE PREVIEW IS ONLY MOUNTED WHILE IT IS OPEN, and that is a correctness rule rather than a
 * saving: it renders `buildRequest()`, and the EVENT branch of `detailsFor` calls
 * `new Date(startTime!).toISOString()`, which THROWS on a half-filled event form. Building the
 * payload is safe exactly when `canSubmit` is true, which is exactly when this can be opened.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * THE DIALOG DESCRIPTION IS **NOT** THE KIT'S. The kit reads "Giới hạn 5 bài mỗi phút. Nội dung
 * trùng trong 60 giây sẽ bị…" — a rate limit and a duplicate-content rule. Neither exists:
 * `PostService` has no rate limiting and no duplicate check (measured). Printing them would
 * announce a guarantee the server does not make. The moderation hedge is used instead, because
 * it describes something that IS true, and it is more useful before posting than after.
 */
/**
 * What a host page can do to a mounted composer from the outside: open its dialog.
 *
 * A HANDLE RATHER THAN AN `open` PROP, because the draft is the reason this component exists in
 * its current shape. The file note above spells it out — every field of the form is held HERE, in
 * the always-mounted launcher, so that dismissing the dialog to check something in the feed is a
 * pause and not a discard. Lifting `open` into the page would put half of that state one level up
 * from the rest of it, and the page would then own a piece of a form it knows nothing about.
 * `open()` is the entire surface: the caller says "give me somewhere to write", the composer
 * decides what that means.
 */
export interface PostComposerHandle {
  /**
   * Open the compose dialog. With no argument it opens on whatever type and draft the composer is
   * currently holding; with one, it switches the kind on the way in — which is what the feed's
   * sticky bar does, since its menu is where the reader picks the kind.
   */
  open: (type?: PostType) => void;
}

export interface PostComposerProps {
  /** Called after a successful create, for the host page to refresh its feed. */
  onPosted?: () => void;
  /**
   * Exposes {@link PostComposerHandle}. React 19 passes `ref` as an ordinary prop, so there is no
   * `forwardRef` wrapper here.
   */
  ref?: React.Ref<PostComposerHandle>;
}

const VISIBILITIES: PostVisibility[] = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

const EMPTY_POLL: PollDetails = {
  allowMultipleVotes: false,
  options: Array.from({ length: POLL_MIN_OPTIONS }, (_, i) => ({
    id: i + 1,
    text: '',
    votesCount: 0,
  })),
};

export function PostComposer({ onPosted, ref }: PostComposerProps) {
  const t = useT();
  const { data: profile } = useMyProfile();
  const [content, setContent] = useState('');
  /**
   * Friends the author picked from the `@` dropdown. Readable `@username` tokens live in
   * `content`; `applyTaggedMentions` turns the ones still present into `@[i]` + `taggedUserIds`
   * at submit. The backend forbids tags on a PRIVATE post, so they are dropped for that visibility.
   */
  const [taggedMentions, setTaggedMentions] = useState<TaggedMention[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [location, setLocation] = useState<LocationResolution | undefined>();
  const [postType, setPostType] = useState<PostType>('REGULAR');
  const [justPosted, setJustPosted] = useState(false);
  const [open, setOpen] = useState(false);
  // The confirm step. Never true at the same time as `open` — see the file note.
  const [preview, setPreview] = useState(false);

  // The whole external surface — see `PostComposerHandle`. `/newsfeed`'s sticky filter bar uses
  // it to offer a way in once this card has scrolled off the top.
  useImperativeHandle(
    ref,
    () => ({
      open: (type?: PostType) => {
        if (type) setPostType(type);
        setOpen(true);
      },
    }),
    []
  );

  const [code, setCode] = useState<CodeSnippetDetails>({ language: 'plaintext', code: '' });
  const [article, setArticle] = useState<ArticleDetails>({});
  const [poll, setPoll] = useState<PollDetails>(EMPTY_POLL);
  const [link, setLink] = useState<LinkDetails>({});
  const [book, setBook] = useState<CreateBookRequest>({ title: '' });
  const [event, setEvent] = useState<EventDetails>({});
  const [bookFile, setBookFile] = useState<File | undefined>();
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [bookFileError, setBookFileError] = useState<string | undefined>();

  /**
   * URLs of pictures already uploaded for this draft.
   *
   * URLS, NOT `File`s, AND THAT IS THE ENDPOINT'S SHAPE RATHER THAN A CHOICE. `CreatePostRequestDto.images`
   * is a `string[]`; the files go to `POST /v1/api/media` first and this holds what came back. So
   * unlike `bookFile` below — which really is a `File`, because the book route is multipart and
   * takes the bytes itself — this is already-stored state by the time the post is submitted.
   *
   * IT LIVES ON EVERY KIND, not inside `detailsFor`. `images` sits on the request beside
   * `content`, not inside any of the six details blocks, so an ARTICLE and a REGULAR post can both
   * carry pictures — which is also why `PostImages` renders outside the body switch.
   */
  const [images, setImages] = useState<string[]>([]);

  // The quiz rides on any kind, so it is switched on separately from `postType`. `undefined`
  // means no `quizDetails` key in the payload at all — which is what keeps
  // `validateQuizDetails` from running.
  const [quiz, setQuiz] = useState<QuizDetails | undefined>();

  const reset = () => {
    setContent('');
    setTaggedMentions([]);
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
    setImages([]);
    setQuiz(undefined);
    setJustPosted(true);
    // The panel closes on success, so the confirmation has to land somewhere that is still on
    // screen — it renders under the launcher, not inside the dialog that just went away. Both
    // panels are cleared: the create is confirmed from the preview, so that is the one actually
    // on screen at this point, and `open` is already false.
    setOpen(false);
    setPreview(false);
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
  /**
   * THE WHOLE NAME, NOT THE LAST WORD. Cutting a Vietnamese name down to its given name is the
   * right instinct — `Trúc Anh` is addressed as `Anh` — but the given name is very often a word
   * that is ALSO a pronoun: `Anh`, `Em`, `Chị`. `Anh đang nghĩ gì vậy?` then stops reading as
   * "hello, Anh" and starts reading as the product picking a gendered pronoun for someone it
   * never asked. A full name can only ever read as a name.
   */
  const fullName = profile?.fullName?.trim() ?? '';

  // Tagging is dropped on a PRIVATE post (the backend rejects it). `resolvedTags` is what actually
  // survives into the request — a picked friend whose `@username` was later deleted from the text
  // is not counted.
  const taggingAllowed = visibility !== 'PRIVATE';
  const resolvedTags = applyTaggedMentions(trimmed, taggedMentions);
  const applied = taggingAllowed
    ? resolvedTags
    : { content: trimmed, taggedUserIds: [] as number[] };
  const activeTagUsernames = taggedMentions
    .filter((m) => resolvedTags.taggedUserIds.includes(m.userId))
    .sort(
      (a, b) =>
        resolvedTags.taggedUserIds.indexOf(a.userId) - resolvedTags.taggedUserIds.indexOf(b.userId)
    );
  // PRIVATE + a tag still in the text: the backend would 400. Block submit and say why.
  const privateTagConflict = !taggingAllowed && resolvedTags.taggedUserIds.length > 0;

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
  const canSubmit =
    isReady && (quiz === undefined || isQuizReady(quiz)) && !privateTagConflict && !pending;

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

  /**
   * The payload, assembled in one place because TWO things read it now: `submit` sends it and the
   * preview renders it. Building it twice — once for the screen, once for the wire — is how a
   * preview starts lying, since every rule below (the trim, the stripped blank options, the ISO
   * conversion) would have to be repeated verbatim in the other copy.
   *
   * NOT SAFE TO CALL AT ANY TIME: the EVENT branch of `detailsFor` converts `startTime` with
   * `new Date(...).toISOString()`, which throws on a blank field. Both callers are behind
   * `canSubmit`.
   */
  const buildRequest = (): CreatePostRequest => ({
    // `@username` tokens the author picked become `@[i]` placeholders here, matched to
    // `taggedUserIds` in the same order — the shape `PostService.validateTags` requires.
    content: applied.content,
    visibility,
    postType,
    ...(applied.taggedUserIds.length > 0 && { taggedUserIds: applied.taggedUserIds }),
    // Spread the resolved candidate's own fields: the response mirrors the create request's
    // location shape on purpose. The legacy composer instead sent a flattened `location`
    // object, a key `CreatePostRequestDto` does not have — so every location it collected
    // was silently discarded by the backend.
    ...(location && {
      googlePlaceId: location.googlePlaceId,
      locationType: location.locationType,
      locationDetails: location.locationDetails,
    }),
    // Omitted entirely when empty rather than sent as `[]`. `updatePost` runs
    // `BeanUtils.copyProperties`, which copies nulls, so the two are not the same thing on the
    // edit path — and a create that sends `images: []` would teach the next reader they are.
    ...(images.length > 0 && { images }),
    // Blank options are stripped and the correct index re-pointed at the same option before
    // it leaves — see `normalizeQuiz`.
    ...(quiz && { quizDetails: normalizeQuiz(quiz) }),
    ...detailsFor(postType),
    /* THE BOOK'S OWN BLOCK IS PART OF THE REQUEST, not something `submit` bolts on at the last
       moment. It travels as the `metadata` part of the multipart call rather than as a JSON
       body, but it is the same object either way — and the preview has to be able to see the
       title and the price it is about to show. Only on `BOOK`: `BeanUtils.copyProperties` would
       happily store a `bookDetails` sent on an ARTICLE. */
    ...(postType === 'BOOK' && {
      bookDetails: { ...book, title: (book.title ?? '').trim() },
    }),
  });

  const submit = () => {
    if (!canSubmit) return;
    setJustPosted(false);

    const request = buildRequest();

    if (postType === 'BOOK') {
      // `bookFile` is non-null here: `isReady` already refused to let `canSubmit` be true
      // without it, for the same reason the server refuses the call. `bookDetails` is on the
      // request because `buildRequest` puts it there for exactly this kind — restated for the
      // type system, which cannot see that the branch and the spread test the same value.
      createBook.mutate({
        metadata: { ...request, bookDetails: request.bookDetails! },
        bookFile: bookFile!,
        coverFile,
      });
      return;
    }

    create.mutate(request);
  };

  const typeLabel = t(`createPost.type.${postType}`);
  /* `REGULAR` is the only kind whose placeholder carries the name, and `useMyProfile` is a
     query — until it lands there is no name to carry, and `` đang nghĩ gì vậy?`` opening on a
     space is worse than a sentence that never mentions you. */
  const placeholder =
    postType === 'REGULAR' && !fullName
      ? t('createPost.contentPlaceholderNoName')
      : t(`createPost.contentPlaceholder.${postType}`, { fullname: fullName });

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
        {/* `element`, not `pair`. The pair rung means "two elements that are one reading";
            an avatar, a field and a type menu are three separate things you can act on.
            The kit sets `gap: var(--nx-space-element)` on this row. */}
        <div className="flex items-center gap-[var(--nx-space-element)]">
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
           * THE TYPE MENU MOVED HERE FROM THE FORM, and picking a type OPENS the dialog in the
           * same gesture — `PostTypeMenu` carries that argument, along with the list itself and
           * the `REGULAR` rule. It lives in its own file because `/newsfeed`'s sticky bar offers
           * the same list from an icon once this card has scrolled away.
           */}
          <PostTypeMenu
            current={postType}
            onSelect={(type) => {
              setPostType(type);
              setOpen(true);
            }}
            trigger={
              <Button
                className="h-[34px]"
                size="sm"
                variant="secondary"
                icon={POST_TYPE_ICONS[postType]}
              >
                {typeLabel}
                {/* THE CHEVRON IS WHAT SAYS "THERE IS A LIST BEHIND THIS".
                    Without it the control is an icon and a word inside a bordered box — the same
                    shape as the composer's own field to its left and as any secondary button, so
                    nothing on it distinguished "this opens a menu" from "this submits something".
                    A trailing chevron is the one convention every reader already has for it.

                    `aria-hidden` because `Menu` already gives the trigger its `aria-haspopup` and
                    `aria-expanded`; announcing a glyph on top of that says it twice. */}
                <ChevronDown className="size-4 shrink-0 text-nx-text-muted" aria-hidden />
              </Button>
            }
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
            {/* THE FORM NO LONGER POSTS — it hands over to the preview, which is where `Đăng bài`
                now lives. Same gate (`canSubmit`), one step later, and the label says which of
                the two this button is: a reader who sees "Xem trước" cannot mistake it for the
                irreversible one. */}
            <Button
              icon={<Eye />}
              disabled={!canSubmit}
              onClick={() => {
                setOpen(false);
                setPreview(true);
              }}
            >
              {t('createPost.preview.open')}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <MentionTextarea
            autoResize
            rows={2}
            value={content}
            onChange={setContent}
            onMentionPicked={(row) => {
              if (row.id == null || !row.username) return;
              setTaggedMentions((prev) =>
                prev.some((m) => m.userId === row.id)
                  ? prev
                  : [...prev, { userId: row.id!, username: row.username! }]
              );
            }}
            // A PRIVATE post cannot carry tags — turn the dropdown off rather than let someone
            // build a tag the backend will reject.
            mentionsDisabled={!taggingAllowed}
            // `#` completes against real, used tags (`GET /v1/api/hashtags/suggest`). There is
            // nothing to resolve at submit like `@` mentions are — `CreatePostRequestDto` has no
            // `hashtags` field, the backend extracts `#tags` from `content` after posting — so this
            // is purely a completion aid. On for every visibility: a private post keeps its tags.
            hashtagSuggestions
            placeholder={placeholder}
            aria-label={t('createPost.post')}
          />

          {activeTagUsernames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeTagUsernames.map((m) => (
                <span
                  key={m.userId}
                  className="inline-flex items-center gap-1 rounded-nx-full bg-nx-accent-soft px-2 py-0.5 text-nx-caption text-nx-text-accent"
                >
                  @{m.username}
                  <button
                    type="button"
                    aria-label={t('createPost.tag.chipRemove', { name: m.username })}
                    onClick={() => {
                      setTaggedMentions((prev) => prev.filter((x) => x.userId !== m.userId));
                      setContent((c) =>
                        c.replace(new RegExp(`(^|\\s)@${m.username}\\b`, 'g'), '$1')
                      );
                    }}
                    className="hover:text-nx-text-primary"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}

          {privateTagConflict && (
            <p role="alert" className="text-nx-micro text-nx-status-danger-fg">
              {t('createPost.tag.privateWarning')}
            </p>
          )}

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

          {/* PICTURES SIT OUTSIDE THE KIND PANEL, DIRECTLY UNDER THE TEXT THEY BELONG TO. `images`
              is on the request beside `content`, not inside any of the six details blocks, so
              every kind can carry them — putting the control inside the panel would have hidden it
              on `REGULAR`, which is the kind most likely to want a photograph. Above the quiz and
              the location row because it is part of composing the post rather than an attachment
              to it. */}
          <PostImagePicker
            value={images}
            onChange={setImages}
            disabled={pending}
            // ARTICLE and LINK each carry their own image field (a cover, a thumbnail); without a
            // name these body pictures read as if they were that same image. The other kinds have
            // nothing to confuse them with, so the control stays bare there.
            label={
              postType === 'ARTICLE' || postType === 'LINK'
                ? t('createPost.images.label')
                : undefined
            }
            hint={
              postType === 'ARTICLE'
                ? t('createPost.images.hintArticle')
                : postType === 'LINK'
                  ? t('createPost.images.hintLink')
                  : undefined
            }
          />

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
              // `wrapperClassName`, not `className` — sizing the field left the chevron outside
              // the box. See `Select`'s own note.
              wrapperClassName="w-fit"
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

      {/* Mounted only while it is open — see the file note: `buildRequest()` throws on a
          half-filled EVENT, and this is reachable only from behind `canSubmit`. */}
      {preview && (
        <PostPreviewDialog
          open
          onBack={() => {
            setPreview(false);
            setOpen(true);
          }}
          onConfirm={submit}
          pending={pending}
          uploadProgress={postType === 'BOOK' ? createBook.progress : undefined}
          error={error}
          author={{
            // `GET /profile/me` answers a `UserResponse`, which carries no Elite Score — so the
            // card's reputation chip is absent here rather than defaulted to 0, the same rule
            // `PostCard` states for a payload that did not send one. Everything else on the
            // identity row is real.
            id: profile?.id ?? 0,
            username: profile?.username,
            fullName: profile?.fullName,
            profilePictureUrl: profile?.profilePictureUrl,
          }}
          request={buildRequest()}
          taggedNames={activeTagUsernames.map((m) => m.username)}
          location={location}
          bookFile={bookFile}
          coverFile={coverFile}
        />
      )}
    </>
  );
}
