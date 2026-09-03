'use client';

import { useEffect, useMemo, type MouseEvent, type ReactNode } from 'react';
import { Eye, ListChecks, Pencil } from 'lucide-react';
import { Badge, Button, Dialog, ProgressBar } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { renderTaggedPlaceholders } from '../lib/tagged-mentions';
import type { LocationResolution } from '../types/location';
import type { CreatePostRequest } from '../types/post';
import { ArticleBody } from './article-body';
import { BookBody, type BookBodySummary } from './book-body';
import { bookFileExtension } from './book-post-fields';
import { CodeSnippetBody } from './code-snippet-body';
import { EventBody } from './event-body';
import { LinkBody } from './link-body';
import { PollBody } from './poll-body';
import { PostCard, type PostCardAuthor } from './post-card';
import { PostImages } from './post-images';
import { QnaBody } from './qna-body';

/**
 * The confirm step of the composer: the draft rendered as the card it is about to become, with
 * `Đăng bài` under it.
 *
 * IT TAKES THE REQUEST, NOT THE FORM STATE, and that is the whole reason this is worth having.
 * The composer holds one draft per kind plus a location, a visibility and a quiz; what the
 * server stores is `buildRequest()` — one details block, trimmed content, blank poll options
 * stripped, `datetime-local` converted to ISO, the quiz normalised. Previewing the form state
 * would preview something that is not what gets posted, and the two would drift the moment
 * `detailsFor` learns a new rule. So the composer builds the payload once and both this dialog
 * and `submit` read the same object.
 *
 * IT REUSES THE FEED'S OWN COMPONENTS — `PostCard` and the seven bodies — rather than drawing a
 * lookalike. A preview built separately from the thing it previews is a promise the product has
 * to keep by hand forever; this one cannot go out of date, because it IS the card.
 * `features/newsfeed` maps its payload into exactly these props (`feed-post.tsx`) and this file
 * does the same mapping from the create request. Nothing is imported from newsfeed: that would
 * point posts → newsfeed, the wrong way round (CLAUDE.md §4).
 *
 * WHAT THE PREVIEW HONESTLY CANNOT SHOW, and therefore does not fake:
 *  - **Hashtags.** `CreatePostRequestDto` has no `hashtags` field — the backend extracts them
 *    from the content after the post is saved. Reimplementing that parser here would show tags
 *    the server may not agree with.
 *  - **The reaction strip and the comment thread.** Both belong to a post that exists; there is
 *    nothing to react to yet, and a dead row of glyphs invites a click that cannot work.
 *  - **The quiz, as a quiz.** `QuizTaker` answers against a `postId`, which does not exist yet,
 *    so an attached quiz is summarised in one line instead of rendered playable.
 *  - **Moderation.** A post can land in `PENDING_MODERATION` and never reach the feed at all,
 *    which is what the dialog's note says rather than promising this card will appear.
 *
 * The prose and the code block are shown WHOLE here: their "Xem thêm" exits lead to
 * `/posts/{id}`, and this post has no id yet. Uncut is the honest version of that — see
 * `PostCard`'s `expanded`.
 */
export interface PostPreviewDialogProps {
  open: boolean;
  /** Back to the composer with the draft intact. Also what Escape and the scrim do. */
  onBack: () => void;
  /** Commit — the composer's `submit`. */
  onConfirm: () => void;
  pending: boolean;
  /**
   * BOOK only: the book file's upload progress (0–100) while `pending`. Omitted for every other
   * kind, whose payload is small enough that a bar would flash and vanish.
   */
  uploadProgress?: number;
  /**
   * The failed create, if the last confirm failed. Rendered here because this is the dialog on
   * screen when it happens.
   */
  error?: unknown;
  author: PostCardAuthor;
  /** Exactly what `submit` is about to send — see the file note. */
  request: CreatePostRequest;
  /**
   * Display names for `taggedUserIds`, in the same order, so the card can show `@Ada Lovelace`
   * where the request carries `@[0]`. The request always keeps the placeholder form.
   */
  taggedNames?: string[];
  /** The resolved place, in the shape `PostCard` takes; the request carries it flattened. */
  location?: LocationResolution;
  /** BOOK only: the file is not uploaded yet, so its format and size are read off the `File`. */
  bookFile?: File;
  /** BOOK only: previewed through a local object URL, since there is no stored cover yet. */
  coverFile?: File;
}

/**
 * The type-specific body, mirroring `feed-post.tsx`'s switch — same components, same order, fed
 * from the create request instead of the feed payload. Kept out of `PostCard` for the reason that
 * component states: it renders a body it is handed and never inspects `postType`.
 */
function PreviewBody({
  request,
  bookFile,
  coverUrl,
}: {
  request: CreatePostRequest;
  bookFile?: File;
  coverUrl?: string;
}): ReactNode {
  switch (request.postType) {
    case 'CODE_SNIPPET':
      // No `href`: `CodeSnippetBody` documents that a caller which cannot name a destination gets
      // the snippet whole, and a draft has no permalink to name.
      return request.codeSnippetDetails ? (
        <CodeSnippetBody details={request.codeSnippetDetails} />
      ) : null;
    case 'ARTICLE':
      // ARTICLE leads through the card's `header` slot, above the prose — mirrors
      // `feed-post.tsx`. `articleDetails` is the title and summary; `content` is the body copy.
      return null;
    case 'QNA':
      return request.qnaDetails ? <QnaBody details={request.qnaDetails} /> : null;
    case 'POLL':
      // The normalised options — blanks already stripped by `detailsFor`, every count 0, which is
      // what a poll nobody has voted in actually looks like.
      return request.pollDetails ? <PollBody details={request.pollDetails} /> : null;
    case 'LINK':
      return request.linkDetails ? <LinkBody details={request.linkDetails} /> : null;
    case 'EVENT':
      // No `actions`: RSVP and the calendar pair both write against a postId that does not exist
      // yet.
      return request.eventDetails ? <EventBody details={request.eventDetails} /> : null;
    case 'BOOK': {
      if (!request.bookDetails) return null;
      /**
       * ASSEMBLED FROM TWO SOURCES, because the book post is the one kind whose payload is split:
       * the metadata goes as JSON and the bytes go as file parts, so the format and the size are
       * knowable only from the `File` the author picked. `bookId`, `totalPages`, `avgRating` and
       * `reviewCount` are absent on purpose — the server produces them after the upload, and
       * `BookBody` already renders without them (no id means the title is a heading rather than a
       * link to a book that has no number).
       */
      const summary: BookBodySummary = {
        title: request.bookDetails.title,
        description: request.bookDetails.description,
        coverImageUrl: coverUrl,
        fileFormat: bookFile ? bookFileExtension(bookFile.name).toUpperCase() : undefined,
        fileSizeBytes: bookFile?.size,
        price: request.bookDetails.price,
      };
      return <BookBody book={summary} />;
    }
    default:
      // REGULAR carries no details block — its whole body is the card's `content`.
      return null;
  }
}

export function PostPreviewDialog({
  open,
  onBack,
  onConfirm,
  pending,
  uploadProgress,
  error,
  author,
  request,
  taggedNames,
  location,
  bookFile,
  coverFile,
}: PostPreviewDialogProps) {
  const t = useT();

  /**
   * The cover has not been uploaded yet, so the only way to show it is the local file. `useMemo`
   * rather than an effect because the URL is DERIVED from the file; the effect below exists
   * solely to hand the string back when it changes or the composer goes away — a page that lets
   * someone swap covers a dozen times should not leak a dozen blobs.
   */
  const coverUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : undefined),
    [coverFile]
  );
  useEffect(() => {
    if (!coverUrl) return;
    return () => URL.revokeObjectURL(coverUrl);
  }, [coverUrl]);

  /**
   * `PostCard` links its timestamp to `/posts/{postId}` and the author's name to `/u/{username}`.
   * Both are real links on a real card and neither can work here: there is no post yet, and
   * following the author link would navigate away from the draft — which, because the composer
   * lives on a page rather than at a route of its own, means losing everything typed.
   *
   * Swallowed at the CAPTURE phase and with `stopPropagation`, not `preventDefault` alone: React
   * dispatches capture handlers before the target's own, so stopping here is what keeps `Link`'s
   * client-side navigation from running at all. The card stays readable and focusable; it simply
   * goes nowhere, which is the truthful behaviour for a post that does not exist.
   */
  const swallowNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a')) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const questionCount = request.quizDetails?.questions?.length ?? 0;
  const quizTitle = request.quizDetails?.title?.trim();
  // Resolved up here rather than inside the JSX: `error` is `unknown`, so `{error && …}` is an
  // `unknown` expression that React cannot be handed. A string is a string.
  const errorMessage = error == null ? undefined : getErrorMessage(error);

  return (
    <Dialog
      open={open}
      // Escape and the scrim go BACK to the form rather than throwing the draft away: this is a
      // confirm step, and dismissing a confirmation should return you to what you were confirming.
      onClose={onBack}
      // Wider than the composer's 560. This is the only surface in the product whose job is to
      // show a feed card at something like its real width, and a card squeezed into a narrower
      // panel than the feed gives it would preview a layout nobody will ever see.
      width={620}
      maxHeight="85vh"
      title={t('createPost.preview.title')}
      description={t('createPost.preview.note')}
      footer={
        <>
          <Button variant="ghost" icon={<Pencil />} onClick={onBack} disabled={pending}>
            {t('createPost.preview.back')}
          </Button>
          <Button onClick={onConfirm} disabled={pending} loading={pending}>
            {pending ? t('createPost.posting') : t('createPost.post')}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* VISIBILITY IS SAID IN WORDS HERE AND NOWHERE ELSE ON A CARD. The card itself does not
            carry it — the feed only ever shows you posts you are already allowed to see — so the
            last moment anyone can catch "wait, is this going out publicly?" is this one. */}
        <div className="flex flex-wrap items-center gap-2">
          <Eye className="size-4 shrink-0 text-nx-text-muted" aria-hidden />
          <span className="text-nx-body-sm text-nx-text-secondary">
            {t('createPost.visibilityLabel')}
          </span>
          <Badge variant="neutral">{t(`createPost.visibility.${request.visibility}`)}</Badge>
        </div>

        {/* The sunken tray is what says "this is a picture of a card, not a card you are using".
            Without it the preview reads as a second feed that happens to hold one post. */}
        <div
          onClickCapture={swallowNavigation}
          className="rounded-nx-md bg-nx-surface-sunken py-[var(--nx-space-pad-y)] px-[var(--nx-space-pad)]"
        >
          <PostCard
            // There is no id yet. It reaches nothing but `data-post-id` and the two links above,
            // which are swallowed.
            postId={0}
            author={author}
            // Read at render, so the card says "Vừa xong" — which is what it will say the moment
            // it does land in the feed.
            createdAt={new Date().toISOString()}
            content={renderTaggedPlaceholders(request.content ?? '', taggedNames ?? [])}
            location={location}
            postType={request.postType}
            // Uncut: the cap's "Xem thêm" leads to a permalink this post does not have yet.
            expanded
            // An ARTICLE's cover, title and summary lead the card, above the body copy.
            header={
              request.postType === 'ARTICLE' && request.articleDetails ? (
                <ArticleBody details={request.articleDetails} />
              ) : undefined
            }
            // Attached pictures close the card, below the body and location — the order the feed
            // renders them in.
            media={<PostImages images={request.images} />}
            body={
              <>
                <PreviewBody request={request} bookFile={bookFile} coverUrl={coverUrl} />

                {/* SUMMARISED, NOT PLAYED. See the file note: `QuizTaker` submits against a
                    postId, so the honest preview of an attachment that cannot run yet is a line
                    saying it is attached and how big it is. */}
                {request.quizDetails && (
                  <div className="flex items-center gap-2 rounded-nx-sm border border-nx-border-default bg-nx-surface-raised p-3">
                    <ListChecks className="size-4 shrink-0 text-nx-text-muted" aria-hidden />
                    <span className="min-w-0 text-nx-body-sm text-nx-text-secondary">
                      {quizTitle
                        ? t('createPost.preview.quizAttachedTitled', {
                            title: quizTitle,
                            count: questionCount,
                          })
                        : t('createPost.preview.quizAttached', { count: questionCount })}
                    </span>
                  </div>
                )}
              </>
            }
          />
        </div>

        {/* A book file can take a while to go up — show how far along rather than a spinner that
            says nothing. Kept visible at 100 until the request settles (server-side processing). */}
        {pending && uploadProgress != null && (
          <ProgressBar value={uploadProgress} label={t('createPost.posting')} />
        )}

        {/* The create failed with this dialog on screen, so this is where the reason belongs —
            sending the author back to the form to read it would hide the button they need to
            press again. */}
        {errorMessage && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {errorMessage}
          </p>
        )}
      </div>
    </Dialog>
  );
}
