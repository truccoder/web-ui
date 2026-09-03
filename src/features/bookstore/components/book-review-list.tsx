'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar, Badge, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useReputation } from '@/features/reputation';
import { useMyProfile, usePublicProfile, type UserProfile } from '@/features/security';
import { useBookReviews } from '../hooks';
import type { BookReview } from '../types/book';
import { StarRating } from './star-rating';

/**
 * Every review on a book, each row named with the reader who wrote it.
 *
 * SHOWING THE REVIEWER WAS A CEILING UNTIL B38. `BookReviewResponseDto` still carries only
 * `userId` — no name, no handle, no avatar — and `/users/{username}/profile` is keyed by handle,
 * so for a long time a review could show its stars and its text but not its author (the same
 * family as `/attendees` in `posts`). `ReputationResponseDto.username` (B38, 02/09/2026) is the
 * bridge: `userId` → reputation → `username` → the public profile, which carries `fullName` and
 * `profilePictureUrl`. Each non-self row therefore costs two extra requests — acceptable on a
 * detail page with a handful of reviews, and logged as backend-debt B45 (put the author fields on
 * the review DTO directly, the same join `FeedPostDataDto` and, since B22, `CommentResponseDto`
 * already do).
 *
 * WHEN THE BRIDGE IS EMPTY THE ROW STAYS ANONYMOUS rather than linking nowhere — `username` is
 * null for anyone who registered with a password (`AuthService.register` never sets one), so
 * those rows render a neutral avatar and the "A reader" label with no link, exactly the
 * fallback rule B13/B21/B35 and `ChatInfo` follow.
 *
 * THE READER'S OWN REVIEW IS MARKED AND SORTED FIRST. `GET /profile/me` gives the id to match on;
 * the row it matches is tagged "Your review" and its identity is drawn from the profile already
 * loaded, with no reputation/profile lookup of its own. The composing page reads the same match to
 * pre-fill the form.
 *
 * The timestamp is still NOT shown. The endpoint upserts and `createdAt` does not move when a
 * review is edited (measured) — there is no `updatedAt` at all, so a date here would claim a
 * review was written at a moment that may be several edits stale.
 */
export interface BookReviewListProps {
  bookId: number;
  /** Skip the request until the surface holding this is actually shown. @default true */
  enabled?: boolean;
}

export function BookReviewList({ bookId, enabled = true }: BookReviewListProps) {
  const t = useT();
  const { data: reviews, isPending, isError, error } = useBookReviews(bookId, enabled);
  const { data: me } = useMyProfile();

  const ordered = React.useMemo(() => {
    if (!reviews) return reviews;
    if (me?.id == null) return reviews;
    // Stable: only the reader's own review is lifted, everything else keeps the server order.
    return [...reviews].sort((a, b) => Number(b.userId === me.id) - Number(a.userId === me.id));
  }, [reviews, me]);

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

  if (!ordered || ordered.length === 0) {
    return <EmptyState compact title={t('post.book.noReviews')} />;
  }

  return (
    <ul className="max-h-80 space-y-3 overflow-y-auto">
      {ordered.map((review) => (
        <ReviewRow
          key={review.id}
          review={review}
          mine={me?.id != null && review.userId === me.id}
          myProfile={me}
        />
      ))}
    </ul>
  );
}

interface ReviewRowProps {
  review: BookReview;
  mine: boolean;
  myProfile: UserProfile | undefined;
}

function ReviewRow({ review, mine, myProfile }: ReviewRowProps) {
  const t = useT();

  // The reader's own identity is already in hand; look everyone else up. `useReputation` is
  // disabled by its own `enabled` gate when the id is undefined, so a review with a null `userId`
  // (should not happen, but the DTO allows it) simply stays anonymous.
  const { data: reputation } = useReputation(mine ? undefined : (review.userId ?? undefined));
  const username = mine ? myProfile?.username : reputation?.username;
  const { data: publicProfile } = usePublicProfile(mine ? '' : (username ?? ''));

  const fullName = mine ? myProfile?.fullName : (publicProfile?.fullName ?? undefined);
  const picture = mine
    ? myProfile?.profilePictureUrl
    : (publicProfile?.profilePictureUrl ?? undefined);

  const displayName = fullName || (username ? `@${username}` : t('post.book.anonymousReviewer'));
  // `encodeURIComponent` — a handle is user-chosen text, not a slug this app minted (same rule as
  // `PostCard.authorHref` / `ChatInfo`).
  const href = username ? `/u/${encodeURIComponent(username)}` : undefined;

  const avatar = <Avatar size="sm" src={picture} name={fullName ?? username ?? undefined} />;

  return (
    <li className="flex items-start gap-2">
      {href ? (
        <Link href={href} aria-label={t('post.book.viewReviewer', { name: displayName })}>
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {href ? (
            <Link
              href={href}
              className="truncate text-nx-caption font-medium text-nx-text-primary hover:underline"
            >
              {displayName}
            </Link>
          ) : (
            <span className="truncate text-nx-caption font-medium text-nx-text-primary">
              {displayName}
            </span>
          )}
          {mine && <Badge variant="info">{t('post.book.yourReview')}</Badge>}
        </div>
        <div className="mt-1">
          <StarRating rating={review.rating ?? 0} size={15} />
        </div>
        {review.feedback && (
          <p className="mt-1 whitespace-pre-wrap break-words text-nx-caption text-nx-text-secondary">
            {review.feedback}
          </p>
        )}
      </div>
    </li>
  );
}
