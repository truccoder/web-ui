'use client';

import { Card, DeveloperIdentity } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { SearchUser } from '../types/search';

/**
 * One person in the results — each on its own `Card`, the shape the friends tabs use for a person
 * row (`FriendListItem`), rather than a row inside a bordered group. The owner's note was "dùng
 * style có sẵn … thay vì random".
 *
 * `DeveloperIdentity` is still the identity row itself — the canonical one, which no surface may
 * re-implement — and it carries the link: the avatar and the name point at `/u/{username}` when the
 * payload has a handle. `SearchUser` types it nullable (the column is neither `UNIQUE` nor
 * `NOT NULL`), so a handle-less hit is a real case and those rows stay unlinked — a link that 404s
 * is worse than none.
 *
 * `RepScore` comes from `features/reputation` through its barrel, which that feature's `index.ts`
 * anticipates: `eliteScore` ships inside the search payload, so its renderer has to be reachable.
 */
export interface UserResultCardProps {
  user: SearchUser;
  className?: string;
}

export function UserResultCard({ user, className }: UserResultCardProps) {
  const t = useT();

  // A blank name reads as a rendering fault rather than as missing data — same call `PostCard`
  // makes for feed authors.
  const name = user.fullName?.trim() || t('search.unknownPerson');

  return (
    <Card padding="12px 20px" className={cn('flex items-center gap-3', className)}>
      <DeveloperIdentity
        name={name}
        href={user.username ? `/u/${encodeURIComponent(user.username)}` : undefined}
        src={user.profilePictureUrl ?? undefined}
        handle={user.username ? `@${user.username}` : undefined}
        // Shown only when there is a score. A brand-new account has `eliteScore` 0, a real value;
        // null means the payload carried nothing, and omission is the honest answer for that.
        rep={user.eliteScore !== null ? <RepScore score={user.eliteScore} size="sm" /> : undefined}
        className="min-w-0 flex-1"
      />
    </Card>
  );
}
