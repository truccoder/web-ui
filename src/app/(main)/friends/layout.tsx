'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from '@/shared/components';
import { usePendingRequests } from '@/features/friendships';
import { useT } from '@/core/i18n';

/**
 * One friends surface with three tabs, assembled at P5.1.
 *
 * IT IS A LAYOUT, NOT A PAGE WITH LOCAL STATE, and that is the whole point. The three surfaces
 * were three sidebar rows and three routes; the IA decision was to collapse them into one nav
 * entry. Collapsing them into one *page* with `useState` would have thrown away three real URLs —
 * you could no longer link someone to your pending requests, the back button would stop working
 * between tabs, and every existing link would 404.
 *
 * A layout keeps all three slugs, keeps navigation real, and still renders one heading and one
 * tab strip. The active tab is derived from `usePathname`, so there is no state to keep in sync
 * with the URL — the URL *is* the state.
 *
 * THE COUNT ON "REQUESTS" IS THE REASON THE SIDEBAR CAN DROP TO ONE ROW. The old nav put the
 * pending badge on a dedicated row; without a badge here, collapsing the rows would have hidden
 * the one thing that was worth glancing at.
 */

const TABS = [
  { id: 'all', href: '/friends/all', labelKey: 'friends.all.title' },
  { id: 'requests', href: '/friends/requests', labelKey: 'friends.requests.title' },
  { id: 'suggestions', href: '/friends/suggestions', labelKey: 'friends.suggestions.title' },
];

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { data: pendingRequests } = usePendingRequests();

  const pendingCount = pendingRequests?.length ?? 0;
  const active = TABS.find((tab) => pathname.startsWith(tab.href))?.id ?? 'all';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
        {t('friends.title')}
      </h1>

      <Tabs
        aria-label={t('friends.title')}
        active={active}
        onChange={(id) => {
          const tab = TABS.find((candidate) => candidate.id === id);
          if (tab) router.push(tab.href);
        }}
        tabs={TABS.map((tab) => ({
          id: tab.id,
          label: t(tab.labelKey),
          // Only the incoming-requests tab carries a count, and only when there is one to carry.
          count: tab.id === 'requests' && pendingCount > 0 ? pendingCount : undefined,
        }))}
      />

      {children}
    </div>
  );
}
