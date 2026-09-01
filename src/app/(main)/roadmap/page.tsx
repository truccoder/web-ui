'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RoadmapList,
  RoadmapTrack,
  SkillVerificationForm,
  type RoadmapNode,
} from '@/features/roadmap';
import { useMyProfile } from '@/features/security';
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

  // Whose progress the track draws. Undefined while the profile loads, which `RoadmapTrack`
  // reads as "no state yet" rather than as "nothing verified" — it keeps the query idle instead of
  // asking `/users/NaN/roadmap-progress`.
  const { data: profile } = useMyProfile();

  /**
   * `secondary`, NOT `ghost`, and the reason is a reported miss rather than a taste call. A ghost
   * button is a word with no edges; sitting at the right end of a row next to a skill name it read
   * as a label, and the owner's report was literally *"tôi không thấy nơi nào để user xác nhận
   * roadmap"* — the one control this whole screen exists to offer. `secondary` gives it the strong
   * border that says "press me" without promoting a per-row action to the page's primary.
   *
   * ONE CONTROL FOR EVERY NODE, WHICH IS WHAT THE VERTICAL TRACK MADE POSSIBLE. This used to take a
   * `level` and render two shapes — a compact button in a skill row, a full-width one in a stage
   * card's footer — because the horizontal chain put claims in two structurally different places.
   * `RoadmapTrack` puts every node on one rail, so there is one placement and one control, and the
   * caller can no longer render the wrong shape for the position. The `claimStage` string went with
   * it: it existed to tell two identical buttons apart and there is now only one.
   */
  const claimAction = (node: RoadmapNode) => (
    <Button size="sm" variant="secondary" onClick={() => setClaiming(node)}>
      {t('roadmap.verify.claim')}
    </Button>
  );

  /**
   * TWO SHAPES ON ONE ROUTE, and which one renders is decided by `?id=` alone.
   *
   * `/roadmap` is the index: a canvas screen listing the tracks. `/roadmap?id=N` is focus
   * mode's `extent` tenant — the shell already drops the rail and the ledger for it and hands the
   * viewport over, and this branch is the other half of that: the track drawn full width, with no
   * page header competing with the context bar that now names it.
   *
   * THE LIST DOES NOT RENDER BESIDE THE TRACK ANY MORE. It used to, and stacking an index above a
   * detail is what made the old screen read as a settings page: you were always looking at the
   * menu and the thing at once. Picking a track is now an entrance, and the context bar's back
   * arrow is the way out — which is the whole argument for focus mode having a trail at all.
   */
  if (roadmapId !== undefined) {
    return (
      <>
        {/* `px-10` is the DS's 40 region gutter, the one horizontal value focus mode keeps; 48 at
            the bottom is the runout every scroller in this product ends with. `min-h-0` lets the
            region scroll inside the shell's flex column rather than growing past it. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-12 lg:px-10">
          <RoadmapTrack roadmapId={roadmapId} userId={profile?.id} renderNodeAction={claimAction} />
        </div>

        <ClaimDialog claiming={claiming} onClose={() => setClaiming(null)} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <RoadmapList
        selectedId={roadmapId}
        // `replace`, not `push`: picking a track is switching what you are looking at, not
        // travelling somewhere new, and `push` would make Back walk through every track the
        // reader glanced at before leaving the page.
        onSelect={(id) => router.replace(`/roadmap?id=${id}`)}
      />

      <ClaimDialog claiming={claiming} onClose={() => setClaiming(null)} />
    </div>
  );
}

/** One dialog, two shapes — extracted so the index and the track cannot drift apart. */
function ClaimDialog({ claiming, onClose }: { claiming: RoadmapNode | null; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog open={claiming !== null} onClose={onClose} title={t('roadmap.verify.claim')}>
      {claiming && <SkillVerificationForm node={claiming} onSubmitted={onClose} />}
    </Dialog>
  );
}
