'use client';

import { DeveloperIdentity } from '@/shared/components';
import { RepScore } from '@/features/reputation';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import type { SearchUser } from '../types/search';

/**
 * One person in the results.
 *
 * NOT A LINK, DELIBERATELY. The backend exposes only `GET /profile/me` — there is no endpoint for
 * anybody else's profile — so there is nowhere for this row to go. CLAUDE.md's Phase 3 note says
 * it plainly: design to that limit, do not ship links that 404. If a public profile endpoint
 * appears, this is the component that grows an anchor.
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

  return (
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
}
