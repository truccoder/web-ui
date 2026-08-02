'use client';

import { GitFork, Star } from 'lucide-react';
import { Card } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { PinnedRepo } from '../types/github';

/**
 * The user's pinned repositories — at most six, because the GraphQL query says `first: 6`.
 *
 * NOT A PAGED LIST AND NOT A "TOP SIX". There is no cursor and no ordering the backend controls:
 * these are exactly the repositories the user pinned on their GitHub profile, in the order GitHub
 * returns them. So there is no "show more", and sorting them here would misrepresent a choice the
 * user already made.
 *
 * EVERY REPO IS A LINK OFF-SITE, stated plainly with `target="_blank"` — the app has no reader
 * view for someone else's repository, the same honesty `TrendingCard` applies to crawled items.
 * `noopener noreferrer` because the URL comes from an external API.
 *
 * THE LANGUAGE DOT USES GITHUB'S OWN COLOUR, for the reason spelled out in `ContributionGraph`:
 * the colour is data from the payload, and it is the thing that makes a language recognisable at
 * a glance. `primaryLanguage` is null for a repository GitHub could not classify, so the whole
 * row is conditional rather than falling back to a grey dot labelled nothing.
 */
export interface PinnedRepoListProps {
  repos: PinnedRepo[];
  className?: string;
}

export function PinnedRepoList({ repos, className }: PinnedRepoListProps) {
  const t = useT();

  if (repos.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-nx-caption text-nx-text-secondary">{t('github.pinned.title')}</p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {repos.map((repo) => (
          <li key={repo.url}>
            <Card padding={12} className="h-full">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
              >
                <span className="font-mono text-nx-body-sm font-medium text-nx-text-primary hover:underline">
                  {repo.name}
                </span>

                {/* Null on a repository with no description — most pinned ones have one, but the
                    card must not reserve empty space for the ones that do not. */}
                {repo.description && (
                  <span className="line-clamp-2 text-nx-caption text-nx-text-secondary">
                    {repo.description}
                  </span>
                )}

                <span className="mt-auto flex flex-wrap items-center gap-3 pt-1 text-nx-micro text-nx-text-muted">
                  {repo.primaryLanguage && (
                    <span className="inline-flex items-center gap-1">
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor: repo.primaryLanguage.color || 'var(--nx-surface-sunken)',
                        }}
                      />
                      {repo.primaryLanguage.name}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3" aria-hidden />
                    {repo.stargazerCount.toLocaleString('en-US')}
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <GitFork className="size-3" aria-hidden />
                    {repo.forkCount.toLocaleString('en-US')}
                  </span>
                </span>
              </a>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
