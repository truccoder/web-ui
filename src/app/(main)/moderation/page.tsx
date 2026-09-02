'use client';

import { Suspense } from 'react';
import { Card, Tabs } from '@/shared/components';
import { MyAppealsPanel, MyViolationsPanel } from '@/features/moderation';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { useT } from '@/core/i18n';

/**
 * `/moderation` — "Vi phạm & Kháng cáo của tôi" (Plate 16, user side).
 *
 * IT WAS A `Disclosure` ON `/profile?tab=account`. A rejected post plus the automatic seven-day
 * ban two rejections trigger is a serious enough thing to happen to an account that folding it
 * into an accordion three sections down a settings tab undersold it. The shell's `AccountBanBanner`
 * now links here, and so does the pointer left on the account tab.
 *
 * TWO TABS because a violation and the outcome of contesting it are two states — see the panels.
 * Deep-linkable and reload-stable via `useTabParam`.
 *
 * IT CARRIES AN `<h1>`, WHICH MOST `(main)` PAGES DO NOT. The no-heading rule exists because the
 * rail already names a page a reader chose from a list of destinations; this one has no rail row
 * — it is reached only by following the ban banner or the pointer left on the account tab — so a
 * reader arriving here cold has nothing else on screen saying where they are.
 */
const TAB_IDS = ['violations', 'appeals'] as const;

export default function ModerationPage() {
  return (
    <Suspense>
      <ModerationContent />
    </Suspense>
  );
}

function ModerationContent() {
  const t = useT();
  const [tab, setTab] = useTabParam(TAB_IDS, 'violations');

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <h1 className="text-nx-title font-semibold text-nx-text-primary">
        {t('moderationMine.title')}
      </h1>

      <div className="flex flex-col gap-[var(--nx-space-group)]">
        <Card padding="0 10px" className="flex">
          <Tabs
            aria-label={t('moderationMine.title')}
            active={tab}
            onChange={setTab}
            className="flex-1"
            tabs={[
              { id: 'violations', label: t('moderationMine.tabs.violations') },
              { id: 'appeals', label: t('moderationMine.tabs.appeals') },
            ]}
          />
        </Card>

        {tab === 'violations' && <MyViolationsPanel />}
        {tab === 'appeals' && <MyAppealsPanel />}
      </div>
    </div>
  );
}
