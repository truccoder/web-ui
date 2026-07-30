'use client';

import { BookOpen, Star } from 'lucide-react';
import { DeveloperIdentity } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { useT } from '@/lib/i18n';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { SearchBook, SearchPost } from '../types/search';

/**
 * One post in the results.
 *
 * WHAT IT CAN SHOW IS DECIDED BY THE PAYLOAD, NOT BY TASTE. `SearchService.toPostDtos` fills in
 * the author, `content`, `eventName`, `visibility`, `createdAt` and `book` — and never the six
 * details blocks — so a quiz, poll or code post shows its text and nothing more. That is a
 * backend gap (`findings/search.md`), not a design decision, and the card is built to the data
 * that exists rather than to placeholders for data that does not.
 *
 * ALSO NOT A LINK: there is no post-detail route in this app. Search shows what matched; it
 * cannot take you to it. Recorded so the next reader does not assume it was forgotten.
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

  return (
    <div className="mt-2 flex items-center gap-2 rounded-nx-md border border-nx-border-subtle px-2 py-1.5">
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

        <div className="flex items-center gap-1.5 text-nx-caption text-nx-text-muted">
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
                ? t('search.price', { price: book.price.toLocaleString('vi-VN') })
                : t('search.priceUnknown')}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Makes this endpoint's timestamp interpretable, by saying what timezone it is in.
 *
 * `search/dto/PostDto` declares `createdAt` as a **`LocalDateTime`** — the only `createdAt` in the
 * entire backend that does; every other DTO uses `OffsetDateTime` and puts a `Z` on the wire.
 * Jackson serialises it as `2026-07-27T18:24:54` with no zone, and `new Date(...)` reads a bare
 * timestamp as **local** time. On a UTC+7 machine that turns a post made seconds ago into "7 hours
 * ago" — measured, not theorised: the row was inserted during this checkpoint and rendered as
 * `7 giờ trước`.
 *
 * ASSUMES THE DATABASE STORES UTC, which it does here (`t_posts.created_at` is
 * `timestamptz`, every row `+00`, and `OffsetDateTime.toLocalDateTime()` therefore yields UTC wall
 * clock). That assumption is exactly why this is a workaround and not a fix: the real repair is
 * one word in the backend DTO, requested in `findings/search.md`. When it lands, this function
 * becomes a no-op — the guard already leaves zoned strings untouched — and should be deleted.
 *
 * Kept inside this feature rather than folded into `shared/lib/format.ts`: one endpoint is wrong,
 * and teaching the shared formatter to guess about zones would spread the defect's blast radius
 * to every domain that formats a date correctly today.
 */
function withAssumedUtc(timestamp: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(timestamp);
  return hasZone ? timestamp : `${timestamp}Z`;
}

export function PostResultCard({ post, className }: PostResultCardProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  const authorName = post.authorFullName?.trim() || t('search.unknownPerson');

  return (
    <div className={cn('flex flex-col gap-1.5 px-3 py-3', className)}>
      <DeveloperIdentity
        name={authorName}
        src={post.authorProfilePictureUrl ?? undefined}
        size="sm"
        rep={
          post.authorEliteScore !== null ? (
            <RepScore score={post.authorEliteScore} size="sm" />
          ) : undefined
        }
        time={post.createdAt ? relativeTime(withAssumedUtc(post.createdAt)) : undefined}
      />

      {/* An event post's title lives in `eventName`, not `content` — for those, `content` is the
          description under it. Both can be present, so neither replaces the other. */}
      {post.eventName && (
        <p className="text-nx-ui font-medium text-nx-text-primary">{post.eventName}</p>
      )}

      {post.content && (
        <p className="line-clamp-3 text-nx-body-sm text-nx-text-secondary">{post.content}</p>
      )}

      {post.book && <BookLine book={post.book} />}
    </div>
  );
}
