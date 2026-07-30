'use client';

import * as React from 'react';
import { Avatar, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/lib/i18n';
import { useBookReviews } from '../hooks';
import { StarRating } from './star-rating';

/**
 * Every review on a book.
 *
 * REVIEWS CANNOT SHOW WHO WROTE THEM, and that is a data ceiling rather than an unfinished UI.
 * `BookReviewResponseDto` carries `userId` and nothing else identifying, and the backend has no
 * endpoint to resolve a user by id — only `/profile/me`. Same family as `/attendees` in `posts` and
 * the missing public profile endpoint that CLAUDE.md Phase 3.1 designs around. So each row shows an
 * anonymous avatar rather than a name, and deliberately does not link anywhere: a link that 404s is
 * worse than no link.
 *
 * The timestamp is also NOT shown. The endpoint upserts, and `createdAt` does not move when a
 * review is edited (measured) — there is no `updatedAt` at all. A date here would claim a review
 * was written at a moment that may be several edits stale, which is a worse answer than no date.
 */
export interface BookReviewListProps {
  bookId: number;
  /** Skip the request until the surface holding this is actually shown. @default true */
  enabled?: boolean;
}

export function BookReviewList({ bookId, enabled = true }: BookReviewListProps) {
  const t = useT();
  const { data: reviews, isPending, isError, error } = useBookReviews(bookId, enabled);

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton lines={2} />
        <Skeleton lines={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('post.book.reviewsError'))}
      </p>
    );
  }

  if (reviews.length === 0) {
    return <EmptyState compact title={t('post.book.noReviews')} />;
  }

  return (
    <ul className="max-h-60 space-y-3 overflow-y-auto">
      {reviews.map((review) => (
        <li key={review.id} className="flex items-start gap-2">
          {/* No `name` is passed on purpose, so the avatar falls back to its neutral glyph. Feeding
              it the numeric id would render a digit as if it were someone's initial. */}
          <Avatar size="sm" />
          <div className="min-w-0 flex-1">
            <StarRating rating={review.rating ?? 0} size={11} />
            {review.feedback && (
              <p className="mt-0.5 whitespace-pre-wrap break-words text-nx-caption text-nx-text-secondary">
                {review.feedback}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
