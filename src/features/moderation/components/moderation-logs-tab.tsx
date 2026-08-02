'use client';

import { useState } from 'react';
import { Card, EmptyState, Pagination, Skeleton } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
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
  const [page, setPage] = useState(1);

  const query = useModerationLogs({
    postId: postId ? Number(postId) : undefined,
    userId: userId ? Number(userId) : undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
  });

  const onFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* `userId` filters by the POST's author, not by who performed the review — the backend
          searches log rows through their post. There is no "reviewed by" filter, and the log row
          does not record a moderator id at all. */}
      <ModerationFilters
        postId={postId}
        onPostIdChange={onFilter(setPostId)}
        userId={userId}
        onUserIdChange={onFilter(setUserId)}
        status={status}
        onStatusChange={onFilter(setStatus)}
      />

      {query.isLoading ? (
        <Skeleton lines={6} />
      ) : query.isError ? (
        <EmptyState title={t('moderation.loadFailed')} description={getErrorMessage(query.error)} />
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
