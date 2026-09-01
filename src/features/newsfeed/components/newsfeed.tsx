'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { newsfeedKeys } from '../hooks/keys';
import { useNewsfeed, usePublicFeed } from '../hooks/use-feed';
import { feedScrollKey, useScrollRestoration } from '../hooks/use-scroll-restoration';
import { useRecordFeedReturn } from '../hooks/use-feed-return';
import { useSeenReporter } from '../hooks/use-seen-reporter';
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
 * WHICH FEED. `posts` is a different ENDPOINT from the other two, not a filter applied to one —
 * see `newsfeedApi.getPublicFeed`. `friends` and `skills` are the Redis fan-out (`GET /feed`) and
 * can only contain posts by people you are connected to; `posts` is a query over the whole posts
 * table (`GET /posts/public`) with no personalisation. None of the three carries crawled content:
 * that lives only on the `Công nghệ` tab, which renders `TrendingList` instead of this component.
 *
 * `skills` JOINED THIS UNION WHEN THE BACKEND GREW A `scope` PARAMETER (B7). The tab was designed
 * from the start and could not be built: `/feed` took only `page` and `size`, so there was no way
 * to express "posts touching a skill I have verified" and the newsfeed page recorded the omission
 * rather than render a tab that showed something else. `friends` and `skills` are the same
 * fan-out feed under two scopes; `posts` is the separate public endpoint.
 */
export type FeedScope = 'posts' | 'friends' | 'skills';

export interface NewsfeedProps {
  /** @default "friends" */
  scope?: FeedScope;
  /**
   * Restrict the `posts` scope to one hashtag (B31). Ignored on the fan-out scopes — `GET /feed`
   * takes no tag filter, and a Redis range cannot be narrowed by one after the fact. Pass it
   * already folded (`normalizeHashtag`).
   */
  hashtag?: string;
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

export function Newsfeed({ scope = 'friends', hashtag, className }: NewsfeedProps) {
  const t = useT();
  const queryClient = useQueryClient();
  // The tag only applies to the public scope; passing it on any other scope would just be dead
  // state in the query key.
  const activeHashtag = scope === 'posts' ? hashtag : undefined;
  // BOTH HOOKS RUN, and the unused one is what keeps hook order stable across a tab switch —
  // calling one or the other conditionally is the classic way to break the rules of hooks. The
  // idle branch costs nothing: react-query does not fetch a query nothing is reading once its
  // `enabled` is false, and switching tabs then finds the other branch already warm in cache.
  const fanOutFeed = useNewsfeed(scope !== 'posts', scope === 'skills' ? 'SKILLS' : 'ALL');
  const publicFeed = usePublicFeed(scope === 'posts', activeHashtag);
  const feed = scope === 'posts' ? publicFeed : fanOutFeed;

  /**
   * KEYED PER TAB. `Bài viết`, `Bạn bè` and `Kỹ năng của tôi` are three different columns of
   * different lengths; one shared position would drop the reader into the middle of a list they
   * were never scrolled through. It waits for data because restoring against an empty feed would
   * clamp to zero and throw the saved position away.
   *
   * THE KEY IS BUILT BY THE HOOK'S OWN HELPER rather than spelled out here, so that the reset the
   * brand mark and a reload perform (`clearFeedScroll`) can recognise every column's key by its
   * prefix without this file and that one agreeing on a string twice.
   */
  useScrollRestoration(feedScrollKey(scope, activeHashtag), Boolean(feed.data));

  /**
   * REMEMBER THIS COLUMN AS THE PLACE A POST PERMALINK RETURNS TO. `/posts/{id}`'s `← Về bảng tin`
   * link is a bare `/newsfeed`, which now opens on `Công nghệ` — a tab with no posts and no scroll
   * restoration. Recording the scope here lets that link resolve to `?tab=<scope>` instead, so a
   * reader who opened a post from `Bạn bè` lands back on `Bạn bè` and `useScrollRestoration` above
   * has a saved position to replay.
   */
  useRecordFeedReturn(scope);

  /**
   * SEEN-POST REPORTING RUNS ONLY ON THE FAN-OUT FEED. `POST /feed/seen` demotes posts in
   * `GET /feed`'s Redis ranking; `Bài viết` is `GET /posts/public`, an id-ordered scan with
   * nothing to demote — and passing `scope !== 'posts'` here also keeps the beacon off a guest,
   * who never reaches a fan-out scope. `trackSeen(postId)` is a stable callback ref hung on the
   * wrapper around each card below.
   */
  const trackSeen = useSeenReporter(scope !== 'posts');

  const sentinelRef = useRef<HTMLDivElement>(null);

  // `fetchNextPage` is stable across renders (react-query memoises it), so the observer is rebuilt
  // only when the two flags it reads actually change.
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
      // Fetch before the reader actually reaches the end, so the append is invisible.
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

  // `page.posts ?? []`, AND THE `??` IS NOT DEFENSIVE PADDING — it is a crash that was reachable on
  // a brand-new account. `flatMap` over a page whose `posts` is absent yields `[undefined]` rather
  // than nothing, so the next dereference takes the whole screen to the error boundary. The
  // page-level `?? []` only ever guarded `data` being absent, which is the case that cannot happen.
  const posts = feed.data?.pages.flatMap((page) => page.posts ?? []) ?? [];

  if (posts.length === 0) {
    // A tag that folds to a real prefix but no visible post is an ordinary outcome, not the
    // "nobody has posted yet" case the plain copy describes.
    if (activeHashtag) {
      return (
        <EmptyState
          className={className}
          title={t('newsfeed.hashtag.emptyTitle', { tag: activeHashtag })}
          description={t('newsfeed.hashtag.emptyDesc')}
        />
      );
    }
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
      {posts.map((post) => (
        // The wrapper exists for the seen-post observer: `FeedPost` renders a `Card` and forwards
        // no DOM ref. It is a plain block box, so the flex column's gap is unchanged. `trackSeen`
        // returns a no-op ref on the `Bài viết` tab, where the hook is inactive.
        <div key={`p${post.postId}`} ref={trackSeen(post.postId)}>
          <FeedPost post={post} onChanged={refresh} />
        </div>
      ))}

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
