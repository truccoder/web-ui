import type { RoadmapNode } from '../types/roadmap';

export interface TreeNode extends RoadmapNode {
  children: TreeNode[];
}

/**
 * Flat list → tree, WITHOUT LOSING ANYTHING.
 *
 * The orphan case is real, not defensive padding: nothing on the backend checks that
 * `parentNodeId` points at a node of the SAME roadmap (`addNodeToRoadmap` only checks the parent
 * exists at all), so the nodes endpoint can legitimately hand back a node whose parent is on
 * another track and therefore absent from this array. Such a node is promoted to a root rather
 * than dropped — a skill silently vanishing from the page is far worse than one sitting at the
 * wrong depth, and dropping it would also hide the underlying data problem from whoever could fix
 * it.
 *
 * Order within each level is inherited from `useRoadmapNodes`, which sorts by `orderIndex` then
 * `id`; `Map` preserves insertion order, so the children come out sorted too without sorting a
 * second time.
 *
 * IT LIVES IN `lib/` BECAUSE TWO COMPONENTS NEED IT NOW. `RoadmapNodeTree` owns the nested
 * read-only tree; `RoadmapStagePath` reads the same shape as *stages and their skills*. One copy,
 * because an orphan-handling rule duplicated is an orphan-handling rule that drifts.
 */
export function buildTree(nodes: RoadmapNode[]): TreeNode[] {
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
