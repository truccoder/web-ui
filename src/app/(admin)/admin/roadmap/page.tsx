'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PendingVerificationQueue, RoadmapAdminPanel, RoadmapList } from '@/features/roadmap';
import { Card, Tabs } from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { useT } from '@/core/i18n';

/**
 * `/admin/roadmap` — the verification queue and the authoring forms.
 *
 * UNDER `(admin)` BECAUSE THE ROUTER LEAVES NO CHOICE. `middleware.ts` redirects any `ADMIN`
 * session away from every path outside `/admin/**`, so these two surfaces would be unreachable by
 * their only audience anywhere else. This is not a statement that the split is ideal — it is what
 * the app's existing navigation rules permit. `findings/roadmap.md` §10.
 *
 * AND THE GATE IS STILL NOT SECURITY. The route sits behind the admin layout and the components
 * behind `useIsRoadmapAdmin`, but the backend enforces nothing on these endpoints: `@PreAuthorize`
 * never runs because method security is not enabled (B20). Anyone with a session can call them
 * directly. Two client-side gates are the right thing to ship and are not a substitute for the
 * backend fix.
 *
 * TWO TABS, NOT ONE LONG SCROLL. The queue (~30 pending claims), the track list (~12 cards) and
 * the two authoring forms used to stack down one ~4500px page, so a moderator working the queue
 * scrolled past a create-roadmap form to reach page 2. `/admin/moderation` already splits its six
 * jobs this way; this follows it — `Chờ duyệt` is a stream of items to work through, `Quản lý lộ
 * trình` is where a track is picked and edited. `RoadmapList` is reused on the second tab because
 * the authoring form needs a selected track and the reader's list is the right control for one.
 */
const TAB_IDS = ['queue', 'tracks'] as const;

export default function AdminRoadmapPage() {
  return (
    <Suspense>
      <AdminRoadmapContent />
    </Suspense>
  );
}

function AdminRoadmapContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useTabParam(TAB_IDS, 'queue');

  // Same guard as the reader-side route: a missing param is 0 and a bad one is NaN, and neither
  // should reach the feature.
  const rawId = Number(searchParams.get('id'));
  const roadmapId = Number.isInteger(rawId) && rawId > 0 ? rawId : undefined;

  return (
    // NO `<h1>` — the admin header nav (`(admin)/layout.tsx`) already names this destination and
    // highlights it while active, same as `/admin/moderation` beside it and every rail-linked
    // screen in the main app (`/library`, `/projects`, `/settings`).
    //
    // THE STRIP BINDS DOWN TO THE PANEL AT 12, not the wide pages' 16 — the admin canvas is
    // deliberately denser than `/profile` or `/library`, matching `/admin/moderation`'s own ratio.
    <div className="flex flex-col gap-[var(--nx-space-element)]">
      <Card padding="0 10px" className="flex">
        <Tabs
          aria-label={t('roadmap.admin.title')}
          active={tab}
          onChange={setTab}
          className="flex-1"
          tabs={[
            { id: 'queue', label: t('roadmap.queue.title') },
            { id: 'tracks', label: t('roadmap.title') },
          ]}
        />
      </Card>

      {tab === 'queue' && <PendingVerificationQueue />}

      {tab === 'tracks' && (
        <div className="flex flex-col gap-10">
          <RoadmapList
            selectedId={roadmapId}
            // `tab=tracks` is kept explicitly: `router.replace` builds a fresh URL, and a track
            // is only ever picked from this tab, so dropping the reader back onto `Chờ duyệt`
            // after selecting one would lose the panel they were about to edit.
            onSelect={(id) => router.replace(`/admin/roadmap?tab=tracks&id=${id}`)}
          />
          <RoadmapAdminPanel roadmapId={roadmapId} />
        </div>
      )}
    </div>
  );
}
