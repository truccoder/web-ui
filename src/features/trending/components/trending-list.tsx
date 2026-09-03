'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useInfiniteScroll } from '@/shared/lib/use-infinite-scroll';
import { useTrending } from '../hooks';
import type { TrendingCategory, TrendingTimeRange, TrendingSource } from '../types/trending';
import { TrendingCard } from './trending-card';
import { DEFAULT_TIME_RANGE, TrendingFilters } from './trending-filters';

/**
 * The trending feed: filters, an infinite list, and the states around it.
 *
 * IT OWNS THE FILTERS AS COMPONENT STATE, NOT AS URL STATE — unlike `/search`, whose term lives in
 * `?q=`. The difference is what the value is for: a search term is a thing you share and come back
 * to, while "open source, this week" is a way of browsing that nobody links to. Putting it in the
 * URL would add a routing concern to buy a share button nobody asked for. If deep-linked filters
 * are ever wanted, they move up to the page the way the chat conversation id did.
 */
export interface TrendingListProps {
  className?: string;
}

/**
 * One card's worth of placeholder, shaped like the real thing so the swap does not jump.
 *
 * IT IS A REAL `Card` NOW, WHICH IS THE ONLY WAY THAT SENTENCE IS TRUE. The hand-built box it
 * replaces had drifted on all three of the measurements that decide whether a swap jumps: it was
 * `rounded-nx-lg` where `Card` is `rounded-nx-md`, `p-4` (16 on every side) where `Card` is
 * `--nx-space-pad-y` / `--nx-space-pad` (16 down, 20 across), and `gap-3` inside where
 * `TrendingCard` is `gap-2`. Every one of those was a copy of the card's geometry made at some
 * point and never re-synced; taking the component removes the copy, so it cannot drift again.
 */
function CardSkeleton() {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Skeleton width={80} height={20} radius={999} />
        <Skeleton width={64} height={20} radius={999} />
      </div>
      <Skeleton height={14} />
      <Skeleton width="75%" height={14} />
      <Skeleton width="33%" height={12} />
    </Card>
  );
}

export function TrendingList({ className }: TrendingListProps) {
  const t = useT();

  // THE DEFAULT COMES FROM THE FILTERS, NOT FROM A LITERAL HERE. The filter button counts how
  // many settings are off-default to decide whether to show a badge, so the two files have to
  // agree on what the default IS — spelled twice, a screen would eventually open already
  // claiming it was filtered.
  const [timeRange, setTimeRange] = useState<TrendingTimeRange>(DEFAULT_TIME_RANGE);
  const [category, setCategory] = useState<TrendingCategory | undefined>(undefined);
  const [source, setSource] = useState<TrendingSource | undefined>(undefined);

  const { data, status, fetchStatus, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTrending({ category, source, timeRange });

  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  /**
   * THE THREE-STATE BRANCH, written the way P2.6cd had to fix it.
   *
   * `isLoading ? … : isError ? … : empty` misses a query parked at `status: 'pending'` with
   * `fetchStatus: 'paused'` — both flags read false and the screen then claims there is nothing
   * trending when in fact nothing was ever asked. So: skeletons only while genuinely fetching the
   * first page, the error branch for anything that is not success, and the empty state **only** on
   * success.
   */
  const isFirstLoad = status === 'pending' && fetchStatus === 'fetching';

  return (
    // `--nx-space-group` (16), not a bare `gap-4`: the filter bar and the list are two groups on
    // one screen, and that is the rung that names the relationship. Same number, but the next
    // person to touch it is told what it means rather than left to guess whether 16 was chosen.
    <div className={cn('flex flex-col gap-[var(--nx-space-group)]', className)}>
      <TrendingFilters
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        source={source}
        onSourceChange={setSource}
        category={category}
        onCategoryChange={setCategory}
      />

      {isFirstLoad ? (
        // THE SAME GAP THE CARDS WILL USE — the rule this line has always followed, now at the
        // corrected rung. A skeleton one rung off the list that replaces it makes the whole
        // column step the moment the query resolves, which is the one thing a skeleton prevents.
        <div className="flex flex-col gap-[var(--nx-space-block)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : status !== 'success' ? (
        <EmptyState
          title={t('trending.errorTitle')}
          description={t('trending.error')}
          action={
            /**
             * Kept from the legacy screen, with a caveat recorded rather than hidden: at P2.6cd a
             * retry button on a query React Query had parked at `paused` fired no request at all,
             * and that was never explained (`findings/notifications.md` §14). A reload does
             * recover. Removing the button would not fix that and would take away the one action
             * that works in the ordinary failure case.
             */
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="size-4" />}
              onClick={() => refetch()}
            >
              {t('trending.retry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState title={t('trending.empty.title')} description={t('trending.empty.desc')} />
      ) : (
        /**
         * CARD ↔ CARD IS THE BLOCK RUNG, 20 — and the comment that used to sit here claimed the
         * opposite, which is why the wrong number survived so long. It read *"filled cards at the
         * kit's 12 gap"*. That was measured against the kit at P1/A and is **false**: the kit's
         * own feed column renders `rowGap: 20px` with cards at `16px 20px`, and a sweep of every
         * card column in the kit found none at 12.
         *
         * Three sources agree on 20 and they were checked separately, because a confident comment
         * is exactly what kept this from being noticed:
         *   · `density-r9.md:15` — the shipped fitting's own table, `block (card ↔ card) … 20`.
         *   · `adherence-r10` — "card ↔ card is the rung above vertical card padding". Padding
         *     here is `pad-y` 16, so the rung above is 20.
         *   · the rendered kit, measured rather than read.
         *
         * What 12 cost, in numbers rather than taste: text → text across a card boundary came to
         * 16 + 12 + 16 = **44**, where R9 fixes that distance at **52**; and the gap BETWEEN two
         * cards (12) was smaller than the padding INSIDE one (16), which is the proximity
         * inversion the recessed-ground surface model exists to prevent — two cards read as one
         * continuous strip instead of two objects.
         *
         * This is the default tab of the app's main screen, so it was also the first thing every
         * reader saw. `e2e/layout.spec.ts` now asserts the 20. See report §3.2 (A001, A002).
         */
        <div className="flex flex-col gap-[var(--nx-space-block)]">
          {items.map((item) => (
            <TrendingCard key={item.id} item={item} />
          ))}

          <div ref={sentinelRef} aria-hidden />

          {/* NO WRAPPER. This was a `flex flex-col gap-4` around one child — a gap between
              nothing and nothing, and a 16 that would have been wrong if a second child ever
              arrived. The skeleton is a sibling of the cards, so it takes the column's own 20. */}
          {isFetchingNextPage && <CardSkeleton />}

          {!hasNextPage && (
            <p className="py-4 text-center text-nx-caption text-nx-text-muted">
              {t('trending.allLoaded')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
