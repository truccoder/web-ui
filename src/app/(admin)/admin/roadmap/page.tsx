'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PendingVerificationQueue, RoadmapAdminPanel, RoadmapList } from '@/features/roadmap';
import { useT } from '@/lib/i18n';

/**
 * `/admin/roadmap` — the moderation queue and the authoring forms.
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
 * `RoadmapList` is reused here rather than reimplemented — the authoring form needs a selected
 * track to add nodes to, and the reader's list is exactly the right control for choosing one.
 */
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

  // Same guard as the reader-side route: a missing param is 0 and a bad one is NaN, and neither
  // should reach the feature.
  const rawId = Number(searchParams.get('id'));
  const roadmapId = Number.isInteger(rawId) && rawId > 0 ? rawId : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">
          {t('roadmap.admin.title')}
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-nx-h3 text-nx-text-primary">{t('roadmap.queue.title')}</h2>
        <PendingVerificationQueue />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-nx-h3 text-nx-text-primary">{t('roadmap.title')}</h2>
        <RoadmapList
          selectedId={roadmapId}
          onSelect={(id) => router.replace(`/admin/roadmap?id=${id}`)}
        />
      </section>

      <RoadmapAdminPanel roadmapId={roadmapId} />
    </div>
  );
}
