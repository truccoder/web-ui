'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Select } from '@/shared/components';
import { useT } from '@/core/i18n';
import { VaultFilterSettings } from './vault-filter-settings';
import { VaultNoteList } from './vault-note-list';

/**
 * The synced-notes panel: the list (or the link graph), the include/exclude tag filter, and the
 * warning that a delete only removes the server copy.
 *
 * EXTRACTED FROM `/knowledge`'s PAGE FILE when the vault moved to `/settings/vault`. It was a
 * page-local `VaultTabPanel` there; two routes now render it, so it is a component. The list/graph
 * choice is a `Select` (not a second `Tabs` — a choice nested inside a panel a strip already
 * opened is a Select's job) and stays in local state: it is a display preference for wherever you
 * land, not a destination.
 *
 * `d3-force` + `@visx/network` load only on the client and only once the reader switches to the
 * graph, rather than shipping in the route's main bundle.
 */
const VaultNoteGraphWithViewer = dynamic(
  () => import('./vault-note-graph').then((m) => m.VaultNoteGraphWithViewer),
  { ssr: false }
);

type VaultView = 'list' | 'graph';

export function VaultPanel() {
  const t = useT();
  const [view, setView] = useState<VaultView>('list');

  return (
    <div className="flex flex-col gap-[var(--nx-space-group)]">
      <Select
        size="sm"
        wrapperClassName="w-fit"
        aria-label={t('knowledge.vault.viewLabel')}
        value={view}
        onChange={(event) => setView(event.target.value as VaultView)}
        options={[
          { value: 'list', label: t('knowledge.vault.viewList') },
          { value: 'graph', label: t('knowledge.vault.viewGraph') },
        ]}
      />

      {view === 'list' ? <VaultNoteList /> : <VaultNoteGraphWithViewer />}

      <VaultFilterSettings />
    </div>
  );
}
