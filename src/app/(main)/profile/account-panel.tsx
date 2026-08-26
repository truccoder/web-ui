'use client';

import { Section } from '@/shared/components';
import { BlockedUsersList } from '@/features/blocks';
import { MyViolationsPanel } from '@/features/moderation';
import { ChangePasswordForm, ProfileInfoForm } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/profile` → `Tài khoản`: the account as an object you administer, including the two decisions
 * made *about* it.
 *
 * ALL FOUR SECTIONS ARE `<h2>`s NOW, WHICH THEY WERE NOT. The two forms printed their own `<h3>`
 * from inside their cards while the two panels below took an `<h2>` from the page, so this tab's
 * outline ran `<h1>` → `<h3>` → `<h3>` → `<h2>` → `<h2>`: the two things a person comes to this
 * page to DO ranked below the two things that merely happened to them, and a screen reader's
 * heading list said so. `Section` carries the full account of why that had two causes.
 */
export function AccountPanel() {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* THE TWO FORMS COME FIRST, and that inversion is most of the reason this tab exists. They
          are the only things on the whole page a person arrives intending to DO, and the single
          column had them below three screens of facts. The old order put them last on the grounds
          that "changing a password is a task, not a fact about you, and putting a task first makes
          a page of facts read like a form" — which was right about a page of facts. This is not
          one: it is the tab of tasks, so the tasks lead it. */}
      <Section title={t('profile.info.title')} description={t('profile.info.desc')}>
        <ProfileInfoForm />
      </Section>

      <Section title={t('profile.password.title')} description={t('profile.password.desc')}>
        <ChangePasswordForm />
      </Section>

      {/* MODERATION, FROM THE RECEIVING END. `AppealController` shipped with the 2026-08-09 batch
          and had no surface: a post could be removed and an account banned for seven days with
          nothing on screen explaining it and no way to contest it. It sits above the block list
          because both answer "what has been decided about me". */}
      <Section title={t('moderationMine.title')}>
        <MyViolationsPanel />
      </Section>

      {/* THE OTHER HALF OF BLOCKING. The control lives on `/u/{username}`; without a list, a block
          is an invisible, permanent edit to what the product shows you and there is no way to
          review or undo it. Filed under the account because that is what it is — a setting about
          what you see, not a list of people you know. */}
      <Section title={t('blocks.title')}>
        <BlockedUsersList />
      </Section>
    </div>
  );
}
