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
 * run without it, so the pointer stays — folded into the section's own description rather than
 * left as a bare sentence floating at the top of the canvas, which is what it became once the
 * tab strip above it was removed.
 */
export default function KnowledgePage() {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Section
        title={t('knowledge.savedTitle')}
        description={
          <>
            {t('knowledge.libraryDesc')} {t('knowledge.profileMoved')}{' '}
            {/**
             * UNDERLINED AT REST, NOT ONLY ON HOVER — report §5.6 (P4001), and it is a WCAG 1.4.1
             * (Level A) failure rather than a preference.
             *
             * This link sits INSIDE a paragraph, which is the case the criterion is about: a link
             * inside a text block has to be distinguishable from the text around it by something
             * other than colour, unless the two colours differ by at least 3:1. Measured by axe on
             * the rendered page: `--nx-text-accent` (#2459a6) against `--nx-text-muted` (#6c7681)
             * is **1.48:1**. So colour was the only signal, and the signal was not strong enough.
             *
             * `hover:underline` does not help: a reader who cannot tell the link is there has no
             * reason to hover it, and it does nothing at all for touch or keyboard.
             *
             * NOT FIXED BY DARKENING THE LINK, deliberately. Reaching 3:1 against muted body text
             * would mean moving the accent off `--nx-text-accent`, i.e. changing what the product's
             * link colour IS, on one screen, to satisfy one paragraph. The underline is the cheaper
             * and more portable answer, and it is what the criterion actually asks for.
             *
             * The same pattern (`text-nx-text-accent hover:underline`) appears at 5 other sites.
             * Those are standalone links, not links in a text block, so the rule does not apply to
             * them and they are left alone — see the report for the list.
             */}
            <Link
              href="/profile?tab=professional"
              className="text-nx-text-accent underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
            >
              {t('knowledge.profileMovedLink')}
            </Link>
          </>
        }
      >
        <KnowledgeLibrary />
      </Section>
    </div>
  );
}
