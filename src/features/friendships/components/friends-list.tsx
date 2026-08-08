'use client';

import { useEffect, useRef } from 'react';
import { Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useInfiniteFriends } from '../hooks/use-friendship';
import { FriendListItem } from './friend-list-item';

/**
 * The `/friends/all` surface: the whole friends list, cursor-paginated
 * (`GET /v1/api/friendships`) and loaded as you scroll. Owns its own count line because
 * `totalCount` only exists inside the query; the page owns the h1 above it.
 */

function FriendRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton circle height={40} />
      <div className="flex-1">
        <Skeleton width={160} height={14} />
      </div>
    </div>
  );
}

export function FriendsList() {
  const t = useT();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteFriends();

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
      // Start the next page before the sentinel is actually on screen.
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <FriendRowSkeleton key={i} />
        ))}
      </Card>
    );
  }

  const friends = data?.pages.flatMap((page) => page.friends) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  if (friends.length === 0) {
    return (
      <EmptyState title={t('friends.all.empty.title')} description={t('friends.all.empty.desc')} />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-nx-body-sm text-nx-text-muted">
        {t('friends.all.subtitle', { count: totalCount })}
      </p>

      <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
        {friends.map((friend) => (
          <div key={friend.userId} className="p-3">
            <FriendListItem
              name={friend.fullName}
              avatarUrl={friend.profilePictureUrl}
              subtitle={friend.username ? `@${friend.username}` : undefined}
            />
          </div>
        ))}
      </Card>

      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <FriendRowSkeleton key={i} />
          ))}
        </Card>
      )}

      {!hasNextPage && (
        <p className="py-2 text-center text-nx-caption text-nx-text-faint">
          {t('friends.all.allLoaded')}
        </p>
      )}
    </div>
  );
}
