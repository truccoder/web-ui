'use client';

import { Fragment } from 'react';
import { Check, Clock } from 'lucide-react';
import { Card, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useRoadmapNodes, useRoadmapProgress } from '../hooks/use-roadmap';
import { buildTree } from '../lib/tree';
import type { RoadmapNode, RoadmapProgress } from '../types/roadmap';

/**
 * One roadmap, drawn as the kit draws it: a **horizontal chain of stages**, left to right, joined
 * by hairline connectors.
 *
 * WHY A CHAIN AND NOT THE NESTED TREE WE HAD. `RoadmapNodeTree` renders `parentNodeId` as
 * indentation, which is a faithful picture of the *data* and a poor picture of the *subject*: a
 * learning track is a sequence you move along, and indentation says containment, not order. The
 * kit's answer, measured on its `/roadmap/{id}` tenant, reads the same two levels as a path — top
 * level nodes become stages side by side, their children become the skills inside each stage — so
 * the axis that carries progress is the one the eye already scans.
 *
 * IT IS ALSO WHY THIS SCREEN IS FULL WIDTH. Focus mode's `extent` parameter exists for exactly one
 * kind of content: something whose natural axis is horizontal and which a 672 measure would fold
 * into a column. Three stages at `flex: 1 1 280px` need 1176; the canvas has 672. The owner's
 * *Roadmap cũng phải làm full tối đa* and the DS's tenant table are the same instruction.
 *
 * THE GEOMETRY IS MEASURED, NOT INVENTED:
 *
 *     stage      flex 1 1 280px, max 360 · surface-card · 16px 20px · radius 8
 *     connector  48 × 1 · border-subtle · margin-top 32   ← the header row's own height, so the
 *                                                            line meets the cards where their
 *                                                            titles end rather than floating
 *     row        32 tall · padding 0 20 · bleeding the card's 20 via -mx-5
 *     track      gap 20 between the chain and its legend · runout 48
 *
 * `--nx-path-stage`, `--nx-path-stage-max` and `--nx-path-connector` have carried 280 / 360 / 48
 * since round 7 with **no consumer in this app** — they were waiting for this component.
 *
 * THE THREE STATES ARE REAL NOW, AND THE OLD COMMENT SAYING THEY COULD NOT BE IS STALE. B21 —
 * *nothing exposes `findByUserId`, so a node cannot be shown as verified for the signed-in user* —
 * was closed when `GET /users/{userId}/roadmap-progress` shipped; the ledger has been reading it
 * for the current user for some time. So a node is `VERIFIED`, `PENDING_APPROVAL`, or neither.
 *
 * A STAGE IS CLAIMABLE, NOT JUST THE SKILLS UNDER IT. It used to be the other way round, and the
 * omission was invisible in the wrong way: `POST /skills/verify` takes any node id, so the backend
 * has always accepted a top-level claim, while this component rendered the action on children
 * only. On the seeded `Backend Developer` track that hid the control from four of thirteen nodes;
 * on a FLAT roadmap — which `parentNodeId` being optional makes legal, see the note further down —
 * it hid the control from the entire page, so a reader would conclude the product has no way to
 * claim anything at all. The stage header carries the same `StateMark`, the same `open`-only rule
 * and the same action as a skill row, because a stage is a node and nothing about it is special.
 *
 * `REJECTED` FOLDS INTO "NOT STARTED" RATHER THAN BECOMING A FOURTH STATE, and that is a product
 * judgement stated rather than hidden: a rejected claim is one you may make again, so the useful
 * thing to show is that the skill is open to you — a permanent red mark on your own track would be
 * a punishment for trying. The row keeps its claim control, which a verified or pending row does
 * not. If rejection ever needs to carry a reason, this is the line to reopen.
 */
export interface RoadmapStagePathProps {
  /** Undefined while no roadmap is selected — the queries stay idle. */
  roadmapId?: number;
  /**
   * Whose progress to draw. Undefined renders the track with no state on it, which is the correct
   * reading for a signed-out visitor rather than a broken one.
   */
  userId?: number;
  /** Rendered on a node the viewer may still claim. Omit for a read-only path. */
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

/** The legend's swatch and the row's marker are one component, so they cannot disagree. */
function StateMark({ state }: { state: NodeState }) {
  if (state === 'verified') {
    return (
      <span
        className="grid size-4 shrink-0 place-items-center rounded-nx-full bg-nx-rep-soft text-nx-rep-text"
        aria-hidden
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'pending') {
    return (
      <span
        className="grid size-4 shrink-0 place-items-center rounded-nx-full bg-nx-status-info-bg text-nx-status-info-fg"
        aria-hidden
      >
        <Clock className="size-2.5" strokeWidth={2.5} />
      </span>
    );
  }
  // An empty ring rather than nothing: the three markers have to occupy the same width or the
  // node names in one stage stop sharing a left edge.
  return (
    <span className="size-4 shrink-0 rounded-nx-full border border-nx-border-default" aria-hidden />
  );
}

export function RoadmapStagePath({
  roadmapId,
  userId,
  renderNodeAction,
  className,
}: RoadmapStagePathProps) {
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
    return (
      <div className={cn('flex items-start gap-5', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex-1 [flex-basis:var(--nx-path-stage)]">
            <Skeleton lines={4} />
          </Card>
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

  const stages = buildTree(nodes.data ?? []);

  if (stages.length === 0) {
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

  return (
    <div className={cn('flex flex-col gap-[var(--nx-space-block)]', className)}>
      {/**
       * THE HINT AND THE CHAIN ARE ONE BLOCK, hence the wrapper: at the column's own 20 the
       * sentence would read as a separate paragraph that happens to sit above a diagram, and a
       * separate paragraph is exactly what nobody connected to the button they could not find.
       * At 12 it is the chain's own caption.
       */}
      <div className="flex min-w-0 flex-col gap-[var(--nx-space-element)]">
        {/* Conditional on there being something to instruct: without `renderNodeAction` nothing
            here is clickable, so a sentence telling the reader to click would be a lie. */}
        {renderNodeAction && (
          <p className="text-nx-body-sm text-nx-text-secondary">{t('roadmap.path.hint')}</p>
        )}

        {/**
         * `items-start` IS LOAD-BEARING, not a default worth changing: stages hold different
         * numbers of skills, so stretching them would make every card as tall as the tallest and
         * leave the short ones half empty. Aligned at the top, the chain reads as a row of stages
         * that happen to differ in depth — which is the truth about the data.
         *
         * `overflow-x-auto` is the honest fallback for a track wider than the viewport. It engages
         * only past the point where the stages have already shrunk to their 280 basis.
         */}
        <ol className="flex items-start overflow-x-auto pb-1">
          {stages.map((stage, index) => {
            const skills = stage.children;
            const done = skills.filter((s) => stateOf(s.id, byNode) === 'verified').length;
            // The stage's OWN state, which is unrelated to `done`: a stage can be claimed while its
            // skills are untouched, and can be untouched while every skill under it is verified.
            // Nothing on the backend ties the two together and this component must not invent a tie.
            const stageState = stateOf(stage.id, byNode);

            return (
              <Fragment key={stage.id}>
                {index > 0 && (
                  /**
                   * The connector's `margin-top` is the stage header's own height (32), so the line
                   * arrives at the cards level with the bottom of their titles. Measured off the
                   * kit, where it reads as one continuous rule passing behind the stages.
                   */
                  <li
                    aria-hidden
                    // `mt-8` (32) off-ladder on purpose: this 1px connector is aligned to the
                    // vertical centre of the node beside it, so the value is derived from node
                    // geometry, not from the proximity ladder.
                    // eslint-disable-next-line no-restricted-syntax -- node geometry, not a rung
                    className="mt-8 h-px w-[var(--nx-path-connector)] shrink-0 bg-nx-border-subtle"
                  />
                )}

                <li className="min-w-0 flex-1 [flex-basis:var(--nx-path-stage)] [max-width:var(--nx-path-stage-max)]">
                  <Card className="flex h-full flex-col gap-3">
                    {/* 32 is the row unit — a minimum rather than a height. The header now holds
                        four things (mark · name · count · claim), so on a stage squeezed to its
                        280 basis the name is the one that gives: `title` is how the skill rows
                        below already pay for their own `truncate`, and the stage borrows it. */}
                    <div className="flex min-h-8 items-center gap-2">
                      <StateMark state={stageState} />
                      <h3
                        className="min-w-0 flex-1 truncate text-nx-ui font-semibold text-nx-text-primary"
                        title={stage.name}
                      >
                        {stage.name}
                      </h3>
                      {skills.length > 0 && (
                        <span className="shrink-0 font-mono text-nx-caption tabular-nums text-nx-text-muted">
                          {done}/{skills.length}
                        </span>
                      )}
                      {/* Same rule as a skill row — see the note there. */}
                      {stageState === 'open' && renderNodeAction?.(stage)}
                    </div>

                    {/**
                     * A DIVIDED LIST THAT BLEEDS TO THE CARD'S EDGES (`-mx-5`, row `px-5`), which is
                     * the pattern R10 §2 names for rows inside a card: the hover rectangle and any
                     * rule span the full card, and the row's own padding restores the 20 text inset.
                     * A list inset from the card's padding would put a second margin inside the
                     * first.
                     *
                     * A STAGE WITH NO CHILDREN IS A STAGE, NOT A BUG. `parentNodeId` is optional, so
                     * an admin can build a flat roadmap of top-level nodes only; those render as
                     * stages with a title and nothing under it rather than disappearing.
                     */}
                    {skills.length > 0 && (
                      <ul className="-mx-5 flex flex-col">
                        {skills.map((skill) => {
                          const state = stateOf(skill.id, byNode);
                          return (
                            <li
                              key={skill.id}
                              className="flex min-h-8 items-center gap-2 px-5 hover:bg-nx-surface-hover"
                            >
                              <StateMark state={state} />
                              <span
                                className={cn(
                                  'min-w-0 flex-1 truncate text-nx-body-sm',
                                  state === 'open'
                                    ? 'text-nx-text-secondary'
                                    : 'text-nx-text-primary'
                                )}
                                title={skill.name}
                              >
                                {skill.name}
                              </span>
                              {/* Only where a claim is still possible. A verified node has nothing
                                left to ask for and a pending one has already asked. */}
                              {state === 'open' && renderNodeAction?.(skill)}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>

      {/* The legend earns its line because the markers are shapes, not words — and it is the only
          place the three states are named. */}
      <ul className="flex flex-wrap items-center gap-[var(--nx-space-element)] text-nx-caption text-nx-text-muted">
        {(['verified', 'pending', 'open'] as const).map((state) => (
          <li key={state} className="flex items-center gap-2">
            <StateMark state={state} />
            {t(`roadmap.path.legend.${state}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
