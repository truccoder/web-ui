'use client';

import { Clock, Users } from 'lucide-react';
import { Section, SectionLink, StatTile } from '@/shared/components';
import { FriendRequests, useFriends, usePendingRequests } from '@/features/friendships';
import { MyReputationCard } from '@/features/reputation';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Tổng quan`: what the app makes of you, and the one thing on this page that is
 * waiting on you.
 *
 * A FILE OF ITS OWN, like its two siblings, because `page.tsx` had become 350 lines holding four
 * components and the route's shell. Nothing about the split is a Next.js requirement — only
 * `page`/`layout`/`route` are reserved names in a route folder, so these three sit beside the
 * page they belong to and are imported by it, the way `app/(main)/ledger.tsx` already does it.
 *
 * WHAT MOVED IS THE FILE, NOT THE BOUNDARY: a panel is still a component the route mounts only
 * while its tab is open, which is what keeps a closed panel's queries from firing.
 */
export function OverviewPanel() {
  const t = useT();
  const { data: friends } = useFriends();
  const { data: pendingRequests } = usePendingRequests();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* THE CARD USED TO NAME ITSELF, and this heading is not a new label so much as the old one
          moved out to where its four neighbours keep theirs. See `Section`. */}
      <Section title={t('reputation.title')} description={t('reputation.desc')}>
        <MyReputationCard />
      </Section>

      <Section
        title={t('profile.network.title')}
        action={<SectionLink href="/friends/all">{t('profile.network.viewAll')}</SectionLink>}
      >
        {/* `StatTile` takes the raw value: while the queries are in flight both read "—" rather
            than a zero that would be indistinguishable from "you have no friends". */}
        <div className="grid gap-[var(--nx-space-element)] sm:grid-cols-2">
          <StatTile
            label={t('profile.stats.friends')}
            value={friends?.totalCount}
            description={t('profile.stats.friendsDesc')}
            icon={<Users size={16} />}
          />
          <StatTile
            label={t('profile.stats.pending')}
            value={pendingRequests?.length}
            description={t('profile.stats.pendingDesc')}
            icon={<Clock size={16} />}
          />
        </div>

        {/* `sm` BECAUSE THIS STRIP IS NESTED UNDER ANOTHER ONE. `Đã nhận · Đã gửi` sits inside
            the `Tổng quan` panel, so the page shows two tab strips at once — and at the same size
            they read as two peers rather than as a filter inside a tab. `/friends/requests`
            already passed `sm` for exactly this reason; this call site was the one that did not,
            and it is the page where both strips are visible together. */}
        <FriendRequests tabSize="sm" />
      </Section>
    </div>
  );
}
