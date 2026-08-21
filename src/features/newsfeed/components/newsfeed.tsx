'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { newsfeedKeys } from '../hooks/keys';
import { useNewsfeed, usePublicFeed } from '../hooks/use-feed';
import { TrendingCard, useTrending } from '@/features/trending';
import { FeedPost } from './feed-post';

/**
 * The feed itself: paging, the four load states, and the invalidation every post-level write
 * hangs off.
 *
 * WHY REFRESHING IS A WHOLE-FEED INVALIDATION rather than a patch of one entry. Every count a
 * card could show lives in this payload, and none of the endpoints that change things return
 * the new value — reaction writes answer only "what did I pick", comment and RSVP writes
 * return void, and there is no `GET /posts/{id}` to re-read one post with. A page of the feed
 * is the smallest thing that can be refreshed, so it is what gets refreshed.
 *
 * INFINITE SCROLL, NOT A PAGER, because `hasMore` is all the backend says about what follows
 * (see `useNewsfeed`). The sentinel is observed rather than driven by a scroll handler, so it
 * still works when the viewport is tall enough that no scrolling ever happens.
 */
/**
 * WHICH FEED. The two scopes are different ENDPOINTS, not a filter applied to one — see
 * `newsfeedApi.getPublicFeed`. `friends` is the Redis fan-out and can only contain posts by
 * people you are connected to; `all` is a query over the posts table with no personalisation.
 * That is why the tab is `Tất cả` rather than `Khám phá`, and why the friends tab can never show
 * crawled content: not because it is filtered out, but because crawled items have no author to
 * be connected to.
 */
/**
 * `skills` JOINED THIS UNION WHEN THE BACKEND GREW A `scope` PARAMETER (B7).
 *
 * The tab was designed from the start and could not be built: `/feed` took only `page` and
 * `size`, so there was no way to express "posts touching a skill I have verified" and the
 * newsfeed page recorded the omission rather than render a tab that showed something else.
 *
 * `all` is still a DIFFERENT ENDPOINT (`/posts/public`); `friends` and `skills` are the same
 * fan-out feed under two scopes.
 */
export type FeedScope = 'all' | 'friends' | 'skills';

export interface NewsfeedProps {
  /** @default "friends" */
  scope?: FeedScope;
  className?: string;
}

/** One card's worth of placeholder: the identity row, then a paragraph. */
function PostSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton circle height={40} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton width={128} height={12} />
          <Skeleton width={80} height={10} />
        </div>
      </div>
      <Skeleton lines={3} />
    </Card>
  );
}

export function Newsfeed({ scope = 'friends', className }: NewsfeedProps) {
  const t = useT();
  const queryClient = useQueryClient();
  // BOTH HOOKS RUN, and the unused one is what keeps hook order stable across a tab switch —
  // calling one or the other conditionally is the classic way to break the rules of hooks. The
  // idle branch costs nothing: react-query does not fetch a query nothing is reading once its
  // `enabled` is false, and switching tabs then finds the other branch already warm in cache.
  const friendsFeed = useNewsfeed(scope !== 'all', scope === 'skills' ? 'SKILLS' : 'ALL');
  const publicFeed = usePublicFeed(scope === 'all');
  const feed = scope === 'all' ? publicFeed : friendsFeed;

  /**
   * CRAWLED CONTENT IS MIXED INTO `Tất cả`, AND ONLY INTO IT. This is the design's central claim
   * about the feed: it is the product's column, not the user's — "every post plus every crawled
   * item, with no filter of any kind". It also retired `/discover` as a separate destination.
   *
   * THE FRIENDS TAB CAN NEVER CONTAIN THESE, and not because they are filtered out: a crawled item
   * has no author, so there is no edge that could put it in a personalised fan-out. The absence is
   * structural, which is why no code here excludes them.
   *
   * TWO SOURCES, MERGED BY TIME ON THE CLIENT — there is no endpoint that returns both. The merge
   * is a sort over what has been fetched, so it is correct within the loaded window and makes no
   * claim beyond it: `hasNextPage` is true while EITHER source has more, and `fetchNextPage` asks
   * the one whose oldest loaded item is newer, i.e. whichever is holding the join back. Asking both
   * would double the page size on every scroll.
   */
  const trending = useTrending({});

  const sentinelRef = useRef<HTMLDivElement>(null);

  /**
   * Paging across two sources. `hasNextPage` is true while EITHER has more; the sentinel asks the
   * one that is holding the join back — whichever's oldest loaded item is NEWER, because that is
   * the source the merged list runs out of first. Asking both on every scroll would double the
   * page size and make the join arrive in bursts.
   */
  const mixed = scope === 'all';
  const oldestOf = (times: string[]) => times.reduce((a, b) => (a < b ? a : b), '￿');
  /**
   * `page.posts ?? []`, AND THE `??` IS NOT DEFENSIVE PADDING — it is a crash that was reachable
   * on a brand-new account. `flatMap` over a page whose `posts` is absent yields `[undefined]`
   * rather than nothing, so the very next `.map((p) => p.createdAt)` dereferences undefined and
   * takes the whole screen to the error boundary: *Cannot read properties of undefined (reading
   * 'createdAt')*. The page-level `?? []` already here only ever guarded `data` being absent,
   * which is the case that could not happen.
   *
   * The same guard is applied to the render list below, which read the same shape unguarded.
   *
   * IT IS WRITTEN TWICE RATHER THAN HOISTED INTO A SHARED `const`, which looks like the obvious
   * cleanup and is not: hoisting it puts a freshly-allocated array in the dependency chain of the
   * `useCallback` below, and the React Compiler then refuses the whole component with *existing
   * memoization could not be preserved*. Two identical expressions cost nothing at runtime; the
   * skipped optimisation costs every render of the feed.
   */
  const postsOldest = oldestOf(
    (feed.data?.pages.flatMap((page) => page.posts ?? []) ?? []).map((p) => p.createdAt ?? '')
  );
  const externalOldest = oldestOf(
    (trending.data?.pages.flatMap((p) => p.items ?? []) ?? []).map((i) => i.publishedAt ?? '')
  );

  // `||`, NOT `??`. Both are booleans, so `??` would only fall through on null/undefined and
  // `false ?? true` is `false` — the feed running out would have declared the whole list finished
  // while crawled items were still waiting.
  const hasNextPage = mixed ? Boolean(feed.hasNextPage || trending.hasNextPage) : feed.hasNextPage;
  const isFetchingNextPage = feed.isFetchingNextPage || (mixed && trending.isFetchingNextPage);

  const fetchNextPage = useCallback(() => {
    if (!mixed) {
      if (feed.hasNextPage) feed.fetchNextPage();
      return;
    }
    // Prefer the source whose tail is newer; fall back to whichever still has pages.
    const takeExternal =
      trending.hasNextPage && (!feed.hasNextPage || externalOldest > postsOldest);
    if (takeExternal) trending.fetchNextPage();
    else if (feed.hasNextPage) feed.fetchNextPage();
  }, [mixed, feed, trending, externalOldest, postsOldest]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      // Fetch before the reader actually reaches the end, so the join is invisible.
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Sweeps the whole feature prefix rather than one branch: a reaction or comment written from a
  // card in one tab changes the same post as seen from the other.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: newsfeedKeys.all });
  };

  if (feed.isLoading) {
    return (
      <div className={cn('flex flex-col gap-[var(--nx-space-block)]', className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <PostSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (feed.isError) {
    return (
      <EmptyState
        className={className}
        title={t('newsfeed.error')}
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="size-4" />}
            onClick={() => feed.refetch()}
          >
            {t('newsfeed.retry')}
          </Button>
        }
      />
    );
  }

  const posts = feed.data?.pages.flatMap((page) => page.posts ?? []) ?? [];
  const external =
    scope === 'all' ? (trending.data?.pages.flatMap((p) => p.items ?? []) ?? []) : [];

  // One list of two shapes, newest first. `time` is normalised up front so the comparator never
  // has to know which kind it is holding — the discriminant is carried alongside, not sniffed.
  const entries = [
    ...posts.map((post) => ({ kind: 'post' as const, time: post.createdAt ?? '', post })),
    ...external.map((item) => ({ kind: 'external' as const, time: item.publishedAt ?? '', item })),
  ].sort((a, b) => b.time.localeCompare(a.time));

  if (entries.length === 0) {
    return (
      <EmptyState
        className={className}
        title={t('newsfeed.empty.title')}
        description={t('newsfeed.empty.desc')}
      />
    );
  }

  return (
    <div className={cn('flex flex-col gap-[var(--nx-space-block)]', className)}>
      {entries.map((entry) =>
        entry.kind === 'post' ? (
          <FeedPost key={`p${entry.post.postId}`} post={entry.post} onChanged={refresh} />
        ) : (
          <TrendingCard key={`x${entry.item.id}`} item={entry.item} />
        )
      )}

      <div ref={sentinelRef} />

      {/* The same placeholder as the first load, so appending a page looks like the page
          arriving rather than like a different kind of waiting. */}
      {isFetchingNextPage && <PostSkeleton />}

      {!hasNextPage && (
        <p className="py-4 text-center text-nx-caption text-nx-text-muted">
          {t('newsfeed.allLoaded')}
        </p>
      )}
    </div>
  );
}
