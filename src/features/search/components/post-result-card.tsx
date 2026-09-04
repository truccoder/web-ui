'use client';

import Link from 'next/link';
import { BookOpen, MessageCircle, Star } from 'lucide-react';
import {
  ACTION_GLYPH,
  ACTION_GLYPH_BUTTON,
  ACTION_GROUP,
  ArticleBody,
  CodeSnippetBody,
  LinkBody,
  PollBody,
  PostCard,
  QnaBody,
  ReactionBar,
} from '@/features/posts';
import { useT } from '@/core/i18n';
import { useIntlLocale } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { SearchBook, SearchPost } from '../types/search';
import { derivePostKind } from '../lib/post-kind';

/**
 * One post in the results — now drawn by `PostCard` itself, the same card the feed and the
 * permalink render.
 *
 * The owner's note was "dùng style có sẵn (của post) thay vì random": this file used to
 * re-implement the identity row, the prose and the footer by hand on a bare `<div>`, which drifted
 * from the real card. `PostCard` takes decomposed props precisely so `features/search` can reuse it
 * (see its own file note), so the job here is just the mapping `SearchPost` → those props.
 *
 * ACTION STRIP: REACT, YES · COMMENT COUNT, NO. `PostDto` (the search payload's post shape) DOES
 * carry `reactionSummary` — the same per-type map `FeedPostDataDto` has — so `ReactionBar` works
 * here exactly as it does on the feed: it owns its own fetch (`useMyReaction`) and its own mutation
 * (`useUpsertReaction`/`useRemoveReaction`), neither of which needs anything from this DTO beyond
 * `postId`. What `PostDto` genuinely lacks is `commentCount` — unlike the feed payload, search never
 * grew one — so there is no reliable signal for "does this post have comments to preview", and
 * `CommentPreview` treats an absent count as zero and renders nothing. The comment glyph is shown
 * anyway, as a plain link to the permalink with no number beside it: the same "absent count reads as
 * not-supplied, not zero" rule `PostCard`'s own footer already applies to `commentCount`.
 *
 * `onChanged` ON THE BAR IS A NO-OP HERE, deliberately. `useSearch`'s own note says a search result
 * is "a pure function of the term plus whatever the database held", never invalidated by a mutation
 * elsewhere in the app — reacting does not change whether a post matches `q`, so there is nothing to
 * refetch the way the feed refetches to pick up a moved count.
 *
 * `postType` IS DERIVED, NOT CARRIED. Same gap as the body switch below: `derivePostKind` (already
 * built for the Posts tab's own filter) reads back which details block is non-null, once, and feeds
 * both the badge row `PostCard` draws and the `body` switch here.
 *
 * STILL NO MENU. Edit needs `PostEditorState` built from every field the update DTO can send —
 * `images`, `taggedUserIds`, `hashtags`, the location trio — and `PostDto` here carries none of
 * them; mapping the fields that exist and leaving the rest `undefined` is exactly the
 * `BeanUtils.copyProperties`-strips-what-it-is-not-given bug `feed-post.tsx`'s own note (`toEditorState`)
 * was written to stop happening a second time. Delete/report do not have that hazard, but the
 * omission is left as one line rather than split into a report-only menu — a future pass with a
 * concrete need for it should draw it, not this one.
 */
export interface PostResultCardProps {
  post: SearchPost;
  className?: string;
}

/**
 * The book behind a book post. Kept local — `BookBody` from `features/posts` expects the feed's
 * richer book summary, and this one has exactly one caller.
 */
function BookLine({ book }: { book: SearchBook }) {
  const t = useT();
  const localeTag = useIntlLocale();

  const row = (
    <>
      {book.coverImageUrl ? (
        // MinIO presigned URLs expire and are not a configured `next/image` remote pattern.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImageUrl}
          alt=""
          className="h-10 w-7 shrink-0 rounded-nx-xs border border-nx-border-subtle object-cover"
        />
      ) : (
        <div className="grid h-10 w-7 shrink-0 place-items-center rounded-nx-xs bg-nx-surface-sunken">
          <BookOpen className="size-3.5 text-nx-text-muted" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-nx-body-sm font-medium text-nx-text-primary">
          {book.title ?? t('search.untitledBook')}
        </p>

        <div className="flex items-center gap-2 text-nx-caption text-nx-text-muted">
          {book.avgRating !== null && (
            <>
              <span className="flex items-center gap-0.5">
                <Star className="size-2.5 fill-current text-nx-rep" />
                {book.avgRating.toFixed(1)}
              </span>
              <span>·</span>
            </>
          )}

          <span>
            {book.isFree
              ? t('search.free')
              : book.price !== null
                ? t('search.price', { price: book.price.toLocaleString(localeTag) })
                : t('search.priceUnknown')}
          </span>
        </div>
      </div>
    </>
  );

  const base =
    'mt-2 flex items-center gap-2 rounded-nx-md border border-nx-border-subtle px-2 py-2';

  return book.id != null ? (
    <Link
      href={`/books/${book.id}`}
      className={cn(base, 'hover:border-nx-border-strong hover:bg-nx-surface-hover')}
    >
      {row}
    </Link>
  ) : (
    <div className={base}>{row}</div>
  );
}

export function PostResultCard({ post, className }: PostResultCardProps) {
  const t = useT();
  const postId = post.id ?? 0;

  // `reactionSummary` is a per-type map (`{ LIKE: 3, INSIGHT: 1, … }`), same shape the feed's
  // `PostCard` never sees directly — `FeedPostDataDto` flattens it to a single `likeCount` before
  // it gets here, but search's `PostDto` does not, so the total is summed once at the call site.
  const totalReactions = post.reactionSummary
    ? Object.values(post.reactionSummary).reduce((sum, n) => sum + (n ?? 0), 0)
    : undefined;

  return (
    <PostCard
      className={className}
      postId={postId}
      author={{
        id: post.authorId ?? 0,
        // `PostDto` carries the handle now, the same field the feed payload grew — so a result
        // reaches its author instead of naming them. Absent keeps the plain-text name.
        username: post.authorUsername,
        fullName: post.authorFullName,
        profilePictureUrl: post.authorProfilePictureUrl,
        eliteScore: post.authorEliteScore,
        levelName: post.authorLevelName,
      }}
      // The DTO is `OffsetDateTime` now (measured at F-C), so no zone-patching — `''` only if the
      // payload genuinely carried nothing, which search does not do.
      createdAt={post.createdAt ?? ''}
      content={post.content}
      // Derived, not carried — see the file note. Only feeds the badge row; nothing here branches
      // on it the way the feed's `PostBody` switch does.
      postType={derivePostKind(post)}
      // An article's title and summary read before the body copy in `content` — same order as
      // the feed card.
      header={post.articleDetails ? <ArticleBody details={post.articleDetails} /> : undefined}
      body={
        <>
          {/* An event post's title lives in `eventName`; `content` above is its description. */}
          {post.eventName && (
            <p className="text-nx-ui font-medium text-nx-text-primary">{post.eventName}</p>
          )}

          {/* Whichever block the post is built around — `derivePostKind` above names it for the
              badge, but the body still renders whatever came back non-null rather than switching,
              same as before. The quiz is left out on purpose: a search result is for recognising a
              post, not sitting an exam in a card. */}
          {post.codeSnippetDetails && (
            <CodeSnippetBody
              details={post.codeSnippetDetails}
              href={post.id != null ? `/posts/${post.id}` : undefined}
            />
          )}
          {post.qnaDetails && <QnaBody details={post.qnaDetails} />}
          {post.pollDetails && <PollBody details={post.pollDetails} />}
          {post.linkDetails && <LinkBody details={post.linkDetails} />}

          {post.book && <BookLine book={post.book} />}
        </>
      }
      actions={
        <ReactionBar
          postId={postId}
          count={totalReactions}
          actions={
            <div className={ACTION_GROUP}>
              <Link
                href={`/posts/${postId}`}
                title={t('post.comments.show')}
                className={cn(
                  ACTION_GLYPH_BUTTON,
                  'text-nx-text-secondary hover:text-nx-text-primary'
                )}
              >
                <MessageCircle aria-hidden className={ACTION_GLYPH} />
                <span className="sr-only">{t('post.comments.show')}</span>
              </Link>
            </div>
          }
        />
      }
    />
  );
}
