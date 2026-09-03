'use client';

import { ApiErrorNotice, Card, EmptyState, Skeleton } from '@/shared/components';
import { useInfiniteScroll } from '@/shared/lib/use-infinite-scroll';
import { useT } from '@/core/i18n';
import { useUserPosts } from '../hooks/use-feed';
import { FeedPost } from './feed-post';

/**
 * One person's posts — the section a public profile was missing.
 *
 * `GET /users/{userId}/posts` had no frontend caller at all, which is why `/u/{username}` could
 * show what somebody's account scores and what it has had verified, and not a single thing they
 * had actually written. On a product whose whole argument is that reputation comes from work, a
 * profile with no work on it is the wrong half.
 *
 * WHAT IT SHOWS DEPENDS ON WHO IS LOOKING, and nothing here decides that: a stranger gets PUBLIC
 * posts, a friend also gets FRIENDS posts, and the author additionally gets PRIVATE ones and
 * anything still in or rejected by moderation. The backend applies that from the JWT. So this
 * component must never label the list as a total or a count of what someone has written — two
 * readers legitimately see different lists, and neither is wrong.
 *
 * IT REUSES `FeedPost`, not a profile-specific card. The payload is the identical
 * `FeedPostDataDto` the two feed tabs render, so a second card would be a second place for the
 * reaction bar, the menu, the comment thread and the type-specific bodies to drift.
 */
export interface UserPostsProps {
  /** Undefined while the profile that owns this id is still loading. */
  userId?: number;
  className?: string;
}

export function UserPosts({ userId, className }: UserPostsProps) {
  const t = useT();
  const query = useUserPosts(userId);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;
  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // `isPending` is also true while the query sits idle waiting for an id, and from the page's
  // point of view both are loading.
  if (userId == null || query.isPending) {
    return (
      <Card className={className}>
        <Skeleton lines={3} />
      </Card>
    );
  }

  if (query.isError) {
    return <ApiErrorNotice className={className} error={query.error} onRetry={() => refetch()} />;
  }

  const posts = query.data?.pages.flatMap((page) => page.posts ?? []) ?? [];

  if (posts.length === 0) {
    // Says only that there is nothing visible, not that they have never posted — a stranger may
    // simply be looking at an account whose posts are all FRIENDS-only.
    return <EmptyState compact title={t('publicProfile.postsEmpty')} />;
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-[var(--nx-space-block)]">
        {posts.map((post) => (
          <FeedPost key={post.postId} post={post} onChanged={() => refetch()} />
        ))}
      </div>

      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <Card className="mt-[var(--nx-space-block)]">
          <Skeleton lines={3} />
        </Card>
      )}
    </div>
  );
}
