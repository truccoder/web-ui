'use client';

import { useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Pagination, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useBannedUsers } from '../hooks/use-moderation';

/**
 * Everyone who has been banned at least once — NOT everyone who is banned right now.
 *
 * THE LIST IS A HISTORY, AND THE ROW STATE IS THE ANSWER. `getBannedUsers` returns every user
 * with a ban on record, and each row carries `currentlyBanned` computed from `user.isBanned()` at
 * read time. An expired ban stays in the list with `currentlyBanned: false`. Reading membership
 * as "banned" would mark people banned for ever, so every row states which it is rather than
 * relying on the reader to assume.
 *
 * NO "CURRENTLY BANNED ONLY" FILTER, deliberately. The endpoint takes nothing but paging, so such
 * a filter could only be applied to the page in hand — it would hide rows on page 2 while looking
 * like it had filtered the whole list. A filter that is silently incomplete is worse than none.
 *
 * `remainingSeconds` IS A SNAPSHOT, computed server-side as `Duration.between(now, bannedUntil)`
 * at the moment of the request. It is rendered coarsely (days and hours) because that is the
 * precision it actually has; a live countdown would be inventing accuracy that drifts from the
 * moment the response lands.
 */
export interface BannedUsersTabProps {
  /** Jump to a post that triggered a ban. Omit to render the ids without controls. */
  onViewPost?: (postId: number) => void;
  className?: string;
}

const PAGE_SIZE = 10;

/**
 * Seconds → "6d 4h" / "4h 12m" / "12m".
 *
 * Coarse on purpose, and never smaller than a minute: see the snapshot note above. Non-positive
 * input means the ban has already lapsed, which the caller renders as expired rather than "0m".
 */
function formatRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function BannedUsersTab({ onViewPost, className }: BannedUsersTabProps) {
  const t = useT();
  const [page, setPage] = useState(1);

  const query = useBannedUsers(page, PAGE_SIZE);

  if (query.isLoading) {
    return <Skeleton lines={5} className={className} />;
  }

  if (query.isError) {
    return (
      <EmptyState
        className={className}
        title={t('moderation.loadFailed')}
        description={getErrorMessage(query.error)}
      />
    );
  }

  if ((query.data?.content.length ?? 0) === 0) {
    return <EmptyState className={className} title={t('moderation.banned.empty')} />;
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ul className="flex flex-col gap-3">
        {query.data?.content.map((user) => (
          <li key={user.userId}>
            <Card padding={16} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-nx-body-sm font-medium text-nx-text-primary">
                    {user.fullName}{' '}
                    <span className="font-mono text-nx-micro font-normal text-nx-text-muted">
                      #{user.userId}
                    </span>
                  </p>
                  <p className="font-mono text-nx-micro text-nx-text-muted">{user.email}</p>
                </div>

                {user.currentlyBanned ? (
                  <Badge variant="danger">
                    <ShieldAlert className="mr-1 inline size-3.5" aria-hidden />
                    {t('moderation.banned.active', {
                      remaining: formatRemaining(user.remainingSeconds),
                    })}
                  </Badge>
                ) : (
                  <Badge variant="neutral">
                    <ShieldCheck className="mr-1 inline size-3.5" aria-hidden />
                    {t('moderation.banned.expired')}
                  </Badge>
                )}
              </div>

              <p className="text-nx-caption text-nx-text-secondary">
                {t('moderation.banned.count', { count: user.banCount })}
              </p>

              {user.triggeringPostIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-nx-caption text-nx-text-muted">
                    {t('moderation.banned.triggeringPosts')}
                  </span>
                  {user.triggeringPostIds.map((postId) =>
                    // Without a handler the ids are still worth showing — they are the evidence —
                    // but they are rendered as text rather than as buttons that do nothing.
                    onViewPost ? (
                      <Button
                        key={postId}
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewPost(postId)}
                      >
                        #{postId}
                      </Button>
                    ) : (
                      <span key={postId} className="font-mono text-nx-caption text-nx-text-muted">
                        #{postId}
                      </span>
                    )
                  )}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        totalPages={query.data?.totalPages ?? 1}
        onPageChange={setPage}
        busy={query.isFetching}
        aria-label={t('moderation.tabs.banned')}
        label={t('moderation.pageOf', { page, totalPages: query.data?.totalPages ?? 1 })}
      />
    </div>
  );
}
