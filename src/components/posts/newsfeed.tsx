'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedPost } from './feed-post';
import { NEWSFEED_QUERY_KEY, useNewsfeed } from '@/lib/hooks/use-posts';
import { useT } from '@/lib/i18n';

function PostSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-muted rounded w-32" />
          <div className="h-2.5 bg-muted rounded w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </div>
    </div>
  );
}

export function Newsfeed() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNewsfeed();

  /**
   * What every card calls after a write that changes what the feed says about a post.
   *
   * It has to be an invalidation of the whole feed rather than a patch of one entry: the
   * counts a card shows (`likeCount`, `commentCount`) live in the feed payload, and neither
   * `PostReactionController` nor `CommentController` ever returns a new total — the reaction
   * endpoints only answer "what did I pick". There is no `GET /posts/{id}` to re-read a
   * single post with either, so the feed page is the smallest thing that can be refreshed.
   *
   * `refetch()` would only cover this component's own query; invalidating the key also
   * catches the page-level composer seam, which points at the same constant.
   */
  const refreshFeed = () => {
    queryClient.invalidateQueries({ queryKey: NEWSFEED_QUERY_KEY });
  };

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

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t('newsfeed.error')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('newsfeed.retry')}
        </Button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
          <span className="text-3xl">📝</span>
        </div>
        <p className="font-medium text-sm">{t('newsfeed.empty.title')}</p>
        <p className="text-xs text-muted-foreground">{t('newsfeed.empty.desc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <FeedPost key={post.postId} post={post} onChanged={refreshFeed} />
      ))}

      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasNextPage && posts.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">{t('newsfeed.allLoaded')}</p>
      )}
    </div>
  );
}
