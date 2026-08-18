'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { newsfeedKeys } from '../hooks/keys';
import { useNewsfeed, usePublicFeed } from '../hooks/use-feed';
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
export type FeedScope = 'all' | 'friends';

export interface NewsfeedProps {
  /** @default "friends" */
  scope?: FeedScope;
  className?: string;
}

/** One card's worth of placeholder: the identity row, then a paragraph. */
function PostSkeleton() {
  return (
    <Card padding={16} className="flex flex-col gap-3">
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
  const friendsFeed = useNewsfeed(scope === 'friends');
  const publicFeed = usePublicFeed(scope === 'all');
  const feed = scope === 'all' ? publicFeed : friendsFeed;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;

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
      <div className={cn('flex flex-col gap-4', className)}>
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

  const posts = feed.data?.pages.flatMap((page) => page.posts) ?? [];

  if (posts.length === 0) {
    return (
      <EmptyState
        className={className}
        title={t('newsfeed.empty.title')}
        description={t('newsfeed.empty.desc')}
      />
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {posts.map((post) => (
        <FeedPost key={post.postId} post={post} onChanged={refresh} />
      ))}

      <div ref={sentinelRef} />

      {/* The same placeholder as the first load, so appending a page looks like the page
          arriving rather than like a different kind of waiting. */}
      {feed.isFetchingNextPage && <PostSkeleton />}

      {!feed.hasNextPage && (
        <p className="py-4 text-center text-nx-caption text-nx-text-muted">
          {t('newsfeed.allLoaded')}
        </p>
      )}
    </div>
  );
}
