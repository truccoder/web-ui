'use client';

import Link from 'next/link';
import { KnowledgeLibrary } from '@/features/knowledge';
import { Section } from '@/shared/components';
import { useT } from '@/core/i18n';

/**
 * `/knowledge` — the reading library, and only that, since the settings hub landed.
 *
 * THIS PAGE WAS THREE TABS: the library, the synced-vault notes, and a `Cài đặt` tab holding
 * tokens and the export template. The last two were machinery-config, and reading past the
 * library's own scroll to reach them was the reason they moved to `/settings/vault` and
 * `/settings/tokens`. What is left is a single thing, so the tab strip is gone with them —
 * `/knowledge` opens straight on what a returning reader came back for.
 *
 * The professional profile is still on `/profile?tab=professional`; the explainer refuses to
 * run without it, so the pointer stays.
 */
export default function KnowledgePage() {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <p className="text-nx-body-sm text-nx-text-secondary">
        {t('knowledge.profileMoved')}{' '}
        <Link
          href="/profile?tab=professional"
          className="text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          {t('knowledge.profileMovedLink')}
        </Link>
      </p>

      <Section title={t('knowledge.tabs.library')} description={t('knowledge.libraryDesc')}>
        <KnowledgeLibrary />
      </Section>
    </div>
  );
}
