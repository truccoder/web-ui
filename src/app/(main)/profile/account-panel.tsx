'use client';

import { Disclosure } from '@/shared/components';
import { BlockedUsersList } from '@/features/blocks';
import { MyViolationsPanel } from '@/features/moderation';
import { ChangePasswordForm, ProfileInfoForm } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Tài khoản`: the account as an object you administer, including the two decisions
 * made *about* it.
 *
 * FOUR `Disclosure`S, CLOSED BY DEFAULT, RATHER THAN FOUR ALWAYS-OPEN `Section`S. Stacked open,
 * two forms and two review panels ran the tab three screens long before a visitor reached the
 * fourth thing — every section paid for its neighbours' height whether or not it was what the
 * visitor came for. A closed accordion shows all four titles at a glance and only pays for the
 * one a person actually clicks.
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

      {/* MODERATION, FROM THE RECEIVING END. `AppealController` shipped with the 2026-08-09 batch
          and had no surface: a post could be removed and an account banned for seven days with
          nothing on screen explaining it and no way to contest it. */}
      <Disclosure title={t('moderationMine.title')}>
        <MyViolationsPanel />
      </Disclosure>

      {/* THE OTHER HALF OF BLOCKING. The control lives on `/u/{username}`; without a list, a block
          is an invisible, permanent edit to what the product shows you and there is no way to
          review or undo it. */}
      <Disclosure title={t('blocks.title')}>
        <BlockedUsersList />
      </Disclosure>
    </div>
  );
}
