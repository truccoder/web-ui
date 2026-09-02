'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  RoadmapList,
  RoadmapTrack,
  SkillVerificationForm,
  useRoadmaps,
  type RoadmapNode,
} from '@/features/roadmap';
import { useMyProfile } from '@/features/security';
import { BACK_TO_PARAM, safeBackTo } from '@/features/search';
import { Badge, Button, Dialog } from '@/shared/components';
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
 *
 * TWO SHAPES ON ONE ROUTE, `?id=` DECIDES WHICH. `/roadmap` is the list of tracks; `/roadmap?id=N`
 * is one track's own detail view — the list gives way to it entirely, and a back link at the top
 * is the way out (to `/search` when a `?backTo=` says the track was opened from there, otherwise
 * to the list). This used to be focus mode's `extent` shape — full width, no rail, no ledger, a
 * context bar for the trail — until the owner asked for it back in the ordinary canvas (*"tab
 * roadmap đang fullscreen … bỏ luôn đi, để ở canvas chính là đủ rồi"*, then *"bấm vào skill nào
 * thì đưa vào trang chi tiết skill đó chứ không phải hiển ở dưới"*). Same two shapes, standard
 * chrome, and the detail view now prints the track's own name because no context bar does.
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

  const backTo = safeBackTo(searchParams.get(BACK_TO_PARAM));

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

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {roadmapId === undefined ? (
        <RoadmapList
          // `push`, not `replace`: opening a track is now a navigation to its own detail view, so
          // Back is the reader's way to the list — the same contract `/projects` has with its board.
          onSelect={(id) => router.push(`/roadmap?id=${id}`)}
        />
      ) : (
        <RoadmapDetail
          roadmapId={roadmapId}
          userId={profile?.id}
          backTo={backTo}
          renderNodeAction={claimAction}
        />
      )}

      <ClaimDialog claiming={claiming} onClose={() => setClaiming(null)} />
    </div>
  );
}

/**
 * One track's detail view — the header, then the track itself.
 *
 * IT NAMES ITS OWN TRACK, which the focus-mode version did not have to: the context bar carried
 * the name and this canvas just drew steps. With the bar gone, the page owes the reader a title.
 * `useRoadmaps` is the list that `RoadmapList` already mounts, keyed the same, so the ordinary way
 * in — a click on a card — arrives with the name in cache and no second request. A shared `?id=`
 * link pays for one small `GET /roadmaps`; the API has no per-roadmap row to prefer.
 *
 * The hook lives here rather than in `RoadmapContent` so it only runs on the route that needs a
 * name — the list route already has `RoadmapList` fetching the same data and gains nothing from a
 * second caller.
 */
function RoadmapDetail({
  roadmapId,
  userId,
  backTo,
  renderNodeAction,
}: {
  roadmapId: number;
  userId?: number;
  backTo: string | null;
  renderNodeAction: (node: RoadmapNode) => React.ReactNode;
}) {
  const t = useT();
  const { data: roadmaps } = useRoadmaps();
  const roadmap = roadmaps?.find((entry) => entry.id === roadmapId);

  return (
    <>
      <div className="flex flex-col gap-[var(--nx-space-tight)]">
        <Link
          href={backTo ?? '/roadmap'}
          className="inline-flex w-fit items-center gap-2 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backTo ? t('search.backToResults') : t('nav.roadmap')}
        </Link>

        {/* Absent until the list answers, and for an `?id=` that names no track — the same "absent
            is a real state" the context bar's title had. The track below carries its own empty and
            error states for the id itself. */}
        {roadmap && (
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
              {roadmap.name}
            </h1>
            {roadmap.category !== 'OTHER' && (
              <Badge>{t(`learningCategory.${roadmap.category}`)}</Badge>
            )}
          </div>
        )}

        {roadmap?.description && (
          <p className="text-nx-body-sm text-nx-text-secondary">{roadmap.description}</p>
        )}
      </div>

      <RoadmapTrack roadmapId={roadmapId} userId={userId} renderNodeAction={renderNodeAction} />
    </>
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
