'use client';

import { Section, SectionLink } from '@/shared/components';
import { ProfessionalProfileForm } from '@/features/knowledge';
import { MySkillsCard } from '@/features/roadmap';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Chuyên môn`: what you say you do, and what the app has verified.
 *
 * GITHUB LEFT THIS PANEL for `/settings/github` when the settings hub landed. A synced GitHub is
 * evidence — code, not a claim — but connecting, syncing and unlinking it are machinery, and the
 * hub is where machinery lives. What stays here is the link to it, so the panel still tells the
 * whole story of "what you do → what's verified → where the code is".
 *
 * THE HINT UNDER THE FORM TITLE is the answer to "why am I being asked any of this?" — without a
 * professional profile the explainer refuses to run (428). It sits before the fields, not after.
 */
export function ProfessionalPanel({ userId }: { userId?: number }) {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Section title={t('knowledge.profile.title')} description={t('profile.professionalHint')}>
        <ProfessionalProfileForm />
      </Section>

      <Section
        title={t('profile.skills.title')}
        description={t('profile.skills.desc')}
        action={<SectionLink href="/roadmap">{t('profile.skills.browseRoadmaps')}</SectionLink>}
      >
        <MySkillsCard userId={userId} />
      </Section>

      <Section
        title={t('github.title')}
        description={t('profile.github.desc')}
        action={<SectionLink href="/settings/github">{t('settings.tabs.github')}</SectionLink>}
      >
        <p className="text-nx-body-sm text-nx-text-muted">{t('profile.github.moved')}</p>
      </Section>
    </div>
  );
}
