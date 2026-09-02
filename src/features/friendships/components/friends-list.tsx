'use client';

import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { Button, Dialog, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useInfiniteScroll } from '@/shared/lib/use-infinite-scroll';
import { useT } from '@/core/i18n';
import { useInfiniteFriends, useUnfriend } from '../hooks/use-friendship';
import { FriendListItem } from './friend-list-item';

/**
 * The `/friends/all` surface: the whole friends list, cursor-paginated
 * (`GET /v1/api/friendships`) and loaded as you scroll. Owns its own count line because
 * `totalCount` only exists inside the query; the page owns the h1 above it.
 *
 * UNFRIENDING LANDED HERE ON 2026-08-09, when `DELETE /v1/api/friendships/{userId}` appeared. Until
 * then the findings recorded "no endpoint to unfriend" as a hard ceiling: a friendship could be
 * formed and never ended, which this list quietly reflected by offering no action at all.
 *
 * IT IS BEHIND A CONFIRM, unlike accept/reject on the requests screen. Those are decisions about a
 * request that is already asking to be decided; this destroys an existing relationship from a row
 * whose primary purpose is just to be looked at, so a misclick has to cost a second click.
 *
 * THE ENDPOINT IS IDEMPOTENT — 204 whether or not the friendship existed — so the dialog says the
 * two will no longer be friends rather than claiming anything was verified and removed.
 */

function FriendRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-nx-md bg-nx-surface-card px-5 py-3">
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

  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // Held whole rather than by id: the dialog names the person, and reading the name back out of
  // the list would break the moment the row disappears on success.
  const [pending, setPending] = useState<{ userId: number; fullName: string } | null>(null);
  const unfriend = useUnfriend();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <FriendRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Deduped by userId: the cursor-paginated endpoint can hand back the same friend at a page
  // boundary (the last row of one page reappearing as the first of the next), which otherwise
  // surfaces as a duplicate React key rather than a visible bug.
  const friends = Array.from(
    new Map((data?.pages.flatMap((page) => page.friends) ?? []).map((f) => [f.userId, f])).values()
  );
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

      <div className="flex flex-col gap-4">
        {friends.map((friend) => (
          <div key={friend.userId}>
            <FriendListItem
              name={friend.fullName}
              avatarUrl={friend.profilePictureUrl}
              subtitle={friend.username ? `@${friend.username}` : undefined}
              // The friends list is one of only two payloads carrying a handle, so it can link.
              href={friend.username ?? undefined}
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<UserMinus className="size-3.5" />}
                  aria-label={t('friends.all.unfriendAria', { name: friend.fullName })}
                  onClick={() => {
                    // Clear a previous failure so the dialog never opens showing an error that
                    // belonged to a different person.
                    unfriend.reset();
                    setPending({ userId: friend.userId, fullName: friend.fullName });
                  }}
                >
                  {t('friends.all.unfriend')}
                </Button>
              }
            />
          </div>
        ))}
      </div>

      <Dialog
        open={pending != null}
        onClose={() => setPending(null)}
        title={t('friends.all.unfriendTitle')}
        description={t('friends.all.unfriendDesc', { name: pending?.fullName ?? '' })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t('friends.all.unfriendCancel')}
            </Button>
            <Button
              variant="danger"
              loading={unfriend.isPending}
              onClick={() => {
                if (!pending) return;
                unfriend.mutate(pending.userId, { onSuccess: () => setPending(null) });
              }}
            >
              {t('friends.all.unfriendConfirm')}
            </Button>
          </>
        }
      >
        {unfriend.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(unfriend.error, t('friends.all.unfriendError'))}
          </p>
        )}
      </Dialog>

      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <FriendRowSkeleton key={i} />
          ))}
        </div>
      )}

      {!hasNextPage && (
        <p className="py-2 text-center text-nx-caption text-nx-text-faint">
          {t('friends.all.allLoaded')}
        </p>
      )}
    </div>
  );
}
