'use client';

import Link from 'next/link';
import { Section, SectionLink } from '@/shared/components';
import { GithubStatsCard } from '@/features/github';
import { ProfessionalProfileForm } from '@/features/knowledge';
import { MySkillsCard } from '@/features/roadmap';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Chuyên môn`, ordered by how hard the claim is to make: what you say you do → what
 * the app has verified you can do → what your code shows.
 *
 * THE THREE DESCRIPTIONS ARE THAT ORDER SAID OUT LOUD. It has always been the panel's argument
 * and until recently it was a fact about this source file that nobody reading the page could see.
 */
export function ProfessionalPanel({ userId }: { userId?: number }) {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* THE HINT MOVED FROM UNDER THE SAVE BUTTON TO UNDER THE TITLE. It is the answer to "why
          am I being asked any of this?" — without a professional profile the explainer refuses to
          run (428) — and a reader who needs that answer needs it BEFORE the seven fields, not
          after them. It was below the form only because the form had no header to hang it on. */}
      <Section
        title={t('knowledge.profile.title')}
        description={
          <>
            {t('profile.professionalHint')}{' '}
            {/* Not a `SectionLink`: that one is the shrink-proof control hung off a heading, and
                this is a word inside a sentence. */}
            <Link
              href="/knowledge"
              className="text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
            >
              {t('profile.professionalHintLink')}
            </Link>
          </>
        }
      >
        <ProfessionalProfileForm />
      </Section>

      {/* Linking to /roadmap rather than embedding the claim form: claiming a skill needs a
          roadmap and a node picked out of it, which is a whole surface, not a card. */}
      <Section
        title={t('profile.skills.title')}
        description={t('profile.skills.desc')}
        action={<SectionLink href="/roadmap">{t('profile.skills.browseRoadmaps')}</SectionLink>}
      >
        {/* The one section on this page whose contents depend on WHO IS LOOKING: the backend
            returns pending and rejected claims only to the owner, who here is always the viewer. */}
        <MySkillsCard userId={userId} />
      </Section>

      <Section title={t('github.title')} description={t('profile.github.desc')}>
        {/* `undefined` until the profile resolves, which keeps the stats query idle rather than
            firing it for a user id nobody has yet. */}
        <GithubStatsCard userId={userId} />
      </Section>
    </div>
  );
}
