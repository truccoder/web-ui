'use client';

import * as React from 'react';
import { Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useRatingBreakdown } from '../hooks';
import { StarRating } from './star-rating';

/**
 * Average rating plus the 1–5 star histogram for one book.
 *
 * THE AVERAGE IS COMPUTED HERE FROM THE HISTOGRAM, not read from `Book.avgRating`. Two reasons, and
 * the second is the real one: this component takes only a `bookId`, so pulling the whole book DTO
 * just for one number would drag in the 503-on-broken-storage hazard that `GET /books/{id}` carries
 * (findings §3) — a signing failure would blank the ratings of a book whose ratings are fine. The
 * breakdown endpoint touches no storage at all.
 *
 * `totalRatings === 0` IS THE EMPTY TEST. The backend returns all six counters as `0` rather than
 * an empty body for a book nobody has rated (measured), so there is no missing-field case to guard.
 */
export interface BookRatingSummaryProps {
  bookId: number;
  /** Skip the request until the surface holding this is actually shown. @default true */
  enabled?: boolean;
}

export function BookRatingSummary({ bookId, enabled = true }: BookRatingSummaryProps) {
  const t = useT();
  const { data, isPending, isError } = useRatingBreakdown(bookId, enabled);

  if (isPending) return <Skeleton lines={3} />;
  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">{t('post.book.reviewsError')}</p>
    );
  }

  const buckets = [
    { stars: 5, count: data.fiveStarsCount },
    { stars: 4, count: data.fourStarsCount },
    { stars: 3, count: data.threeStarsCount },
    { stars: 2, count: data.twoStarsCount },
    { stars: 1, count: data.oneStarCount },
  ];

  if (data.totalRatings === 0) {
    return <p className="text-nx-caption text-nx-text-muted">{t('post.book.noReviews')}</p>;
  }

  const weighted = buckets.reduce((sum, b) => sum + b.stars * b.count, 0);
  const average = weighted / data.totalRatings;

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 text-center">
        <div className="text-nx-title tabular-nums">{average.toFixed(1)}</div>
        <StarRating rating={average} />
        <div className="mt-1 text-nx-caption text-nx-text-muted">
          {t('post.book.reviewCount', { count: data.totalRatings })}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {buckets.map((bucket) => {
          // Share of total, not share of the largest bucket: the bar answers "how many of the
          // ratings were 5 stars", which is the question the number beside it also answers.
          const percent = (bucket.count / data.totalRatings) * 100;
          return (
            <div key={bucket.stars} className="flex items-center gap-2 text-nx-caption">
              <span className="w-3 shrink-0 tabular-nums text-nx-text-muted">{bucket.stars}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-nx-full bg-nx-surface-sunken">
                <div
                  className="h-full rounded-nx-full bg-nx-text-primary"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right tabular-nums text-nx-text-muted">
                {bucket.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
