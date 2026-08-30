'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ExportTemplateSettings,
  KnowledgeLibrary,
  TokenList,
  VaultFilterSettings,
  VaultNoteList,
} from '@/features/knowledge';
import { PageHeader, Select, Tabs } from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { useT } from '@/core/i18n';

/**
 * `d3-force` needs a settled layout to draw, not a server-rendered placeholder, and `@visx/network`
 * has nothing useful to say before that — so this loads only on the client, and only once the
 * reader actually switches to the graph view, rather than shipping either in `/knowledge`'s main
 * bundle.
 */
const VaultNoteGraphWithViewer = dynamic(
  () => import('@/features/knowledge').then((m) => m.VaultNoteGraphWithViewer),
  { ssr: false }
);

/**
 * `/knowledge` — owned entirely by `knowledge`, created at P2.11d.
 *
 * THREE TABS NOW, WHERE THIS PAGE USED TO BE FIVE STACKED SECTIONS. The library, the token panel
 * and the vault note list each grew their own heading and their own scroll weight over several
 * rounds of work, and reading top to bottom eventually meant scrolling past machinery you did not
 * come for to reach the one section you wanted. `Tabs` (see `library.tsx` for the same move) turns
 * that into a destination you land on directly — the tab is the destination now, not the scroll
 * position.
 *
 * `library → vault → settings`, and the grouping is not alphabetical:
 *  - `Thư viện` (`KnowledgeLibrary`) stays first — the reader who comes back is here for what they
 *    saved, the same reasoning that put the library ahead of tokens when this was one page.
 *  - `Ghi chú đã đồng bộ` groups `VaultNoteList` with `VaultFilterSettings`: one shows which notes
 *    landed, the other controls which of them the AI may read — the same pairing the old page's
 *    section order already argued for ("a reader finds out which tags their notes actually carry"
 *    before configuring a filter on them), just inside one panel instead of two sections.
 *  - `Cài đặt` groups `TokenList` with `ExportTemplateSettings`: neither is content to browse, both
 *    are configuration for machinery most people touch once — the token panel for the plugin
 *    integration, the export template for the download button's output shape.
 *
 * `ExportTemplateSettings` MOVED HERE FROM SITTING BETWEEN THE LIBRARY AND THE TOKENS. It configures
 * a download button, not a thing to read, so it belongs with the other configuration rather than
 * wedged into the reading order.
 */
const TAB_IDS = ['library', 'vault', 'settings'] as const;

export default function KnowledgePage() {
  // `useTabParam` reads the query string, which needs a Suspense boundary in the App Router —
  // same shape as `/library`.
  return (
    <Suspense>
      <KnowledgeContent />
    </Suspense>
  );
}

function KnowledgeContent() {
  const t = useT();
  const [tab, setTab] = useTabParam(TAB_IDS, 'library');

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <PageHeader title={t('knowledge.title')} description={t('knowledge.subtitle')} />

      {/* Applies to the whole page, not one tab — the 428 it describes fires from any tab that
          ends up generating an explanation, so it stays outside the tab strip. */}
      <p className="text-nx-body-sm text-nx-text-secondary">
        {t('knowledge.profileMoved')}{' '}
        <Link
          href="/profile?tab=professional"
          className="text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          {t('knowledge.profileMovedLink')}
        </Link>
      </p>

      <div className="flex flex-col gap-[var(--nx-space-group)]">
        <Tabs
          aria-label={t('knowledge.title')}
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'library', label: t('knowledge.tabs.library') },
            { id: 'vault', label: t('knowledge.tabs.vault') },
            { id: 'settings', label: t('knowledge.tabs.settings') },
          ]}
        />

        {tab === 'library' && <KnowledgeLibrary />}

        {tab === 'vault' && <VaultTabPanel />}

        {tab === 'settings' && (
          <div className="flex flex-col gap-[var(--nx-space-group)]">
            <TokenList />
            <ExportTemplateSettings />
          </div>
        )}
      </div>
    </div>
  );
}

type VaultView = 'list' | 'graph';

/**
 * The `vault` tab's own list/graph switch.
 *
 * A `Select`, NOT A SECOND `Tabs` — `Tabs` itself says why: a choice nested inside a panel a tab
 * strip already opened is a `Select`'s job, not a second strip's. `view` stays in local state
 * rather than the URL: `tab` is a place someone can be sent a link to, but "list or graph" is a
 * display preference for whichever place they land on, not a destination of its own.
 */
function VaultTabPanel() {
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
