'use client';

import Link from 'next/link';
import { Section, SectionLink } from '@/shared/components';
import { GithubStatsCard, useGithubStats } from '@/features/github';
import { ProfessionalProfileForm } from '@/features/knowledge';
import { MySkillsCard } from '@/features/roadmap';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Chuyên môn`.
 *
 * GITHUB MOVES TO THE TOP ONCE IT IS LINKED, because a synced GitHub is the strongest evidence on
 * this tab — code, not a claim — and evidence that exists belongs before the form that only
 * describes you. An unlinked (or still-loading) account stays at the bottom: `GithubStatsCard`'s
 * own empty state is what tells the owner it isn't linked yet and offers the button that starts
 * it, so nothing here is hidden — only its position moves.
 *
 * THE QUERY IS READ HERE TOO, NOT ONLY INSIDE `GithubStatsCard`. Same key, so React Query dedupes
 * it to one request; the second read is what lets this component decide WHERE to put the card
 * before the card itself has rendered anything.
 */
export function ProfessionalPanel({ userId }: { userId?: number }) {
  const t = useT();
  const githubStats = useGithubStats(userId);
  const githubLinked = githubStats.isSuccess;

  const githubSection = (
    <Section title={t('github.title')} description={t('profile.github.desc')}>
      <GithubStatsCard userId={userId} />
    </Section>
  );

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {githubLinked && githubSection}

      {/* THE HINT MOVED FROM UNDER THE SAVE BUTTON TO UNDER THE TITLE. It is the answer to "why
          am I being asked any of this?" — without a professional profile the explainer refuses to
          run (428) — and a reader who needs that answer needs it BEFORE the seven fields, not
          after them. */}
      <Section
        title={t('knowledge.profile.title')}
        description={
          <>
            {t('profile.professionalHint')}{' '}
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
        <MySkillsCard userId={userId} />
      </Section>

      {!githubLinked && githubSection}
    </div>
  );
}
