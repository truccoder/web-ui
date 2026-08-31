import { describe, expect, it } from 'vitest';
import { buildGraphData } from './vault-graph';
import type { VaultNoteSummary } from '../types/knowledge';

const note = (overrides: Partial<VaultNoteSummary>): VaultNoteSummary => ({
  id: 1,
  filename: 'note.md',
  tags: [],
  links: [],
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

describe('buildGraphData', () => {
  it('makes one node per note with an id and filename', () => {
    const notes = [note({ id: 1, filename: 'a.md' }), note({ id: 2, filename: 'b.md' })];
    const { nodes } = buildGraphData(notes);
    expect(nodes).toEqual([
      { id: 1, filename: 'a.md' },
      { id: 2, filename: 'b.md' },
    ]);
  });

  it('drops a note with no id or no filename rather than crashing on it', () => {
    const notes = [
      note({ id: null, filename: 'a.md' }),
      note({ id: 2, filename: null }),
      note({ id: 3, filename: 'c.md' }),
    ];
    const { nodes } = buildGraphData(notes);
    expect(nodes).toEqual([{ id: 3, filename: 'c.md' }]);
  });

  it('resolves a link by filename, ignoring the .md extension and case', () => {
    const notes = [
      note({ id: 1, filename: 'backend/jpa-tuning.md', links: ['System/Redis-Caching'] }),
      note({ id: 2, filename: 'system/redis-caching.md', links: [] }),
    ];
    const { edges, unresolvedCount } = buildGraphData(notes);
    expect(edges).toEqual([{ source: 1, target: 2 }]);
    expect(unresolvedCount).toBe(0);
  });

  it('counts a link to a note that was never synced as unresolved, without adding a node for it', () => {
    const notes = [note({ id: 1, filename: 'a.md', links: ['does-not-exist'] })];
    const { nodes, edges, unresolvedCount } = buildGraphData(notes);
    expect(nodes).toEqual([{ id: 1, filename: 'a.md' }]);
    expect(edges).toEqual([]);
    expect(unresolvedCount).toBe(1);
  });

  it('drops a self-referencing link without counting it as unresolved', () => {
    const notes = [note({ id: 1, filename: 'a.md', links: ['a.md'] })];
    const { edges, unresolvedCount } = buildGraphData(notes);
    expect(edges).toEqual([]);
    expect(unresolvedCount).toBe(0);
  });
});
