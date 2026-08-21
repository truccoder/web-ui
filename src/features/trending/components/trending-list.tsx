'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useTrending } from '../hooks';
import type { TrendingCategory, TrendingTimeRange, TrendingSource } from '../types/trending';
import { TrendingCard } from './trending-card';
import { TrendingFilters } from './trending-filters';

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

/** One card's worth of placeholder, shaped like the real thing so the swap does not jump. */
function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-nx-lg border border-nx-border-subtle p-4">
      <div className="flex gap-2">
        <Skeleton width={80} height={20} radius={999} />
        <Skeleton width={64} height={20} radius={999} />
      </div>
      <Skeleton height={14} />
      <Skeleton width="75%" height={14} />
      <Skeleton width="33%" height={12} />
    </div>
  );
}

export function TrendingList({ className }: TrendingListProps) {
  const t = useT();

  const [timeRange, setTimeRange] = useState<TrendingTimeRange>('week');
  const [category, setCategory] = useState<TrendingCategory | undefined>(undefined);
  const [source, setSource] = useState<TrendingSource | undefined>(undefined);

  const { data, status, fetchStatus, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTrending({ category, source, timeRange });

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      // Fetch before the reader reaches the end, so the join is invisible. Same margin as the feed.
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
    <div className={cn('flex flex-col gap-4', className)}>
      <TrendingFilters
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        source={source}
        onSourceChange={setSource}
        category={category}
        onCategoryChange={setCategory}
      />

      {isFirstLoad ? (
        <div className="flex flex-col gap-4">
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
        // Filled cards at the kit's 12 gap. The bare-member version this replaces came from a
        // README passage the kit itself does not follow.
        <div className="flex flex-col gap-[var(--nx-space-element)]">
          {items.map((item) => (
            <TrendingCard key={item.id} item={item} />
          ))}

          <div ref={sentinelRef} aria-hidden />

          {isFetchingNextPage && (
            <div className="flex flex-col gap-4">
              <CardSkeleton />
            </div>
          )}

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
