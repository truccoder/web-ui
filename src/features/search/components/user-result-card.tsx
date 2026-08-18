'use client';

import Link from 'next/link';
import { DeveloperIdentity } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { SearchUser } from '../types/search';

/**
 * One person in the results.
 *
 * IT IS A LINK NOW, AND FOR SIX MONTHS IT WAS NOT. The note this replaces read: "the backend
 * exposes only `GET /profile/me` … there is nowhere for this row to go … if a public profile
 * endpoint appears, this is the component that grows an anchor." It appeared —
 * `GET /users/{username}/profile`, 2026-08-09 — so this is that anchor.
 *
 * THE LINK IS CONDITIONAL ON `username`, not on the endpoint existing. `SearchUser` types the
 * handle as nullable and the column is neither `UNIQUE` nor `NOT NULL` on the backend (registration
 * never sets it — the 32 values in the database are seed data), so a result with no handle is a
 * real case rather than a defensive branch. Those rows stay static: the old rule still holds that a
 * link which 404s is worse than no link.
 *
 * `RepScore` COMES FROM `features/reputation` THROUGH ITS BARREL, which that feature's `index.ts`
 * anticipates in writing: `eliteScore` ships inside search and feed payloads, so the component
 * that renders it has to be reachable from the features that receive it.
 */
export interface UserResultCardProps {
  user: SearchUser;
  className?: string;
}

export function UserResultCard({ user, className }: UserResultCardProps) {
  const t = useT();

  // A result row with a blank name reads as a rendering fault rather than as missing data —
  // same call `PostCard` makes for feed authors.
  const name = user.fullName?.trim() || t('search.unknownPerson');

  const row = (
    <div className={cn('flex items-center gap-3 px-3 py-3', className)}>
      <DeveloperIdentity
        name={name}
        src={user.profilePictureUrl ?? undefined}
        handle={user.username ? `@${user.username}` : undefined}
        /**
         * Shown only when there is a score to show. A brand-new account has `eliteScore` 0, which
         * is a real value and renders as 0; null means the payload carried nothing, and
         * `DeveloperIdentity` documents omission as the honest answer for that.
         */
        rep={user.eliteScore !== null ? <RepScore score={user.eliteScore} size="sm" /> : undefined}
        className="min-w-0 flex-1"
      />
    </div>
  );

  if (!user.username) return row;

  return (
    <Link
      href={`/u/${encodeURIComponent(user.username)}`}
      className="block rounded-nx-sm hover:bg-nx-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
    >
      {row}
    </Link>
  );
}
