'use client';

import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { StatTile } from '@/shared/components';
import {
  FriendRequests,
  FriendSuggestions,
  useFriends,
  usePendingRequests,
} from '@/features/friendships';
import { useMyProfile } from '@/features/security';
import { useT } from '@/lib/i18n';

/**
 * `/dashboard` — assembled at P3.3. Owning domain: `security`.
 *
 * TWO DOMAINS. `security` owns the shell and the greeting (this is the home of the signed-in
 * account); `friendships` contributes the counts and both lists through its barrel. The page
 * composes and nothing more — it holds no query keys, no mutations and no list markup, because
 * `FriendRequests` and `FriendSuggestions` already exist as the `/friends/*` surfaces and a
 * second implementation of "accept a friend request" is a second thing to keep correct.
 *
 * THE FOLLOW FEATURE IS GONE, NOT MOVED. The legacy page carried two more tiles, "Followers" and
 * "Following", reading `/v1/api/social/*`. No such controller exists — `grep -c social` over
 * `schema.gen.ts` is 0 — so those tiles rendered an em dash forever and no backend change was
 * pending that would fill them. Shipping a number the server cannot produce is worse than not
 * showing it, so the tiles, `lib/api/social.ts`, `lib/hooks/use-social.ts` and their i18n keys
 * were deleted at this checkpoint rather than carried into `features/`.
 *
 * The two tiles that remain both come from data the page already needs for the lists below, so
 * neither costs an extra request.
 */
export default function DashboardPage() {
  const t = useT();
  const { data: profile } = useMyProfile();
  const { data: friends } = useFriends();
  const { data: pendingRequests } = usePendingRequests();

  // THE WHOLE NAME, NOT A SPLIT-OFF FIRST TOKEN. The legacy page took `split(' ')[0]`, which is
  // the given name in English and the FAMILY name in Vietnamese — and `vi` is this app's default
  // locale, so it greeted most users by their surname. There is no locale-independent rule for
  // which token is the given name, so the greeting uses the name as stored.
  const name = profile?.fullName;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
          {name ? t('dashboard.welcomeName', { name }) : t('dashboard.welcome')}
        </h1>
        <p className="mt-1 text-nx-body-sm text-nx-text-muted">{t('dashboard.subtitle')}</p>
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

      <DashboardSection
        title={t('dashboard.requests.title')}
        description={t('dashboard.requests.desc')}
        href="/friends/requests"
        linkLabel={t('dashboard.viewAll')}
      >
        <FriendRequests />
      </DashboardSection>

      <DashboardSection
        title={t('dashboard.suggestions.title')}
        description={t('dashboard.suggestions.desc')}
        href="/friends/suggestions"
        linkLabel={t('dashboard.viewAll')}
      >
        {/* Capped at 5 the way the legacy page capped it. A dashboard is a summary; the full
            ranked list is one click away and lives at `/friends/suggestions`. */}
        <FriendSuggestions limit={5} />
      </DashboardSection>
    </div>
  );
}

/**
 * Heading + "see all" link wrapper. Local to this page on purpose: it is layout for this one
 * composition, not a primitive — `shared/` earns a component when a second page needs it.
 */
function DashboardSection({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-nx-h3 text-nx-text-primary">{title}</h2>
          <p className="text-nx-caption text-nx-text-muted">{description}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 text-nx-body-sm text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}
