'use client';

import Link from 'next/link';
import { BookOpen, Star } from 'lucide-react';
import { DeveloperIdentity } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { ArticleBody, CodeSnippetBody, LinkBody, PollBody, QnaBody } from '@/features/posts';
import { useT } from '@/core/i18n';
import { useIntlLocale, useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { SearchBook, SearchPost } from '../types/search';

/**
 * One post in the results.
 *
 * WHAT IT CAN SHOW IS DECIDED BY THE PAYLOAD, NOT BY TASTE — and the payload got bigger.
 * `SearchService.toPostDtos` used to fill in the author, `content`, `eventName`, `visibility`,
 * `createdAt` and `book` and never the six details blocks, so a poll or code post showed its text
 * and nothing more. It fills them now (measured at F-C), so the block a post is actually built
 * around renders here too.
 *
 * IT IS A LINK NOW, THROUGH ITS TIMESTAMP. This note used to read "there is no post-detail route
 * in this app… search shows what matched; it cannot take you to it" — true when written, and the
 * strangest thing in the product: a search that found the post and then refused to open it.
 * `/posts/{id}` exists, and `PostDto` has carried `id` all along.
 *
 * THE TIMESTAMP CARRIES IT, not the card, and that is forced rather than chosen: `LinkBody` and
 * the book row below are links themselves, and an anchor inside an anchor is invalid HTML that
 * browsers silently unnest. It also matches `PostCard` in the feed, so the permalink is in the
 * same place wherever a post is drawn.
 */
export interface PostResultCardProps {
  post: SearchPost;
  className?: string;
}

/**
 * The book behind a book post.
 *
 * LOCAL, NOT EXPORTED. It has exactly one caller and its shape is not yet decided by a second —
 * the same call made for `NewChatPanel` in `features/chat`.
 */
function BookLine({ book }: { book: SearchBook }) {
  const t = useT();
  const localeTag = useIntlLocale();

  // A book row is a link once `/books/{id}` can answer for it, and a plain row otherwise. The
  // contents are built once and the wrapper is chosen around them, so there is no second copy of
  // the row to drift — a polymorphic `Wrapper` component would be the same thing with a `href`
  // that TypeScript cannot prove is present.
  const row = (
    <>
      {book.coverImageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element -- MinIO presigned URLs are not a
           configured `next/image` remote pattern, and they expire, so optimisation would cache a
           dead URL. Same call as the bookstore bridge components. */
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
          {/* Null until somebody rates it. The legacy page called `.toFixed(1)` unguarded, which
              crashes the whole results list on the first unrated book. */}
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
                ? // Grouped in the reader's locale, not hardcoded to `vi-VN`: the same separator
                  // that reads as thousands in Vietnamese reads as a decimal point in English,
                  // so a price of `180.000` would claim the book costs 180.
                  t('search.price', { price: book.price.toLocaleString(localeTag) })
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
  const relativeTime = useRelativeTime();

  const authorName = post.authorFullName?.trim() || t('search.unknownPerson');

  return (
    <div className={cn('flex flex-col gap-2 px-3 py-3', className)}>
      <DeveloperIdentity
        name={authorName}
        src={post.authorProfilePictureUrl ?? undefined}
        size="sm"
        rep={
          post.authorEliteScore !== null ? (
            // `authorLevelName` rides along in this payload exactly as it does in the feed's, and
            // is passed through rather than derived — the level thresholds live in the backend
            // enum and the DS, never a third time here (CLAUDE.md §1).
            <RepScore
              score={post.authorEliteScore}
              size="sm"
              showLevel={Boolean(post.authorLevelName)}
              levelName={post.authorLevelName ?? undefined}
            />
          ) : undefined
        }
        // Formatted with no zone-patching of any kind. A `withAssumedUtc` helper used to sit in
        // this file because `search/dto/PostDto` was the one `createdAt` in the backend typed as
        // `LocalDateTime`, so it arrived without a `Z` and `new Date()` read it as local time —
        // a post made seconds ago rendered as "7 giờ trước" on a UTC+7 machine. The DTO is
        // `OffsetDateTime` now (measured at F-C: `2026-07-28T13:56:14.776669Z`), so the helper
        // was a date utility in name and a patch for one endpoint in fact, and is gone.
        time={
          post.createdAt ? (
            post.id != null ? (
              <Link
                href={`/posts/${post.id}`}
                className="hover:text-nx-text-primary hover:underline"
              >
                {relativeTime(post.createdAt)}
              </Link>
            ) : (
              relativeTime(post.createdAt)
            )
          ) : undefined
        }
      />

      {/* An event post's title lives in `eventName`, not `content` — for those, `content` is the
          description under it. Both can be present, so neither replaces the other. */}
      {post.eventName && (
        <p className="text-nx-ui font-medium text-nx-text-primary">{post.eventName}</p>
      )}

      {post.content && (
        <p className="line-clamp-3 text-nx-body-sm text-nx-text-secondary">{post.content}</p>
      )}

      {/* THE DEFINING BLOCK, WHICHEVER ONE IT IS. `PostDto` carries no `postType`, so this cannot
          switch on the kind the way the feed's `PostBody` does — it renders whichever block came
          back non-null, and a post has at most one. Components come from `features/posts` through
          its barrel, which §4 permits and which is the point of having them: the same code snippet
          renders identically in the feed and here.

          The quiz is deliberately not among them. `QuizTaker` is an interactive surface that
          submits an attempt, and a search result is a place to recognise a post, not to sit an
          exam in a 3-line card. */}
      {post.codeSnippetDetails && <CodeSnippetBody details={post.codeSnippetDetails} />}
      {post.articleDetails && <ArticleBody details={post.articleDetails} />}
      {post.qnaDetails && <QnaBody details={post.qnaDetails} />}
      {post.pollDetails && <PollBody details={post.pollDetails} />}
      {post.linkDetails && <LinkBody details={post.linkDetails} />}

      {post.book && <BookLine book={post.book} />}
    </div>
  );
}
