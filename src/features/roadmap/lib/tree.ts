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
 * IT LIVES IN `lib/` RATHER THAN INSIDE ITS ONE CONSUMER, and the reason changed rather than
 * expired. Two components used to read this — `RoadmapNodeTree`'s nested read-only tree and
 * `RoadmapStagePath`'s stages-and-their-skills — and both were deleted when `RoadmapTrack` replaced
 * them with one vertical rail. What keeps the function here is that the orphan rule below is a
 * statement about the BACKEND's data, not about any layout: it is the same rule whatever a component
 * decides to draw, and a rule living inside one component is a rule the next component reinvents.
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

/**
 * Every node in a forest, depth-first, parents before their children.
 *
 * IT IS HERE RATHER THAN IN `RoadmapTrack` BECAUSE THE COUNT IT FEEDS IS A CLAIM ABOUT PROGRESS,
 * and a wrong one is the kind of bug nobody reports — a track that says `3/12` when it means `3/40`
 * looks perfectly reasonable. In `lib/` it is a pure function over a shape, so the depth cases can
 * be asserted directly; inside a component the only way to test them is to render one.
 *
 * A CYCLE WOULD NOT TERMINATE, and that is deliberate rather than overlooked: `buildTree` cannot
 * produce one. It assigns each node to at most one parent and only ever descends into `children`
 * arrays it built itself, so the result is a forest by construction. Guarding here would be
 * defending against a shape the only producer cannot emit, and the guard would then need its own
 * explanation for why it exists.
 */
export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}
