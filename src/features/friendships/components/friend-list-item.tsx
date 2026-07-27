import * as React from 'react';
import { Avatar } from '@/shared/components';

/**
 * One person in a friendships list — avatar + name + optional subtitle + a trailing action
 * slot. Shared by the friends list, request lists and suggestions, which differ only in the
 * subtitle and which buttons sit in `actions`. Presentational: no data fetching.
 */
export interface FriendListItemProps {
  name: string;
  avatarUrl?: string;
  /** Mutual-friend count, request time, "awaiting", etc. */
  subtitle?: React.ReactNode;
  /** Buttons (accept/reject, add, cancel…). */
  actions?: React.ReactNode;
  avatarSize?: 'md' | 'lg' | 'xl';
}

export function FriendListItem({
  name,
  avatarUrl,
  subtitle,
  actions,
  avatarSize = 'lg',
}: FriendListItemProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar src={avatarUrl} name={name} size={avatarSize} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-nx-ui font-medium text-nx-text-primary">{name}</p>
        {subtitle && <p className="truncate text-nx-caption text-nx-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
