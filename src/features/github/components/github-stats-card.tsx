'use client';

import { RefreshCw } from 'lucide-react';
import { Button, Card, DeveloperMeta, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import {
  isNotLinked,
  isSyncRateLimited,
  useGithubStats,
  useSyncGithub,
  useUnlinkGithub,
} from '../hooks/use-github';
import { ContributionGraph } from './contribution-graph';
import { PinnedRepoList } from './pinned-repo-list';

/**
 * A user's GitHub presence: identity, counts, pinned repositories, contribution graph, and the
 * two controls that work today — sync and unlink.
 *
 * THERE IS DELIBERATELY NO "LINK GITHUB" BUTTON, AND ITS ABSENCE IS THE FEATURE. The linking flow
 * cannot complete: `/v1/api/github/oauth/url` and `/v1/api/auth/github/url` return byte-identical
 * URLs pointing at the SIGN-IN callback, which spends the single-use code; and `middleware.ts`
 * redirects any signed-in session away from `/oauth/*` before that page renders. So a link button
 * would send the user on a round trip that silently logs them in again and links nothing.
 * Shipping it would be the "Bỏ qua" button with no handler (ds-deviation #9) with extra steps.
 * B23; the empty state below says the account is not linked and stops there rather than offering
 * an action that cannot work.
 *
 * A 404 IS THE EMPTY STATE, NOT AN ERROR. `getStats` is `findByUserId(...).orElseThrow`, so an
 * unlinked user 404s every time — `isNotLinked` separates it, and the hook does not retry it.
 *
 * SYNC REPORTS ONLY THAT IT WAS ACCEPTED. `syncGithubData` swallows every exception, so a 200
 * covers both "refreshed" and "GitHub was unreachable". The copy therefore does not claim
 * success; `lastSyncedAt` below is the actual evidence, and it is rendered right next to the
 * button so the two can be compared.
 */
export interface GithubStatsCardProps {
  /** Whose stats to show. Undefined while the caller is still resolving it. */
  userId?: number;
  className?: string;
}

export function GithubStatsCard({ userId, className }: GithubStatsCardProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  const stats = useGithubStats(userId);
  const sync = useSyncGithub();
  const unlink = useUnlinkGithub();

  if (stats.isPending) {
    return <Skeleton lines={4} className={className} />;
  }

  if (isNotLinked(stats.error)) {
    return (
      <EmptyState
        className={className}
        title={t('github.notLinked.title')}
        description={t('github.notLinked.desc')}
      />
    );
  }

  if (stats.isError) {
    return (
      <EmptyState
        className={className}
        title={t('github.loadFailed')}
        description={getErrorMessage(stats.error)}
      />
    );
  }

  const data = stats.data;
  if (!data) return null;

  return (
    <Card padding={16} className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <a
            href={`https://github.com/${data.githubUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-nx-ui font-medium text-nx-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            {data.githubUsername}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={sync.isPending}
            onClick={() => sync.mutate()}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
          >
            {t('github.sync')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={unlink.isPending}
            onClick={() => unlink.mutate()}
          >
            {t('github.unlink')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <DeveloperMeta>{t('github.repos', { count: data.publicReposCount })}</DeveloperMeta>
        <DeveloperMeta>{t('github.followers', { count: data.followersCount })}</DeveloperMeta>
        {/* Null between linking and the first successful sync. Because a failed sync is silent,
            this is the clearest signal available that it has not worked. */}
        <DeveloperMeta>
          {data.lastSyncedAt
            ? t('github.lastSynced', { when: relativeTime(data.lastSyncedAt) })
            : t('github.neverSynced')}
        </DeveloperMeta>
      </div>

      {/* The rate limit is a refusal, not a fault, so it gets its own sentence rather than a raw
          error message: the user did nothing wrong and only needs to know to come back later. */}
      {sync.isError && (
        <p role="status" className="text-nx-caption text-nx-status-danger-fg">
          {isSyncRateLimited(sync.error)
            ? t('github.syncRateLimited')
            : getErrorMessage(sync.error)}
        </p>
      )}

      {unlink.isError && (
        <p role="status" className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(unlink.error)}
        </p>
      )}

      <PinnedRepoList repos={data.pinnedRepos} />

      {/* Null when the sync produced GitHub's empty-object fallback — see `normalizeStats`. The
          graph is simply absent then, rather than an empty grid implying zero contributions. */}
      {data.contributionGraph && <ContributionGraph calendar={data.contributionGraph} />}
    </Card>
  );
}
