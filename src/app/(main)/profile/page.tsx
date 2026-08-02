'use client';

import Link from 'next/link';
import { GithubStatsCard } from '@/features/github';
import { ProfessionalProfileForm } from '@/features/knowledge';
import { MyReputationCard } from '@/features/reputation';
import {
  ChangePasswordForm,
  ProfileIdentityCard,
  ProfileInfoForm,
  useMyProfile,
} from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/profile` — assembled at P3.2. Owning domain: `security`.
 *
 * FOUR DOMAINS, ORDERED BY WHOSE ACCOUNT THIS IS RATHER THAN BY SIZE. `security` owns the shell
 * and everything that is literally the account (identity, display name, password); `reputation`,
 * `knowledge` and `github` each contribute one card, imported through their barrels — no domain
 * reaches into another's internals and this page mediates nothing between them.
 *
 * The order is: who you are → what the app scores you at → what you do professionally → what your
 * code says. Credentials go last because changing a password is a task, not a fact about you, and
 * putting a task first makes a page of facts read like a form.
 *
 * `roadmap` IS THE ONE PLANNED CONTRIBUTOR THAT IS ABSENT, and its absence is measured rather than
 * forgotten. The ledger expected "my verified skills" here; the backend cannot answer that. Nothing
 * exposes `UserRoadmapProgressRepository.findByUserId`, so no endpoint reports which nodes the
 * signed-in user has verified (B21) — `features/roadmap` exports browse surfaces and a claim form,
 * none of which is a statement about *this* user. A skills card built from what is available would
 * have to invent the one thing it exists to show. It goes in the moment B21 lands.
 *
 * TWO SURFACES MOVED HERE AND THEIR OLD HOMES WERE REMOVED, not left as duplicates:
 *  - `ProfessionalProfileForm` came from `/knowledge`, which parked it there at P2.11d precisely
 *    because this page's assembly had not happened yet. Two pages editing one record is worse than
 *    either page missing it, so `/knowledge` now points here instead.
 *  - `GithubStatsCard` came from `/github`, a route created at P2.14cd for the same reason and
 *    always expected to be short-lived. The route and its nav link are gone; the component did not
 *    move a line.
 */
export default function ProfilePage() {
  const t = useT();
  const { data: profile } = useMyProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-nx-body-sm text-nx-text-muted">{t('profile.subtitle')}</p>
      </div>

      <ProfileIdentityCard />

      <MyReputationCard />

      <section className="flex flex-col gap-3">
        <h2 className="text-nx-h3 text-nx-text-primary">{t('knowledge.profile.title')}</h2>
        <ProfessionalProfileForm />
        {/* Said here because the form no longer sits next to the feature that depends on it:
            without a professional profile the explainer refuses to run (428). */}
        <p className="text-nx-caption text-nx-text-muted">
          {t('profile.professionalHint')}{' '}
          <Link
            href="/knowledge"
            className="text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            {t('profile.professionalHintLink')}
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-nx-h3 text-nx-text-primary">{t('github.title')}</h2>
        {/* `undefined` until the profile resolves, which keeps the stats query idle rather than
            firing it for a user id nobody has yet. */}
        <GithubStatsCard userId={profile?.id} />
      </section>

      <ProfileInfoForm />

      <ChangePasswordForm />
    </div>
  );
}
