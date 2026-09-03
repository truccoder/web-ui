'use client';

import { useState } from 'react';
import { ApiErrorNotice, Card, EmptyState, Pagination, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { usePagination } from '@/shared/lib/use-pagination';
import { cn } from '@/shared/lib/cn';
import { useModerationLogs } from '../hooks/use-moderation';
import type { ModerationStatus } from '../types/moderation';
import { ModerationFilters } from './moderation-filters';
import { ModerationLogRow } from './moderation-log-row';

/**
 * The flat log search — every moderation decision, machine or human, across all posts.
 *
 * A SEPARATE SURFACE FROM THE QUEUE ON PURPOSE, not a different view of it. The queue answers
 * "what do I need to decide"; this answers "what has been decided, and what did the classifier
 * think" — including rows for posts that were auto-approved and never appeared in any queue.
 * Nothing here is actionable, which is why there are no controls on a row.
 */
export interface ModerationLogsTabProps {
  className?: string;
}

const PAGE_SIZE = 20;

export function ModerationLogsTab({ className }: ModerationLogsTabProps) {
  const t = useT();

  const [postId, setPostId] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<ModerationStatus | ''>('');
  const { page, setPage, bindFilter } = usePagination();

  const query = useModerationLogs({
    postId: postId ? Number(postId) : undefined,
    userId: userId ? Number(userId) : undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
  });

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* `userId` filters by the POST's author, not by who performed the review — the backend
          searches log rows through their post. There is no "reviewed by" filter, and the log row
          does not record a moderator id at all. */}
      <ModerationFilters
        postId={postId}
        onPostIdChange={bindFilter(setPostId)}
        userId={userId}
        onUserIdChange={bindFilter(setUserId)}
        status={status}
        onStatusChange={bindFilter(setStatus)}
      />

      {query.isLoading ? (
        <Skeleton lines={6} />
      ) : query.isError ? (
        <ApiErrorNotice error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data?.content.length ?? 0) === 0 ? (
        <EmptyState title={t('moderation.log.empty')} />
      ) : (
        <>
          <Card padding={0}>
            <ul className="divide-y divide-nx-border-subtle">
              {query.data?.content.map((log) => (
                <li key={log.id} className="px-3 py-2.5">
                  <ModerationLogRow log={log} showPostId />
                </li>
              ))}
            </ul>
          </Card>

          <Pagination
            page={page}
            totalPages={query.data?.totalPages ?? 1}
            onPageChange={setPage}
            busy={query.isFetching}
            aria-label={t('moderation.tabs.logs')}
            label={t('moderation.pageOf', { page, totalPages: query.data?.totalPages ?? 1 })}
          />
        </>
      )}
    </div>
  );
}
