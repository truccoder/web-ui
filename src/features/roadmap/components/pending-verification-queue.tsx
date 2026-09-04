'use client';

import { Badge, Button, DeveloperIdentity, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useRelativeTime } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import {
  useApproveVerification,
  useIsRoadmapAdmin,
  usePendingVerifications,
  useRejectVerification,
} from '../hooks/use-roadmap';
import type { VerificationTier } from '../types/roadmap';

/**
 * The moderator queue: every claim sitting in `PENDING_APPROVAL`, with approve/reject.
 *
 * THE GATE HERE IS A COURTESY, NOT A CONTROL. `useIsRoadmapAdmin` decides whether this renders at
 * all, and the backend enforces nothing — `@PreAuthorize` never runs (B20), so a plain user who
 * types the URL of a page holding this component would get a real, populated queue back. Hiding
 * it is the right thing to do and is not the same as protecting it; the fix is backend-side.
 *
 * FAILURE IS AN ORDINARY OUTCOME ON THIS SCREEN, not an edge case. The queue is shared and both
 * actions accept only a `PENDING_APPROVAL` row, so when two moderators work the same list the
 * second one gets "Cannot approve a verification request that is already VERIFIED". The error is
 * rendered per row rather than swallowed, because the honest response is "someone got there
 * first, here is the list again" — the mutation invalidates the queue, so the row disappears on
 * the refetch that follows.
 *
 * EVERY ROW LINKS NOW. `PendingVerificationDto` grew `username`, so the avatar and name reach
 * `/u/{username}` the same way the search results and the friends list already do.
 */
export interface PendingVerificationQueueProps {
  className?: string;
}

/** Enum value → translation key leaf. Spelled out so the keys stay greppable. */
const TIER_LABEL_KEY: Record<VerificationTier, string> = {
  SELF_VERIFIED: 'self',
  MOD_VERIFIED: 'mod',
  QUIZ_VERIFIED: 'quiz',
  AUTO_CERTIFIED: 'auto',
};

export function PendingVerificationQueue({ className }: PendingVerificationQueueProps) {
  const t = useT();
  const relativeTime = useRelativeTime();
  const { isAdmin, isPending: rolePending } = useIsRoadmapAdmin();

  const queue = usePendingVerifications(isAdmin);
  const approve = useApproveVerification();
  const reject = useRejectVerification();

  // "We do not know yet" is not "no". Rendering the denial during the profile fetch would make
  // the whole panel appear and disappear on every mount.
  if (rolePending) return <Skeleton lines={3} className={className} />;
  if (!isAdmin) return null;

  if (queue.isLoading) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Skeleton lines={2} />
        <Skeleton lines={2} />
      </div>
    );
  }

  if (queue.isError) {
    return (
      <EmptyState
        className={className}
        title={t('roadmap.queue.loadFailed')}
        description={getErrorMessage(queue.error)}
      />
    );
  }

  if ((queue.data?.length ?? 0) === 0) {
    return <EmptyState className={className} title={t('roadmap.queue.empty')} />;
  }

  // One id at a time so only the row being acted on shows a spinner; both mutations carry the
  // progress id as their variables.
  const pendingId =
    (approve.isPending ? approve.variables : undefined) ??
    (reject.isPending ? reject.variables : undefined) ??
    null;

  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {queue.data?.map((row) => (
        <li
          key={row.progressId}
          className="flex flex-col gap-2 rounded-nx-sm border border-nx-border-default p-3"
        >
          <DeveloperIdentity
            size="sm"
            name={row.fullName}
            href={row.username ? `/u/${encodeURIComponent(row.username)}` : undefined}
            src={row.profilePictureUrl ?? undefined}
            time={relativeTime(row.requestedAt)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-nx-body-sm font-medium text-nx-text-primary">{row.nodeName}</span>
            <Badge variant="info">{t(`roadmap.verify.tier.${TIER_LABEL_KEY[row.tier]}`)}</Badge>
          </div>

          {/* Only rendered when there is one — `proofUrl` is nullable and the two moderator tiers
              do not require it. `noopener noreferrer` because this is a URL a stranger supplied:
              the same guard `TrendingCard` uses for crawled links. */}
          {row.proofUrl && (
            <a
              href={row.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-nx-caption text-nx-text-accent hover:text-nx-text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
            >
              {row.proofUrl}
            </a>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              loading={pendingId === row.progressId && approve.isPending}
              disabled={pendingId !== null}
              onClick={() => approve.mutate(row.progressId)}
            >
              {t('roadmap.queue.approve')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={pendingId === row.progressId && reject.isPending}
              disabled={pendingId !== null}
              onClick={() => reject.mutate(row.progressId)}
            >
              {t('roadmap.queue.reject')}
            </Button>
          </div>
        </li>
      ))}

      {/* Errors sit under the list, not inside a row: by the time one arrives the mutation has
          invalidated the queue, so the row it referred to may already be gone. */}
      {(approve.error || reject.error) && (
        <li role="status" className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(approve.error ?? reject.error)}
        </li>
      )}
    </ul>
  );
}
