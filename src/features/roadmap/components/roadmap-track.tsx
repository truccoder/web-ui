'use client';

import { Check, Clock } from 'lucide-react';
import { Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useRoadmapNodes, useRoadmapProgress } from '../hooks/use-roadmap';
import { buildTree, flattenTree, type TreeNode } from '../lib/tree';
import type { RoadmapNode, RoadmapProgress } from '../types/roadmap';

/**
 * One roadmap, drawn as a **vertical numbered path**: a rail down the left, one step per node,
 * each step carrying its own description and its own claim control.
 *
 * WHY THIS REPLACED THE HORIZONTAL CHAIN, and the reason is data rather than taste.
 * `RoadmapStagePath` read the tree as *stages side by side, their children as skills inside each* —
 * a faithful drawing of the kit's `/roadmap/{id}` tenant, which was designed against a fixture
 * where every track had three stages of four nodes. The seed the backend actually ships (`V88`,
 * 12 tracks / 103 nodes) has **`parent_node_id` NULL on all 103 rows**. Against that data the chain
 * degenerated: every node became a stage, so a track rendered as 12 near-identical cards with an
 * empty body each, ~3,900px wide, scrolled sideways. The `done/total` counter self-hid (no
 * children to count) and the skills list never rendered. Nothing was broken — the component even
 * documented the flat case as legal — but "not a bug" is not the same as "reads as a roadmap".
 *
 * THE VERTICAL PATH IS THE SHAPE THAT SURVIVES BOTH DATASETS, which is the whole argument for it.
 * A flat roadmap is 12 steps down a rail, correctly ordered and completely legible. A nested one is
 * the same rail with each step's children indented under it — the recursion below is not
 * speculative generality, it is what makes this component independent of whether the seed grows a
 * tree. The horizontal form could not do that: it hard-codes exactly two levels and gives level one
 * a card, so it has to be rewritten the day depth 3 exists and it renders badly until depth 2 does.
 *
 * IT IS ALSO THE AXIS THE SUBJECT ALREADY HAS. `orderIndex` is a sequence, and a sequence read
 * top-to-bottom needs no connector to explain itself — the reading order IS the order. The chain
 * spent a 48px hairline per gap saying what a numbered column says for free, and on a track wider
 * than the viewport it said it off-screen.
 *
 * THE DESCRIPTIONS ARE THE OTHER HALF OF THE FIX, AND THEY ARE WHY A ROW IS NOT A LINE.
 * `RoadmapNodeDto.description` is written for all 103 seeded nodes — *"Phương thức, mã trạng thái,
 * header. Phân biệt 401 và 403."* — and the header of `V88` records that the content was written by
 * the team rather than copied, precisely because `kamranahmedse/developer-roadmap` is NOASSERTION
 * and this seed runs on production. None of it had a path to the screen: the chain rendered `name`
 * only, and the one component that did render `description` (`RoadmapNodeTree`) was mounted by no
 * route. A node's description is the only thing on this page that tells a reader what the skill
 * MEANS, so it is body text in the step, not a tooltip.
 *
 * THE NUMBER IS THE MARKER, rather than a number beside a marker. Three states have to be
 * distinguishable at a glance and a step also has to say where it sits in the sequence; giving the
 * one 24px disc both jobs keeps the rail a single column of like things — a check when verified, a
 * clock when awaiting review, the step's own number when it is still open. It also means the
 * markers cannot drift out of alignment with the numbers, because there is only one glyph.
 *
 * ONLY TOP-LEVEL STEPS ARE NUMBERED. A child is a part of its parent, not step 4.2 of the track —
 * numbering depth would put arithmetic on screen that the data does not assert (nothing orders a
 * child against a different parent's child). Children take the 16px dot the legend already
 * describes, and inherit their position from the indent.
 *
 * THE MEASURE IS THE CANVAS'S 672, CENTRED. `/roadmap?id=N` used to be focus mode's `extent`
 * tenant — full width, no rail, no ledger — and this component still capped itself at
 * `--spacing-nx-canvas` because a column of rows with prose in it reads badly at 1,800px. The
 * focus shape was dropped ("để ở canvas chính là đủ rồi") and the track now renders in the
 * ordinary canvas, which is already that width; the cap here is therefore redundant with the
 * canvas's own but kept so the component is still legible mounted anywhere else.
 * `--nx-path-stage`, `--nx-path-stage-max` and `--nx-path-connector` go back to having no
 * consumer, which is where they were before the chain.
 *
 * `REJECTED` FOLDS INTO "NOT STARTED", carried forward from the chain along with its reason: a
 * rejected claim is one you may make again, so the useful thing to show is that the step is open
 * to you. A permanent red mark on your own track would be a punishment for having tried. The row
 * keeps its claim control, which a verified or pending row does not.
 */
export interface RoadmapTrackProps {
  /** Undefined while no roadmap is selected — the queries stay idle. */
  roadmapId?: number;
  /**
   * Whose progress to draw. Undefined renders the track with no state on it, which is the correct
   * reading for a signed-out visitor rather than a broken one.
   */
  userId?: number;
  /**
   * Rendered on a node the viewer may still claim. Omit for a read-only path.
   *
   * ONE SHAPE, NO `level` PARAMETER, and dropping it is a simplification the new layout earns. The
   * chain had two placements — a compact button at the end of a 32-tall skill row, a full-width one
   * in a stage card's footer — so it had to tell the caller which it was asking for. Here every
   * node is a step in one rail and every claim sits in the same place, so there is nothing to
   * disambiguate and the caller cannot render the wrong control for the position.
   */
  renderNodeAction?: (node: RoadmapNode) => React.ReactNode;
  className?: string;
}

type NodeState = 'verified' | 'pending' | 'open';

function stateOf(nodeId: number, byNode: Map<number, RoadmapProgress['status']>): NodeState {
  const status = byNode.get(nodeId);
  if (status === 'VERIFIED') return 'verified';
  if (status === 'PENDING_APPROVAL') return 'pending';
  return 'open';
}

/**
 * The step's disc — the marker and the number in one glyph, for the reason in the file note.
 *
 * TWO SIZES, AND THE SMALL ONE CARRIES NO NUMBER. A top-level step is 24 and prints its ordinal; a
 * child is a 16px dot, because it is not numbered (see the file note) and because a second column
 * of numbers indented under the first would read as a version string.
 *
 * The legend renders this at `size="child"` with no ordinal, so the legend's swatch and the rail's
 * marker are one component and cannot disagree — the property the chain's `StateMark` had and the
 * one thing worth carrying over from it verbatim.
 */
function StepMark({
  state,
  ordinal,
  size = 'step',
}: {
  state: NodeState;
  ordinal?: number;
  size?: 'step' | 'child';
}) {
  const big = size === 'step';
  const box = big ? 'size-6' : 'size-4';
  const icon = big ? 'size-3.5' : 'size-2.5';

  if (state === 'verified') {
    return (
      <span
        className={cn(
          box,
          'grid shrink-0 place-items-center rounded-nx-full bg-nx-rep-soft text-nx-rep-text'
        )}
        aria-hidden
      >
        <Check className={icon} strokeWidth={3} />
      </span>
    );
  }
  if (state === 'pending') {
    return (
      <span
        className={cn(
          box,
          'grid shrink-0 place-items-center rounded-nx-full bg-nx-status-info-bg text-nx-status-info-fg'
        )}
        aria-hidden
      >
        <Clock className={icon} strokeWidth={2.5} />
      </span>
    );
  }
  /**
   * An open step is a ring, so the three states differ in FILL rather than only in the symbol
   * inside them — the distinction survives being looked at quickly and survives being printed.
   *
   * The number goes here and only here: once a step is verified or pending, its state is the thing
   * worth saying, and the ordinal is recoverable by counting. `bg-nx-surface-card` keeps the ring
   * legible where a row is hovered.
   */
  return (
    <span
      className={cn(
        box,
        'grid shrink-0 place-items-center rounded-nx-full border border-nx-border-default bg-nx-surface-card',
        'font-mono text-nx-caption tabular-nums text-nx-text-muted'
      )}
      aria-hidden
    >
      {big && ordinal !== undefined ? ordinal : null}
    </span>
  );
}

/**
 * One child node, indented under its parent.
 *
 * A FLAT ROW RATHER THAN A NESTED STEP, and the asymmetry is deliberate: the rail is the track's
 * spine and there is one of it. Giving children their own rail would draw a second spine that means
 * something different at every depth, which is the mistake the horizontal chain made in the other
 * direction. A child is a 16px dot, its name, its description — a member of a set the parent
 * already names, which is exactly the case R10 §2 gives to a divided row.
 *
 * `RECURSES`, so depth 3 renders as depth 3 rather than being dropped. Nothing in the seed produces
 * it today; the alternative is a component that silently loses data the moment an admin nests one
 * level further, which is the same class of defect as `buildTree`'s orphan case and gets the same
 * answer.
 */
function ChildRow({
  node,
  byNode,
  renderNodeAction,
}: {
  node: TreeNode;
  byNode: Map<number, RoadmapProgress['status']>;
  renderNodeAction?: (node: RoadmapNode) => React.ReactNode;
}) {
  const state = stateOf(node.id, byNode);
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <StepMark state={state} size="child" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              'text-nx-body-sm',
              state === 'open' ? 'text-nx-text-secondary' : 'text-nx-text-primary'
            )}
          >
            {node.name}
          </span>
          {node.description && (
            <span className="text-nx-caption text-nx-text-secondary">{node.description}</span>
          )}
        </div>
        {/* Only where a claim is still possible — a verified node has nothing left to ask for and
            a pending one has already asked. Same rule at every depth. */}
        {state === 'open' && renderNodeAction?.(node)}
      </div>

      {node.children.length > 0 && (
        <ul className="flex flex-col gap-3 border-l border-nx-border-subtle pl-4">
          {node.children.map((grandchild) => (
            <ChildRow
              key={grandchild.id}
              node={grandchild}
              byNode={byNode}
              renderNodeAction={renderNodeAction}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * One top-level step: the numbered disc on the rail, the name, the description, the claim.
 *
 * THE RAIL IS DRAWN BY THE STEP, NOT BY THE LIST, and that is what makes it end in the right place.
 * A single absolutely-positioned line behind the whole column has to be told where to stop, and
 * every answer is wrong at some content height — it either overshoots past the last disc or is cut
 * short of it. Here each step except the last hangs a segment from under its own disc down through
 * its own body, so the rail is exactly as long as the steps it joins and needs no measurement.
 *
 * THE SEGMENT'S LEFT EDGE IS THE DISC'S CENTRE, derived rather than nudged: the disc is 24 wide, so
 * its centre is 12 from the column's left edge, and a 1px line centred there starts at 11.5. The
 * grid's first track is the disc's own width, which is what lets the line and the disc share one
 * origin without either of them knowing the other's number.
 *
 * A STEP IS NOT A CARD. It was, in the chain, and P3 justified it there — a stage had its own name,
 * its own count and its own progress. A step in a rail has a marker doing that work, and a column
 * of 12 filled boxes each holding two lines of text is a ladder of doubled edges between every
 * pair; the rail already separates them. The hover tint stays, bleeding to the row's full width, so
 * the step still reads as one object you can act on.
 */
function Step({
  node,
  ordinal,
  last,
  byNode,
  renderNodeAction,
}: {
  node: TreeNode;
  ordinal: number;
  last: boolean;
  byNode: Map<number, RoadmapProgress['status']>;
  renderNodeAction?: (node: RoadmapNode) => React.ReactNode;
}) {
  const state = stateOf(node.id, byNode);
  const descendants = flattenTree(node.children);
  const done = descendants.filter((d) => stateOf(d.id, byNode) === 'verified').length;

  return (
    <li className="relative grid grid-cols-[24px_1fr] gap-x-3 gap-y-2">
      {/**
       * The rail segment for this step. `top-6` is the disc's own height — the line starts where
       * the disc ends rather than behind it, so a 1px rule never shows through a ring's fill.
       * `left-[11.5px]` is the disc's centre less half the line's width; both are the control's own
       * geometry, not rungs on the ladder.
       */}
      {!last && (
        <span
          aria-hidden
          // `top-6` and `left-[11.5px]` are the disc's own geometry — a 24px disc's height, and its
          // centre less half a 1px rule — not rungs on the proximity ladder. The lint rule only
          // guards the spacing props, so neither needs a disable; they are called out here so the
          // next reader does not "correct" them onto the ladder.
          className="absolute top-6 bottom-0 left-[11.5px] w-px bg-nx-border-subtle"
        />
      )}

      <StepMark state={state} ordinal={ordinal} />

      {/* `min-h-6` keeps a one-word step's name centred on its own disc; the disc is 24 and the
          name's line box is shorter, so without it a short step sits high against its number. */}
      <div className="flex min-h-6 min-w-0 items-start gap-3">
        <h3 className="min-w-0 flex-1 text-nx-ui font-semibold text-nx-text-primary">
          {node.name}
        </h3>
        {/* The counter is a fact about the children, so it only exists where there are children.
            On the flat seed it is absent from every step, which is correct — `0/0` is not a
            progress report. */}
        {descendants.length > 0 && (
          <span className="shrink-0 font-mono text-nx-caption tabular-nums text-nx-text-muted">
            {done}/{descendants.length}
          </span>
        )}
        {state === 'open' && renderNodeAction?.(node)}
      </div>

      {/**
       * THE BODY SITS IN THE SECOND COLUMN, so the description and the children share the name's
       * left edge and the rail runs down beside all of them. `pb` is the gap to the next step,
       * paid here rather than by the list, because the rail segment has to reach through it — a
       * `gap` on the `<ol>` would leave a 20px break in the line at every boundary.
       */}
      {(node.description || node.children.length > 0) && (
        <div className={cn('col-start-2 flex flex-col gap-3', last ? 'pb-0' : 'pb-5')}>
          {node.description && (
            <p className="text-nx-body-sm text-nx-text-secondary">{node.description}</p>
          )}

          {node.children.length > 0 && (
            <ul className="flex flex-col gap-3">
              {node.children.map((child) => (
                <ChildRow
                  key={child.id}
                  node={child}
                  byNode={byNode}
                  renderNodeAction={renderNodeAction}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* A step with no body still owes the next one its gap, and the rail still has to cross it. */}
      {!node.description && node.children.length === 0 && !last && (
        <span aria-hidden className="col-start-2 pb-5" />
      )}
    </li>
  );
}

export function RoadmapTrack({
  roadmapId,
  userId,
  renderNodeAction,
  className,
}: RoadmapTrackProps) {
  const t = useT();
  const nodes = useRoadmapNodes(roadmapId);
  const { data: progress } = useRoadmapProgress(userId ?? Number.NaN, userId != null);

  const byNode = new Map<number, RoadmapProgress['status']>();
  for (const row of progress ?? []) byNode.set(row.nodeId, row.status);

  if (roadmapId === undefined) {
    return (
      <EmptyState
        compact
        className={className}
        title={t('roadmap.nodes.pickRoadmap')}
        description={t('roadmap.nodes.pickRoadmapDesc')}
      />
    );
  }

  if (nodes.isLoading) {
    /**
     * THE SKELETON IS THE SHAPE, NOT A BLOCK. Three steps of a disc and two lines, which is what
     * arrives — a placeholder that does not resemble the result makes the load look like a
     * different screen and then a jump. The chain's skeleton drew three cards side by side and was
     * wrong in exactly that way once the layout stopped being three cards side by side.
     */
    return (
      <div className={cn('mx-auto flex w-full max-w-nx-canvas flex-col gap-5', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[24px_1fr] gap-x-3">
            <Skeleton circle height={24} />
            <Skeleton lines={2} />
          </div>
        ))}
      </div>
    );
  }

  if (nodes.isError) {
    return (
      <EmptyState
        compact
        className={className}
        title={t('roadmap.nodes.loadFailed')}
        description={getErrorMessage(nodes.error)}
      />
    );
  }

  const steps = buildTree(nodes.data ?? []);

  if (steps.length === 0) {
    // This cannot distinguish "no such roadmap" from "roadmap with no nodes": the endpoint answers
    // 200 `[]` for a bad id rather than 404. The wording covers both without claiming which.
    return (
      <EmptyState
        compact
        className={className}
        title={t('roadmap.nodes.empty')}
        description={t('roadmap.nodes.emptyDesc')}
      />
    );
  }

  /**
   * THE SUMMARY COUNTS EVERY NODE ON THE TRACK, at every depth. Counting only top-level steps would
   * report `3/12` on the flat seed and `0/3` on a nested track with nine verified skills under three
   * untouched parents — the same number meaning two different things. A track's progress is how much
   * of the track is verified, so `flattenTree` over the roots is the population.
   */
  const all = flattenTree(steps);
  const verified = all.filter((node) => stateOf(node.id, byNode) === 'verified').length;
  const percent = Math.round((verified / all.length) * 100);

  return (
    // `max-w-nx-canvas` and centred: a reading measure for the prose in the rows. Redundant with
    // the canvas's own cap now that this renders there, kept so it holds up mounted elsewhere.
    <div className={cn('mx-auto flex w-full max-w-nx-canvas flex-col gap-5', className)}>
      {/**
       * THE HEADER IS THE TRACK'S OWN PROGRESS, and it is the one thing the old screen could not
       * say at all — the chain published `done/total` per stage and nothing for the track, so a
       * reader could not answer "how far am I" without adding up cards. It sits above the rail and
       * just under the track's name, which the detail page (`roadmap/page.tsx`) prints.
       *
       * `userId` gates it. With nobody signed in every node is `open` by construction, so a bar
       * reading `0/12 · 0%` would be reporting the absence of a session as a lack of progress.
       */}
      {userId != null && (
        <Card padding={12} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-nx-body-sm text-nx-text-secondary">
              {t('roadmap.track.progress', { done: verified, total: all.length })}
            </span>
            <span className="font-mono text-nx-caption tabular-nums text-nx-text-muted">
              {percent}%
            </span>
          </div>
          {/* `--nx-tint` rather than `surface-sunken` for the track, the same call `RepProgress`
              documents: sunken and the page ground are the same step since R15, so a sunken bar on
              the ground is a 4px invisible line. `--nx-rep` is the product's one sanctioned amber
              and a verified skill is reputation, which is what it is for. */}
          <div
            className="h-1 w-full overflow-hidden rounded-nx-full bg-nx-tint"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('roadmap.track.progressLabel')}
          >
            <div
              className="h-full rounded-nx-full bg-nx-rep transition-[width] duration-[var(--nx-duration-base)] ease-nx-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </Card>
      )}

      {/* Conditional on there being something to instruct: without `renderNodeAction` nothing here
          is clickable, so a sentence telling the reader to claim would be a lie. */}
      {renderNodeAction && (
        <p className="text-nx-body-sm text-nx-text-secondary">{t('roadmap.track.hint')}</p>
      )}

      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <Step
            key={step.id}
            node={step}
            ordinal={index + 1}
            last={index === steps.length - 1}
            byNode={byNode}
            renderNodeAction={renderNodeAction}
          />
        ))}
      </ol>

      {/* The legend earns its line because the markers are shapes, not words — and it is the only
          place the three states are named. Rendered at the child size so the row stays one line. */}
      <ul className="flex flex-wrap items-center gap-3 text-nx-caption text-nx-text-muted">
        {(['verified', 'pending', 'open'] as const).map((state) => (
          <li key={state} className="flex items-center gap-2">
            <StepMark state={state} size="child" />
            {t(`roadmap.path.legend.${state}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
