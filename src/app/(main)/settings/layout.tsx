'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Card, Tabs } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * `/settings/*` — the machinery-config hub (Plates 04, 21).
 *
 * A LAYOUT WITH SIX REAL ROUTES, not one page with `useState`, and for the same reason
 * `/friends` is: these are linkable destinations. The GitHub OAuth callback lands on
 * `/settings/github`, the 428 hint and the explain CTA point at specific panels, and a person
 * should be able to bookmark "my tokens". A tab-strip over local state would 404 every one of
 * those links.
 *
 * IT IS THE STRIP IDIOM, NOT A LEFT SUB-NAV. The atlas sketches a left rail here, but the canvas
 * is 672 wide and every other tabbed screen in the product — profile, friends, knowledge,
 * library, admin — rides the same horizontal `<Card padding="0 10px"><Tabs/></Card>`. Six tabs
 * fit; the admin console already runs six. Consistency wins over the sketch (the atlas's own
 * rule).
 *
 * WHAT MOVED HERE: notification preferences (was `/notifications`), the GitHub panel (was
 * `/profile?tab=professional`), tokens + vault + the export template (were `/knowledge` tabs),
 * calendar connect (was per-event only), and picture management. `/profile` keeps identity;
 * `/knowledge` keeps the reading library.
 */
const TABS = [
  { id: 'notifications', href: '/settings/notifications', labelKey: 'settings.tabs.notifications' },
  { id: 'github', href: '/settings/github', labelKey: 'settings.tabs.github' },
  { id: 'tokens', href: '/settings/tokens', labelKey: 'settings.tabs.tokens' },
  { id: 'vault', href: '/settings/vault', labelKey: 'settings.tabs.vault' },
  { id: 'calendar', href: '/settings/calendar', labelKey: 'settings.tabs.calendar' },
  { id: 'picture', href: '/settings/picture', labelKey: 'settings.tabs.picture' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  // `/settings/github/callback` is a child of `/settings/github` and must not be highlighted as a
  // tab of its own — `startsWith` on the tab href covers it and lands the strip on "GitHub".
  const active = TABS.find((tab) => pathname.startsWith(tab.href))?.id ?? 'notifications';

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <div className="flex flex-col gap-[var(--nx-space-group)]">
        <Card padding="0 10px" className="flex">
          <Tabs
            aria-label={t('settings.title')}
            active={active}
            onChange={(id) => {
              const tab = TABS.find((candidate) => candidate.id === id);
              if (tab) router.push(tab.href);
            }}
            className="flex-1"
            tabs={TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }))}
          />
        </Card>

        {children}
      </div>
    </div>
  );
}
