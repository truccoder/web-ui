'use client';

import * as React from 'react';
import { Graph } from '@visx/network';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useVaultNoteGraph } from '../hooks';
import { buildGraphData, type GraphEdge, type GraphNode } from '../lib/vault-graph';
import { NoteViewerDialog } from './note-viewer-dialog';

const WIDTH = 720;
const HEIGHT = 420;
/** Enough for the layout to settle; ticked synchronously so nothing animates on screen — see below. */
const SIMULATION_TICKS = 300;

type SimNode = GraphNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode>;

/**
 * Runs `d3-force` once over a graph's nodes/edges and returns the settled `{ x, y }` layout.
 *
 * COMPUTED SYNCHRONOUSLY, NOT ANIMATED. `forceSimulation` normally drives itself off
 * `requestAnimationFrame` so a caller can redraw every tick and watch the graph settle — the
 * canonical d3-force demo. That is also the one thing this codebase's motion rules do not allow
 * for free: an unbounded RAF loop has no `prefers-reduced-motion` off switch of its own. Calling
 * `.stop()` right after creation and then `.tick()` a fixed number of times inline sidesteps the
 * question rather than answering it — there is no frame-by-frame render to reduce, only a single
 * layout that appears once, already settled.
 */
function useForceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  return React.useMemo(() => {
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks: SimLink[] = edges.map((e) => ({ source: e.source, target: e.target }));

    forceSimulation(simNodes)
      .force('charge', forceManyBody().strength(-140))
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(70)
      )
      .force('center', forceCenter(WIDTH / 2, HEIGHT / 2))
      .stop()
      .tick(SIMULATION_TICKS);

    // `forceLink` mutates each link's `source`/`target` from the raw id it was given into the
    // matching node object, in place — so by now every link really does carry `{ x, y }` ends.
    return { nodes: simNodes, links: simLinks as { source: SimNode; target: SimNode }[] };
  }, [nodes, edges]);
}

export interface VaultNoteGraphProps {
  /** Opens the reader's note in the same viewer `VaultNoteList` uses, by id. */
  onOpenNote?: (noteId: number) => void;
}

/**
 * The wikilink graph between the reader's synced notes — the "Obsidian graph view" for notes that
 * have made it to the server.
 *
 * NOT MOUNTED DIRECTLY. `next/dynamic(..., { ssr: false })` at the call site keeps `d3-force` and
 * `@visx/network` out of the tab's initial bundle and off the server render entirely — the layout
 * math needs a stable tick loop that has no meaning before the client has a canvas to draw into.
 */
export function VaultNoteGraph({ onOpenNote }: VaultNoteGraphProps) {
  const t = useT();
  const { notes, isPending, isError, error, truncated } = useVaultNoteGraph();
  const { nodes, edges, unresolvedCount } = React.useMemo(() => buildGraphData(notes), [notes]);
  const layout = useForceLayout(nodes, edges);

  if (isPending) {
    return <Skeleton lines={6} />;
  }

  if (isError) {
    return (
      <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('knowledge.vault.loadError'))}
      </p>
    );
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        compact
        title={t('knowledge.vault.emptyTitle')}
        description={t('knowledge.vault.emptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-nx-md border border-nx-border-subtle bg-nx-surface-sunken"
        role="img"
        aria-label={t('knowledge.vault.graph.ariaLabel')}
      >
        <Graph<{ source: SimNode; target: SimNode }, SimNode>
          graph={layout}
          linkComponent={({ link }) => (
            <line
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              className="stroke-nx-border-subtle"
              strokeWidth={1}
            />
          )}
          nodeComponent={({ node }) => (
            <GraphNodeDot
              node={node}
              onOpen={onOpenNote}
              label={t('knowledge.vault.graph.openNoteAria', { name: node.filename })}
            />
          )}
        />
      </svg>

      {unresolvedCount > 0 && (
        <p className="text-nx-caption text-nx-text-muted">
          {t('knowledge.vault.graph.unresolvedLinks', { count: unresolvedCount })}
        </p>
      )}

      {truncated && (
        <p className="text-nx-caption text-nx-text-muted">
          {t('knowledge.vault.graph.truncated', { count: nodes.length })}
        </p>
      )}
    </div>
  );
}

/**
 * One node: a real interactive element (`role="button"`, keyboard-operable), not a bare shape —
 * clicking or activating it opens the note the same way `VaultNoteList`'s "View" button does.
 */
function GraphNodeDot({
  node,
  label,
  onOpen,
}: {
  node: SimNode;
  label: string;
  onOpen?: (noteId: number) => void;
}) {
  const activate = () => onOpen?.(node.id);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
      className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={7}
        className="fill-nx-accent-soft stroke-nx-accent hover:fill-nx-accent"
      />
      <text
        x={node.x}
        y={(node.y ?? 0) + 18}
        textAnchor="middle"
        className="fill-nx-text-secondary font-mono text-[9px]"
      >
        {node.filename.length > 20 ? `${node.filename.slice(0, 19)}…` : node.filename}
      </text>
      <title>{node.filename}</title>
    </g>
  );
}

/**
 * Wraps `VaultNoteGraph` with `NoteViewerDialog`, the same viewer `VaultNoteList` opens for its
 * "View" button — this is the component the `vault` tab actually mounts.
 */
export function VaultNoteGraphWithViewer() {
  const [openNoteId, setOpenNoteId] = React.useState<number | null>(null);

  return (
    <>
      <VaultNoteGraph onOpenNote={setOpenNoteId} />
      <NoteViewerDialog noteId={openNoteId} onClose={() => setOpenNoteId(null)} />
    </>
  );
}
