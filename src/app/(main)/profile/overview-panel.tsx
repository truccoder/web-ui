'use client';

import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { Section, SectionLink, StatTile } from '@/shared/components';
import { useFriends, usePendingRequests } from '@/features/friendships';
import { MyReputationCard } from '@/features/reputation';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Tổng quan`: what the app makes of you, and the one thing on this page that is
 * waiting on you.
 *
 * THE REQUEST LIST ITSELF LIVES ON `/friends/requests` NOW, NOT HERE. Embedding `FriendRequests`
 * put a second tab strip ("Đã nhận · Đã gửi") directly under this page's own tab strip, so two
 * different controls named `Tabs` sat one below the other. The "Đang chờ" tile below is still the
 * honest count, and it is now the door to it — a card no different in kind from the "Bạn bè" tile
 * beside it, and one click from the page whose whole job is that list.
 */
export function OverviewPanel() {
  const t = useT();
  const { data: friends } = useFriends();
  const { data: pendingRequests } = usePendingRequests();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
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

          <Link
            href="/friends/requests"
            className="rounded-nx-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            <StatTile
              label={t('profile.stats.pending')}
              value={pendingRequests?.length}
              description={t('profile.stats.pendingDesc')}
              icon={<Clock size={16} />}
              className="cursor-pointer transition-colors duration-[var(--nx-duration-fast)] ease-nx-out hover:bg-nx-surface-hover"
            />
          </Link>
        </div>
      </Section>
    </div>
  );
}
