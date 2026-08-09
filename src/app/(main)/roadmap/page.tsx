'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RoadmapList,
  RoadmapNodeTree,
  SkillVerificationForm,
  type RoadmapNode,
} from '@/features/roadmap';
import { Button, Dialog } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * `/roadmap` — browse the learning tracks and claim a skill.
 *
 * A NEW ROUTE RATHER THAN A REWIRE. This domain has never had any UI, so there was no page holding
 * roadmap code to migrate and no legacy to delete — the same situation as `/notifications` at
 * P2.6cd and `/knowledge` at P2.11d, and the same answer.
 *
 * THE AUTHORING AND MODERATION SURFACES ARE NOT HERE, THEY ARE ON `/admin/roadmap`, and that split
 * is forced rather than chosen: `middleware.ts` redirects any `ADMIN` session away from every path
 * outside `/admin/**`. An admin literally cannot open this page, so an admin-only panel placed on
 * it would be a control its only audience can never reach. Recorded in `findings/roadmap.md` §10.
 *
 * The page owns the URL and the dialog, and nothing else — no fetching, no knowledge of what a
 * node looks like. `?id=` keeps the open track in the address bar, the same shape `/search` uses
 * for `?q=`, so a reload or a shared link lands back on the same roadmap.
 */
export default function RoadmapPage() {
  return (
    <Suspense>
      <RoadmapContent />
    </Suspense>
  );
}

function RoadmapContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  // `Number()` on a missing param is 0 and on a bad one is NaN; both are rejected here so the
  // feature is only ever handed a real id or `undefined`, and never fires a request for `/0/nodes`.
  const rawId = Number(searchParams.get('id'));
  const roadmapId = Number.isInteger(rawId) && rawId > 0 ? rawId : undefined;

  // The claim form is the one piece of state that does NOT belong in the URL: it is a transient
  // action on a node, not a location, and a link to a half-filled form would restore a dialog the
  // recipient never opened.
  const [claiming, setClaiming] = useState<RoadmapNode | null>(null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">{t('roadmap.title')}</h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">{t('roadmap.subtitle')}</p>
      </div>

      <RoadmapList
        selectedId={roadmapId}
        // `replace`, not `push`: picking a track is switching what you are looking at, not
        // travelling somewhere new, and `push` would make Back walk through every track the
        // reader glanced at before leaving the page.
        onSelect={(id) => router.replace(`/roadmap?id=${id}`)}
      />

      <RoadmapNodeTree
        roadmapId={roadmapId}
        renderNodeAction={(node) => (
          <Button size="sm" variant="ghost" onClick={() => setClaiming(node)}>
            {t('roadmap.verify.claim')}
          </Button>
        )}
      />

      <Dialog
        open={claiming !== null}
        onClose={() => setClaiming(null)}
        title={t('roadmap.verify.claim')}
      >
        {claiming && (
          <SkillVerificationForm node={claiming} onSubmitted={() => setClaiming(null)} />
        )}
      </Dialog>
    </div>
  );
}
