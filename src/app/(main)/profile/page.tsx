'use client';

import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { StatTile } from '@/shared/components';
import { MyBooksList } from '@/features/bookstore';
import { GithubStatsCard } from '@/features/github';
import { FriendRequests, useFriends, usePendingRequests } from '@/features/friendships';
import { ProfessionalProfileForm } from '@/features/knowledge';
import { MyReputationCard } from '@/features/reputation';
import { MySkillsCard } from '@/features/roadmap';
import {
  ChangePasswordForm,
  ProfileIdentityCard,
  ProfileInfoForm,
  useMyProfile,
} from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/profile` — assembled at P3.2, and it ABSORBED `/dashboard` at P5.2. Owning domain: `security`.
 *
 * WHY THE MERGE. The two routes were the same page wearing different names: both opened by
 * claiming to be the home of the signed-in account. `/dashboard` had a greeting, a friend count
 * and incoming requests; `/profile` had identity, Elite Score, professional profile, GitHub and
 * credentials. No boundary existed that a person could predict, so every visit started with
 * "which one has the thing I want". One page, one answer.
 *
 * FIVE DOMAINS, ORDERED BY WHOSE ACCOUNT THIS IS RATHER THAN BY SIZE. `security` owns the shell
 * and everything that is literally the account; `reputation`, `friendships`, `knowledge` and
 * `github` each contribute through their barrels — no domain reaches into another's internals and
 * this page mediates nothing between them.
 *
 * The order is: who you are → what the app scores you at → what your network is doing → what you
 * do professionally → what your code says → your credentials. Credentials go last because changing
 * a password is a task, not a fact about you, and putting a task first makes a page of facts read
 * like a form.
 *
 * WHAT THE MERGE DROPPED, deliberately:
 *  - THE GREETING. "Chào mừng trở lại, X" sat directly above an identity card showing the same
 *    name and face. Saying it twice is not warmth, it is noise.
 *  - FRIEND SUGGESTIONS. They were on the dashboard, and they are about *other* people — this page
 *    is about you. They live one click away on the friends tabs, which is where someone who wants
 *    to grow their network is already heading.
 * Incoming requests stayed, because they are addressed to you and are actionable where they sit.
 *
 * NOTHING IS KNOWINGLY MISSING ANY MORE. The two gaps this header used to list both closed on
 * 2026-08-09, and neither was blocked on what the old note claimed:
 *
 * "MY SKILLS" LANDED AT M3. The note said a skills card "would have to invent the one thing it
 * exists to show", which was true while B21 was open — `findByUserId()` existed with no controller
 * in front of it. `GET /users/{userId}/roadmap-progress` shipped, so the card shows real rows. It
 * is the one section here whose contents depend on WHO IS LOOKING: the backend returns pending and
 * rejected claims only to the owner, which on this page is always the viewer.
 *
 * "MY BOOKS" LANDED AT M2, and the note it replaces was wrong about why it was absent: it said
 * "goes in with backend D2", but `GET /books/author/{id}` and `DELETE /books/{id}` were never
 * blocked on anything — both work today. What was missing was a page with a reason to list books
 * by author, which is what this page became when it absorbed `/dashboard`. It closes the last gap
 * in bookstore's endpoint coverage (9/11 → 11/11).
 */
export default function ProfilePage() {
  const t = useT();
  const { data: profile } = useMyProfile();
  const { data: friends } = useFriends();
  const { data: pendingRequests } = usePendingRequests();

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
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-nx-title-sm text-nx-text-primary">{t('profile.network.title')}</h2>
          <Link
            href="/friends/all"
            className="shrink-0 text-nx-body-sm text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            {t('profile.network.viewAll')}
          </Link>
        </div>

        {/* `StatTile` takes the raw value: while the queries are in flight both read "—" rather
            than a zero that would be indistinguishable from "you have no friends". */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile
            label={t('dashboard.stats.friends')}
            value={friends?.totalCount}
            description={t('dashboard.stats.friendsDesc')}
            icon={<Users size={16} />}
          />
          <StatTile
            label={t('dashboard.stats.pending')}
            value={pendingRequests?.length}
            description={t('dashboard.stats.pendingDesc')}
            icon={<Clock size={16} />}
          />
        </div>

        <FriendRequests />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-nx-title-sm text-nx-text-primary">{t('knowledge.profile.title')}</h2>
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

      {/* Sits between the professional profile and GitHub because that is the order of how hard
          the claim is to make: what you say you do → what the app has verified you can do → what
          your code shows. Linking to /roadmap rather than embedding the claim form: claiming a
          skill needs a roadmap and a node picked from it, which is a whole surface, not a card. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-nx-title-sm text-nx-text-primary">{t('profile.skills.title')}</h2>
          <Link
            href="/roadmap"
            className="shrink-0 text-nx-body-sm text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            {t('profile.skills.browseRoadmaps')}
          </Link>
        </div>
        <MySkillsCard userId={profile?.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-nx-title-sm text-nx-text-primary">{t('github.title')}</h2>
        {/* `undefined` until the profile resolves, which keeps the stats query idle rather than
            firing it for a user id nobody has yet. */}
        <GithubStatsCard userId={profile?.id} />
      </section>

      {/* Sits after GitHub and before credentials, keeping the page's rule that facts about you
          come before tasks: what you have published is another thing your account *is*, while
          changing a password is something you *do*. Takes `profile?.id` for the same reason the
          stats card does — the query stays idle until there is an id to ask about. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-nx-title-sm text-nx-text-primary">{t('profile.books.title')}</h2>
        <MyBooksList authorId={profile?.id} />
      </section>

      <ProfileInfoForm />

      <ChangePasswordForm />
    </div>
  );
}
