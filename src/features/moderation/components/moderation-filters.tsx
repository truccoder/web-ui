'use client';

import { Input, Select } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ModerationStatus } from '../types/moderation';

/**
 * The post-id / user-id / status filter row, shared by the queue and the log search.
 *
 * CONTROLLED, AND OWNS NO STATE. Both tabs need the filters to reset paging when they change, and
 * a component holding its own values could not tell the caller that without duplicating them.
 *
 * THE STATUS LIST IS WRITTEN OUT rather than derived from the type: a union has no runtime value
 * to map over, and the order is the Java enum's own so the list never silently reshuffles. Same
 * rule `EventRsvpBar` and `TrendingFilters` follow.
 */
export interface ModerationFiltersProps {
  postId: string;
  onPostIdChange: (value: string) => void;
  userId: string;
  onUserIdChange: (value: string) => void;
  /** Empty string means "any status" — the parameter is simply omitted from the request. */
  status: ModerationStatus | '';
  onStatusChange: (value: ModerationStatus | '') => void;
  className?: string;
}

const STATUSES: ModerationStatus[] = [
  'PENDING_MODERATION',
  'APPROVED',
  'PENDING_REVIEW',
  'REJECTED',
];

export function ModerationFilters({
  postId,
  onPostIdChange,
  userId,
  onUserIdChange,
  status,
  onStatusChange,
  className,
}: ModerationFiltersProps) {
  const t = useT();

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <Input
        mono
        size="sm"
        // `inputMode="numeric"` rather than `type="number"`: these are identifiers, not
        // quantities, so the spinner and the scroll-to-change behaviour of a number input are
        // both wrong. The value stays a string and the caller parses it.
        inputMode="numeric"
        label={t('moderation.filters.postId')}
        value={postId}
        onChange={(event) => onPostIdChange(event.target.value)}
        className="w-32"
      />

      <Input
        mono
        size="sm"
        inputMode="numeric"
        label={t('moderation.filters.userId')}
        value={userId}
        onChange={(event) => onUserIdChange(event.target.value)}
        className="w-32"
      />

      <Select
        size="sm"
        label={t('moderation.filters.status')}
        value={status}
        onChange={(event) => onStatusChange(event.target.value as ModerationStatus | '')}
        options={[
          { value: '', label: t('moderation.filters.anyStatus') },
          ...STATUSES.map((value) => ({ value, label: t(`moderation.status.${value}`) })),
        ]}
        className="w-52"
      />
    </div>
  );
}
