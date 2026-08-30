'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PageHeader, Tabs } from '@/shared/components';
import { useInfiniteFriends, usePendingRequests } from '@/features/friendships';
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

/**
 * TAB ORDER IS THE KIT'S — `Lời mời · Gợi ý · Bạn bè` — and it is not the order the app had.
 *
 * `Tất cả` used to lead because it is the biggest list. The kit leads with the queue instead, and
 * that is the better read: requests are the only tab with a deadline attached (someone is waiting),
 * suggestions are the only one that grows the graph, and the friends list is the one you go to
 * when you already know who you are looking for. Ordered by what needs you, not by size.
 *
 * The rail still points at `/friends/all`; the order here is the strip's, not the entry point's.
 */
const TABS = [
  { id: 'requests', href: '/friends/requests', labelKey: 'friends.requests.title' },
  { id: 'suggestions', href: '/friends/suggestions', labelKey: 'friends.suggestions.title' },
  { id: 'all', href: '/friends/all', labelKey: 'friends.all.title' },
];

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { data: pendingRequests } = usePendingRequests();

  // Shares the friends list's cache entry, so the strip's count and the list's own subtitle can
  // never disagree and no extra request is made.
  const { data: friendPages } = useInfiniteFriends();

  const pendingCount = pendingRequests?.length ?? 0;
  const friendCount = friendPages?.pages[0]?.totalCount ?? 0;
  const active = TABS.find((tab) => pathname.startsWith(tab.href))?.id ?? 'all';

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <PageHeader title={t('friends.title')} />

      {/* Tabs bind DOWN to the panel they name: 16 to the list, the canvas's own 40 to the
          heading. The strip used to sit 40 from both, which on the one screen where the tabs ARE
          the navigation left them looking like a third thing between the title and the content
          rather than the control that chose it. */}
      <div className="flex flex-col gap-[var(--nx-space-group)]">
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
            /**
             * TWO TABS CARRY A COUNT, and the third deliberately does not.
             *
             * `Lời mời` counts a queue — it is the number that decides whether to open the tab at
             * all. `Bạn bè` counts the collection, which the kit shows as `128`; it comes from the
             * SAME query the list itself runs (`useInfiniteFriends`), so this is a cache read and
             * not a second request.
             *
             * `Gợi ý` has no count because a suggestion count means nothing: the endpoint returns
             * whatever page you ask for out of a ranked stream, so any number here would be
             * describing the page size, not a quantity of suggestions.
             */
            count:
              tab.id === 'requests'
                ? pendingCount > 0
                  ? pendingCount
                  : undefined
                : tab.id === 'all'
                  ? friendCount > 0
                    ? friendCount
                    : undefined
                  : undefined,
          }))}
        />

        {children}
      </div>
    </div>
  );
}
