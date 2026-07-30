'use client';

import { EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useRoadmapNodes } from '../hooks/use-roadmap';
import type { RoadmapNode } from '../types/roadmap';

/**
 * The skills on one roadmap, as the tree `parentNodeId` describes.
 *
 * NO VERIFICATION STATE IS SHOWN, AND THAT IS THE BIGGEST THING MISSING FROM THIS SCREEN. The
 * design system's skill tag has three states — default, selected, and verified-expert (the amber
 * one) — and the third cannot be rendered: no endpoint reports the signed-in user's progress
 * (B21), so this component cannot tell a node the user has verified from one they have never
 * touched. Showing every node in the default state is the only honest option; inventing the state
 * client-side is the `acceptedInSession` mistake this project already undid once. ds-deviation #24.
 *
 * NODE NAMES ARE NOT RENDERED AS MONO SLUGS, though the DS specimen renders skill tags that way
 * (`kafka`, `system-design`). `RoadmapNodeDto.name` is free text with only `@NotBlank` behind it,
 * so an admin types "Xây dựng API REST" as readily as "rest-api". Mono-slugging arbitrary prose
 * makes it look like an identifier it is not. ds-deviation #23.
 */
export interface RoadmapNodeTreeProps {
  /** Undefined while no roadmap is selected — the query stays idle. */
  roadmapId?: number;
  /** Rendered next to each node; the caller supplies the claim control. Omit for a read-only tree. */
  renderNodeAction?: (node: RoadmapNode) => React.ReactNode;
  className?: string;
}

interface TreeNode extends RoadmapNode {
  children: TreeNode[];
}

/**
 * Flat list → tree, WITHOUT LOSING ANYTHING.
 *
 * The orphan case is real, not defensive padding: nothing on the backend checks that
 * `parentNodeId` points at a node of the SAME roadmap (`addNodeToRoadmap` only checks the parent
 * exists at all), so this endpoint can legitimately hand back a node whose parent is on another
 * track and therefore absent from this array. Such a node is promoted to a root rather than
 * dropped — a skill silently vanishing from the page is far worse than one sitting at the wrong
 * depth, and dropping it would also hide the underlying data problem from whoever could fix it.
 *
 * Order within each level is inherited from `useRoadmapNodes`, which sorts by
 * `orderIndex` then `id`; `Map` preserves insertion order, so the children come out sorted too
 * without sorting a second time.
 */
function buildTree(nodes: RoadmapNode[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  for (const node of nodes) byId.set(node.id, { ...node, children: [] });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentNodeId != null ? byId.get(node.parentNodeId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/**
 * One node and its subtree. Depth is expressed entirely by nesting `<ul>`s — no depth counter is
 * threaded through, because nothing here varies with it: the indent comes from the parent list's
 * padding, and there is no level cap to enforce (the data has none).
 */
function NodeRow({
  node,
  renderNodeAction,
}: {
  node: TreeNode;
  renderNodeAction?: (node: RoadmapNode) => React.ReactNode;
}) {
  return (
    <li>
      <div
        className={cn(
          'flex items-start justify-between gap-3 rounded-nx-sm px-2 py-1.5',
          'hover:bg-nx-surface-hover'
        )}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-nx-body-sm font-medium text-nx-text-primary">{node.name}</span>
          {node.description && (
            <span className="text-nx-caption text-nx-text-secondary">{node.description}</span>
          )}
        </div>
        {renderNodeAction?.(node)}
      </div>

      {node.children.length > 0 && (
        // Indent plus a rule, the same treatment `CommentThread` gives replies. Depth is not
        // capped here the way comments are at one level, because the data has no such limit.
        <ul className="ml-3 flex flex-col gap-1 border-l border-nx-border-subtle pl-2">
          {node.children.map((child) => (
            <NodeRow key={child.id} node={child} renderNodeAction={renderNodeAction} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function RoadmapNodeTree({ roadmapId, renderNodeAction, className }: RoadmapNodeTreeProps) {
  const t = useT();
  const nodes = useRoadmapNodes(roadmapId);

  if (roadmapId === undefined) {
    return <EmptyState compact className={className} title={t('roadmap.nodes.pickRoadmap')} />;
  }

  if (nodes.isLoading) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Skeleton lines={3} />
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

  const tree = buildTree(nodes.data ?? []);

  if (tree.length === 0) {
    // Note this cannot distinguish "no such roadmap" from "roadmap with no nodes": the endpoint
    // answers 200 `[]` for a bad id rather than 404. The wording covers both without claiming
    // which one happened.
    return <EmptyState compact className={className} title={t('roadmap.nodes.empty')} />;
  }

  return (
    <ul className={cn('flex flex-col gap-1', className)}>
      {tree.map((node) => (
        <NodeRow key={node.id} node={node} renderNodeAction={renderNodeAction} />
      ))}
    </ul>
  );
}
