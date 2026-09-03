import { describe, expect, it } from 'vitest';
import { buildTree, flattenTree } from './tree';
import type { RoadmapNode } from '../types/roadmap';

/**
 * `buildTree` and `flattenTree` decide what `/roadmap?id=N` draws and what its progress bar claims,
 * and both failure modes are silent: a dropped node just is not on the page, and a count over the
 * wrong population reads as a perfectly plausible fraction. So the cases here are the ones the real
 * data actually produces rather than a sweep for coverage.
 *
 * THE FLAT CASE IS FIRST BECAUSE IT IS THE ONE IN PRODUCTION. `V88__seed_roadmaps.sql` ships 12
 * tracks and 103 nodes with `parent_node_id` NULL on every row, so "all roots, no children" is the
 * shape the seeded app renders — not a degenerate edge.
 */
const node = (id: number, parentNodeId: number | null = null, orderIndex = 0): RoadmapNode => ({
  id,
  roadmapId: 1,
  name: `n${id}`,
  description: null,
  parentNodeId,
  orderIndex,
});

describe('buildTree', () => {
  it('returns every node as a root when nothing has a parent', () => {
    const roots = buildTree([node(1), node(2), node(3)]);
    expect(roots.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(roots.every((r) => r.children.length === 0)).toBe(true);
  });

  it('nests a child under its parent', () => {
    const roots = buildTree([node(1), node(2, 1), node(3, 1)]);
    expect(roots.map((r) => r.id)).toEqual([1]);
    expect(roots[0].children.map((c) => c.id)).toEqual([2, 3]);
  });

  it('keeps the input order at every level', () => {
    // The order is `useRoadmapNodes`'s (orderIndex then id) and `Map` preserves insertion, so the
    // children must come out sorted without this function sorting anything itself.
    const roots = buildTree([node(1), node(9, 1, 0), node(4, 1, 1), node(7, 1, 2)]);
    expect(roots[0].children.map((c) => c.id)).toEqual([9, 4, 7]);
  });

  it('nests to arbitrary depth', () => {
    const roots = buildTree([node(1), node(2, 1), node(3, 2)]);
    expect(roots[0].children[0].children.map((g) => g.id)).toEqual([3]);
  });

  it('promotes an orphan to a root rather than dropping it', () => {
    // A `parentNodeId` pointing at a node on ANOTHER roadmap is legal on the backend —
    // `addNodeToRoadmap` only checks the parent exists at all — so this array can arrive from the
    // API. Losing the node would hide both the skill and the data problem.
    const roots = buildTree([node(1), node(2, 999)]);
    expect(roots.map((r) => r.id)).toEqual([1, 2]);
  });

  it('does not mutate the nodes it was given', () => {
    const input = [node(1), node(2, 1)];
    buildTree(input);
    expect(input[0]).not.toHaveProperty('children');
  });

  it('answers an empty forest for no nodes', () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe('flattenTree', () => {
  it('counts every node on a flat track, which is the seeded shape', () => {
    const all = flattenTree(buildTree([node(1), node(2), node(3)]));
    expect(all.map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it('includes nested nodes, so a progress total is the whole track', () => {
    // The bug this guards: counting roots only would report 1 here and call a track with three
    // skills "1 skill", making 0/1 and 0/3 indistinguishable on screen.
    const all = flattenTree(buildTree([node(1), node(2, 1), node(3, 2)]));
    expect(all.map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it('visits a parent before its children', () => {
    const all = flattenTree(buildTree([node(1), node(2, 1), node(10)]));
    expect(all.map((n) => n.id)).toEqual([1, 2, 10]);
  });

  it('lists each node exactly once', () => {
    const all = flattenTree(buildTree([node(1), node(2, 1), node(3, 1), node(4, 2)]));
    expect(all.map((n) => n.id)).toEqual([1, 2, 4, 3]);
    expect(new Set(all.map((n) => n.id)).size).toBe(all.length);
  });
});
