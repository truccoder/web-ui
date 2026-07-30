'use client';

import { KnowledgeLibrary, ProfessionalProfileForm, TokenList } from '@/features/knowledge';
import { useT } from '@/lib/i18n';

/**
 * `/knowledge` — owned entirely by `knowledge`, created at P2.11d.
 *
 * A NEW ROUTE RATHER THAN A REWIRE, because this domain has never had any UI: there was no page
 * holding knowledge code to migrate, and no legacy to delete. Same situation and same answer as
 * `/notifications` at P2.6cd.
 *
 * WHY THE PROFESSIONAL PROFILE LIVES HERE AND NOT ON `/profile`. Its natural home looks like the
 * profile page, but that page is owned by `security` and its multi-domain assembly is P3.2 — so
 * putting the form there now means either editing another domain's page early or parking the form
 * somewhere temporary and moving it later. Keeping all three surfaces together avoids both, and
 * costs P3.2 nothing: if `/profile` should also show this form, it imports the same component
 * through this feature's barrel. No code moves.
 *
 * The three sections are ordered by dependency rather than importance. The profile comes first
 * because `explainPost` refuses to run without one (**428**), so a reader who lands here with
 * nothing set up meets the thing they have to do first. The library comes last because it is empty
 * until the other two have been used.
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

      <section>
        <h2 className="mb-3 text-nx-h3 text-nx-text-primary">{t('knowledge.profile.title')}</h2>
        <ProfessionalProfileForm />
      </section>

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
