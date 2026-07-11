'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingCard } from './trending-card';
import { useTrending } from '@/lib/hooks/use-trending';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TrendingCategory, TrendingTimeRange } from '@/lib/types';

const CATEGORIES: TrendingCategory[] = [
  'OPENSOURCE',
  'EVENT',
  'NEW_TECH',
  'REGULATION',
  'MINDSET',
  'TOOL',
  'CAREER',
  'OTHER',
];

function TrendingSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 bg-muted rounded-full" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 bg-muted rounded w-full" />
        <div className="h-3.5 bg-muted rounded w-3/4" />
      </div>
      <div className="h-3 bg-muted rounded w-1/3" />
    </div>
  );
}

export function TrendingList() {
  const t = useT();
  const [category, setCategory] = useState<TrendingCategory | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<TrendingTimeRange>('week');

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTrending({ category, timeRange });

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TrendingTimeRange)}>
          <TabsList>
            <TabsTrigger value="today">{t('trending.timeRange.today')}</TabsTrigger>
            <TabsTrigger value="week">{t('trending.timeRange.week')}</TabsTrigger>
            <TabsTrigger value="month">{t('trending.timeRange.month')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(undefined)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
              category === undefined
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {t('trending.allCategories')}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {t(`trending.categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <TrendingSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t('trending.error')}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('trending.retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <span className="text-3xl">🔥</span>
          </div>
          <p className="font-medium text-sm">{t('trending.empty.title')}</p>
          <p className="text-xs text-muted-foreground">{t('trending.empty.desc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <TrendingCard key={item.id} item={item} />
          ))}

          <div ref={sentinelRef} />

          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!hasNextPage && items.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              {t('trending.allLoaded')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
