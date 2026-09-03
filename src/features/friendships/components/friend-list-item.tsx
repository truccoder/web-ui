import * as React from 'react';
import Link from 'next/link';
import { Avatar } from '@/shared/components';
import { cn } from '@/shared/lib/cn';

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
  /**
   * Makes the avatar-and-name half a link to `/u/{href}`. Omit for rows whose person has no
   * handle: `PendingFriendRequestDto` and `SentFriendRequestDto` carry only an id and a name, so
   * request rows stay unlinked while the friends list links — a link that 404s is worse than none.
   */
  href?: string;
  avatarSize?: 'md' | 'lg' | 'xl';
  /**
   * Draw the row as its own raised card. Default, because that is what the kit renders on all
   * three friends tabs — see the note on the root element.
   */
  card?: boolean;
}

export function FriendListItem({
  name,
  avatarUrl,
  subtitle,
  actions,
  href,
  avatarSize = 'lg',
  card = true,
}: FriendListItemProps) {
  // ONLY THE IDENTITY HALF IS THE LINK, never the whole row. The row's right side holds real
  // controls (accept, unfriend), and wrapping those in an anchor makes every click ambiguous —
  // the browser would navigate on any miss. Two targets, clearly divided, beats one that guesses.
  const identity = (
    <>
      <Avatar src={avatarUrl} name={name} size={avatarSize} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-nx-ui font-medium text-nx-text-primary">{name}</p>
        {subtitle && <p className="truncate text-nx-caption text-nx-text-muted">{subtitle}</p>}
      </div>
    </>
  );

  /**
   * EACH ROW IS ITS OWN CARD, measured off the rendered kit: white, radius 8, padding `12px 20px`,
   * 16px between rows, no shadow, no divider.
   *
   * The app had all three lists inside ONE card with hairline dividers, which is the shape a table
   * takes — it says the rows are parts of a single thing you read down. On these tabs each row is
   * a separate decision with its own buttons (accept, reject, add, unfriend), and a card per
   * decision is what makes the 16px gap mean "these are separate" instead of the divider meaning
   * "these are continuous".
   */
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        card && 'rounded-nx-md bg-nx-surface-card px-5 py-3'
      )}
    >
      {href ? (
        <Link
          href={`/u/${encodeURIComponent(href)}`}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 rounded-nx-sm',
            'hover:underline focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-nx-focus-ring'
          )}
        >
          {identity}
        </Link>
      ) : (
        identity
      )}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
