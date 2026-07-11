'use client';

import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import type { ModerationStatus } from '@/lib/types';

const STATUSES: ModerationStatus[] = [
  'PENDING_MODERATION',
  'APPROVED',
  'PENDING_REVIEW',
  'REJECTED',
];

interface ModerationFiltersProps {
  postId: string;
  onPostIdChange: (value: string) => void;
  userId: string;
  onUserIdChange: (value: string) => void;
  status: ModerationStatus | '';
  onStatusChange: (value: ModerationStatus | '') => void;
}

export function ModerationFilters({
  postId,
  onPostIdChange,
  userId,
  onUserIdChange,
  status,
  onStatusChange,
}: ModerationFiltersProps) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {t('admin.moderation.filterPostId')}
        </label>
        <Input
          type="number"
          value={postId}
          onChange={(e) => onPostIdChange(e.target.value)}
          className="w-28"
          placeholder="#"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {t('admin.moderation.filterUserId')}
        </label>
        <Input
          type="number"
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
          className="w-28"
          placeholder="#"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          {t('admin.moderation.filterStatus')}
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as ModerationStatus | '')}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">{t('admin.moderation.allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
