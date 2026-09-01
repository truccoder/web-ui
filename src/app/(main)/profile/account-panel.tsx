'use client';

import { Disclosure, Section, SectionLink } from '@/shared/components';
import { BlockedUsersList } from '@/features/blocks';
import { ChangePasswordForm, ProfileInfoForm } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Tài khoản`: the account as an object you administer.
 *
 * TWO `Disclosure`S, CLOSED BY DEFAULT, plus one pointer. Name and password are forms most
 * visitors never open; a closed accordion shows both titles at a glance and only pays for the one
 * that is clicked.
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
      <Disclosure title={t('profile.info.title')} description={t('profile.info.desc')}>
        <ProfileInfoForm />
      </Disclosure>

      <Disclosure title={t('profile.password.title')} description={t('profile.password.desc')}>
        <ChangePasswordForm />
      </Disclosure>

      <Section
        title={t('moderationMine.title')}
        description={t('profile.moderationPointer')}
        action={<SectionLink href="/moderation">{t('profile.moderationPointerCta')}</SectionLink>}
      >
        <></>
      </Section>

      <Disclosure title={t('blocks.title')}>
        <BlockedUsersList />
      </Disclosure>
    </div>
  );
}
