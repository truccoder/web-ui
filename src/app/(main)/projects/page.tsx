'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button, Card, Tabs } from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
import {
  CreateProjectDialog,
  MyApplications,
  ProjectList,
  SuggestedProjects,
} from '@/features/matchmaking';
import { useT } from '@/core/i18n';

/**
 * `/projects` — the matchmaking board. Owning domain: `matchmaking`.
 *
 * THE ROUTE THIS PROJECT WROTE OFF. `matchmaking` had types, api and hooks since P2.16ab and no
 * screen at all, recorded in the migration ledger as "không dựng được màn nào mà không bịa dữ
 * liệu": no endpoint listed projects, positions or applications, so the ids the write endpoints
 * needed could not be obtained. `GET /projects` and its siblings removed that, and this is the
 * surface they unlock.
 *
 * TWO TABS, LOCAL STATE. `Bảng dự án` is everyone's; `Đơn của tôi` is yours. They are state rather
 * than routes because neither ever had a URL for anyone to be holding a link to — the opposite of
 * `/friends`, whose three tabs were three pre-existing routes.
 *
 * CREATING OPENS WHAT IT MADE. That is only possible because `createProject` returns the project
 * with its id now; while it answered `void`, a creator had no way to reach their own project and
 * the honest UI would have been a form that says "sent" and stops.
 */
const TAB_IDS = ['board', 'mine'] as const;

export default function ProjectsPage() {
  // `useTabParam` reads the query string, which needs a Suspense boundary in the App Router.
  return (
    <Suspense>
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useTabParam(TAB_IDS, 'board');
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* `?tab=mine` rather than state alone. The paragraph above says these two never had URLs of
          their own, and that stays true of ROUTES — but a reader who submits an application and
          refreshes was being put back on the board, which is the one tab they were not looking at.

          Grouped with its panel: 16 down to the list it filters. The strip is now the first thing
          in the canvas, so it takes the canvas's own top rung instead of a rule written against a
          heading that no longer sits above it. */}
      <div className="flex flex-col gap-[var(--nx-space-group)]">
        {/* THE CREATE BUTTON MOVED HERE FROM `PageHeader`'s `action` slot when the header itself
            was dropped — the control still needs a home, and the tab strip's own row is it: the
            button acts on the whole board this strip filters, not on either tab specifically, so
            it sits beside the strip rather than inside a panel under it.

            THE WHITE CARD IS `/newsfeed`'s OWN GROUND, carried here — `Tabs` paints no fill of
            its own, see its header. `padding "0 10px"` matches the `p-2.5` `/newsfeed`'s
            `StickyBlock` row spends around the same strip. */}
        <Card
          padding="0 10px"
          className="flex items-center justify-between gap-[var(--nx-space-element)]"
        >
          <Tabs
            aria-label={t('projects.title')}
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'board', label: t('projects.tabs.board') },
              { id: 'mine', label: t('projects.tabs.mine') },
            ]}
          />

          <Button size="sm" icon={<Plus />} onClick={() => setCreating(true)}>
            {t('projects.create.action')}
          </Button>
        </Card>

        {tab === 'board' ? (
          <>
            {/* Board-only: this is a "for you" cut of the same list, ranked against the
                caller's own professional profile, which "Đơn của tôi" has no equivalent axis
                for. Renders nothing itself when there is no match to show. */}
            <SuggestedProjects />
            <ProjectList />
          </>
        ) : (
          <MyApplications />
        )}
      </div>

      <CreateProjectDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(projectId) => router.push(`/projects/${projectId}`)}
      />
    </div>
  );
}
