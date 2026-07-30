'use client';

import { GithubStatsCard } from '@/features/github';
import { useMyProfile } from '@/features/security';
import { useT } from '@/lib/i18n';

/**
 * `/github` — the signed-in user's GitHub presence.
 *
 * A NEW ROUTE RATHER THAN A REWIRE: this domain has never had any UI, so there was nothing to
 * migrate and nothing to delete. Same situation and same answer as `/notifications` (P2.6cd),
 * `/knowledge` (P2.11d) and `/roadmap` (P2.13d).
 *
 * THIS ROUTE IS EXPECTED TO BE ABSORBED BY `/profile` AT P3.2, which the ledger already plans to
 * assemble from knowledge, roadmap, github and reputation. Nothing moves when that happens — the
 * page imports `GithubStatsCard` through this feature's barrel, so P3.2 imports the same
 * component and this file goes away. Building it on `/profile` now would mean editing a page
 * `security` owns before its assembly checkpoint, which is the trade `/knowledge` already
 * considered and declined.
 *
 * ONLY THE SIGNED-IN USER'S STATS ARE REACHABLE. `GET /stats/{userId}` accepts any id, but there
 * is no public profile endpoint anywhere in this app, so no screen can offer another user's id
 * without inventing a way to pick one.
 *
 * The page owns nothing but the heading and whose id to ask for.
 */
export default function GithubPage() {
  const t = useT();
  const { data: profile } = useMyProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">{t('github.title')}</h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">{t('github.subtitle')}</p>
      </div>

      {/* `undefined` until the profile resolves, which keeps the query idle rather than firing it
          for a user id nobody has yet. */}
      <GithubStatsCard userId={profile?.id} />
    </div>
  );
}
