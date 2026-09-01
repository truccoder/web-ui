import type { VaultNoteSummary } from '../types/knowledge';

/** One synced note, as a graph node. */
export interface GraphNode {
  id: number;
  filename: string;
}

/** One wikilink between two synced notes, both ends already resolved to a note id. */
export interface GraphEdge {
  source: number;
  target: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Links that named no synced note — a note whose target was never pushed, or was deleted since. */
  unresolvedCount: number;
}

/** Obsidian wikilinks are written without the extension and are case-insensitive on most filesystems. */
function normalizeFilename(filename: string): string {
  return filename.trim().replace(/\.md$/i, '').toLowerCase();
}

/**
 * Turns the flat note list `useVaultNotes` returns into a node/edge graph.
 *
 * A note's `links` are the wikilink TARGETS IT NAMES, not ids — resolving them means matching
 * against every other synced note's filename. A link naming a note that was never synced (or has
 * since been deleted) has nowhere to point; it is dropped rather than turned into a placeholder
 * "ghost" node, and counted in `unresolvedCount` instead — a graph the reader did not ask to see
 * nodes for is not simpler than one with a caption explaining what is missing.
 */
export function buildGraphData(notes: VaultNoteSummary[]): GraphData {
  const byFilename = new Map<string, number>();
  for (const note of notes) {
    if (note.id == null || note.filename == null) continue;
    byFilename.set(normalizeFilename(note.filename), note.id);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let unresolvedCount = 0;

  for (const note of notes) {
    if (note.id == null || note.filename == null) continue;
    nodes.push({ id: note.id, filename: note.filename });

    for (const link of note.links ?? []) {
      const targetId = byFilename.get(normalizeFilename(link));
      // A note is never drawn linking to itself — Obsidian allows a self-referencing wikilink, but
      // a self-loop has nothing to say in a graph whose whole point is the relationship between
      // DIFFERENT notes.
      if (targetId == null || targetId === note.id) {
        unresolvedCount += targetId == null ? 1 : 0;
        continue;
      }
      edges.push({ source: note.id, target: targetId });
    }
  }

  return { nodes, edges, unresolvedCount };
}
