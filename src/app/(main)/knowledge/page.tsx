'use client';

import Link from 'next/link';
import { KnowledgeLibrary, TokenList } from '@/features/knowledge';
import { useT } from '@/lib/i18n';

/**
 * `/knowledge` — owned entirely by `knowledge`, created at P2.11d.
 *
 * A NEW ROUTE RATHER THAN A REWIRE, because this domain has never had any UI: there was no page
 * holding knowledge code to migrate, and no legacy to delete. Same situation and same answer as
 * `/notifications` at P2.6cd.
 *
 * THE PROFESSIONAL PROFILE FORM LEFT AT P3.2 AND DID NOT COME BACK. It was parked here at P2.11d
 * with the reason stated at the time: its natural home is `/profile`, but that page belongs to
 * `security` and its assembly had not happened yet, so putting it there early meant editing
 * another domain's page ahead of schedule. P3.2 is that assembly, so the form is there now.
 *
 * It is NOT rendered in both places. Two pages editing one record is worse than either page
 * missing it — a reader who edits here and then sees the other copy has no way to know which one
 * the server took. What stays is the sentence below, because the dependency it describes is real
 * and belongs where the dependent feature is: `explainPost` answers **428** without a professional
 * profile, so someone arriving here with nothing set up still has to be told where to go.
 *
 * The remaining two sections keep their order: tokens before the library, because the library is
 * empty until something has been explained and saved.
 */
export default function KnowledgePage() {
  const t = useT();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-nx-h2 font-semibold tracking-tight text-nx-text-primary">
          {t('knowledge.title')}
        </h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">{t('knowledge.subtitle')}</p>
      </div>

      <p className="text-nx-body-sm text-nx-text-secondary">
        {t('knowledge.profileMoved')}{' '}
        <Link
          href="/profile"
          className="text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          {t('knowledge.profileMovedLink')}
        </Link>
      </p>

      <section>
        <TokenList />
      </section>

      <section>
        <h2 className="mb-3 text-nx-h3 text-nx-text-primary">{t('knowledge.library.title')}</h2>
        <KnowledgeLibrary />
      </section>
    </div>
  );
}
