'use client';

import { Section, SectionLink } from '@/shared/components';
import { BlockedUsersList } from '@/features/blocks';
import { ChangePasswordForm, ProfileInfoForm } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Tài khoản`: the account as an object you administer.
 *
 * PLAIN `Section`S, ALL OPEN. Name, password and the blocked list were `Disclosure`s closed by
 * default — the owner asked for the accordion gone, so every section shows its content directly
 * now. The tab is already the filter; a second click to reveal each form inside it was one gate
 * too many.
 *
 * MODERATION MOVED TO ITS OWN ROUTE. The violations list and the appeal flow were a `Disclosure`
 * here; a rejected post and an automatic seven-day ban are serious enough that folding them into
 * an accordion undersold them, so `/moderation` is a real destination now and this is a link to it.
 * The blocked list stays — it is small, and it is the other half of a control that lives on
 * `/u/{username}`.
 */
export function AccountPanel() {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Section title={t('profile.info.title')} description={t('profile.info.desc')}>
        <ProfileInfoForm />
      </Section>

      <Section title={t('profile.password.title')} description={t('profile.password.desc')}>
        <ChangePasswordForm />
      </Section>

      <Section
        title={t('moderationMine.title')}
        description={t('profile.moderationPointer')}
        action={<SectionLink href="/moderation">{t('profile.moderationPointerCta')}</SectionLink>}
      >
        <></>
      </Section>

      <Section title={t('blocks.title')}>
        <BlockedUsersList />
      </Section>
    </div>
  );
}
