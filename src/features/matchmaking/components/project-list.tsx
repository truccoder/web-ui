'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Avatar, Badge, Card, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { Project, SuggestedProject } from '../types/matchmaking';
import { useProjects, useSuggestedProjects } from '../hooks/use-matchmaking';

/**
 * The project board — every project, newest first.
 *
 * THIS IS THE SCREEN THE DOMAIN COULD NOT HAVE. `features/matchmaking` has had a complete data
 * layer since P2.16ab and zero UI, because `ProjectController` exposed no list of anything: the
 * ledger recorded it as "không dựng được màn nào mà không bịa dữ liệu". `GET /projects` is the
 * endpoint that removes the ceiling, and this is the first thing built on it.
 *
 * A CARD PER PROJECT, NOT A GRID like the library. A project card carries a paragraph of
 * description and a variable-length row of open roles; two of those side by side at 330px would
 * clamp the description to a line and hide the roles, which are the two things somebody browsing
 * is actually reading for.
 *
 * OPEN ROLES ARE COUNTED FROM `positions`, NOT FETCHED. The list read embeds each project's
 * positions, so the card can say `3 vị trí đang mở` without a request per card — and the count is
 * of positions whose own `status` is `OPEN`, which is not the same as the project's status: a
 * project stays `OPEN` while individual roles fill up.
 */
export function ProjectList() {
  const t = useT();
  const projects = useProjects();
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = projects;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (projects.isLoading) {
    return (
      <div className="flex flex-col gap-[var(--nx-space-block)]">
        <Card>
          <Skeleton lines={3} />
        </Card>
        <Card>
          <Skeleton lines={3} />
        </Card>
      </div>
    );
  }

  if (projects.isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(projects.error, t('projects.loadError'))}
      </p>
    );
  }

  const items = projects.data?.pages.flatMap((page) => page.items ?? []) ?? [];

  if (items.length === 0) {
    return <EmptyState title={t('projects.emptyTitle')} description={t('projects.emptyDesc')} />;
  }

  return (
    <div>
      <ul className="flex flex-col gap-[var(--nx-space-block)]">
        {items.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <Card className="mt-[var(--nx-space-block)]">
          <Skeleton lines={3} />
        </Card>
      )}
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const t = useT();
  const positions = project.positions ?? [];
  const openCount = positions.filter((position) => position.status === 'OPEN').length;

  return (
    <Card className="flex flex-col gap-[var(--nx-space-group)]">
      <div className="flex items-start gap-3">
        {/* The author cannot link to `/u/{username}`: `ProjectResponseDto` carries `authorId` and
            `authorFullName` with no handle, the same gap the feed has (B28). Avatar and name, no
            anchor — a link that 404s is worse than none. */}
        <Avatar src={project.authorProfilePictureUrl} name={project.authorFullName} size="md" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/projects/${project.id}`}
            className="text-nx-heading font-semibold text-nx-text-primary hover:underline"
          >
            {project.title}
          </Link>
          <p className="truncate text-nx-caption text-nx-text-muted">{project.authorFullName}</p>
        </div>

        {/* A closed project keeps its badge; an open one does not get one. `OPEN` is the default
            state of everything on this screen, so labelling it would put an identical chip on
            every card — the same argument that removed the `Khác` badge from crawled cards. */}
        {project.status === 'CLOSED' && (
          <Badge variant="neutral">{t('projects.status.CLOSED')}</Badge>
        )}
      </div>

      {project.description && (
        <p className="line-clamp-3 whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
          {project.description}
        </p>
      )}

      {positions.length > 0 && (
        <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
          <span className="text-nx-caption text-nx-text-muted">
            {t('projects.openPositions', { count: openCount })}
          </span>
          {positions.slice(0, 3).map((position) => (
            <Badge key={position.id} variant={position.status === 'OPEN' ? 'accent' : 'neutral'}>
              {position.title}
            </Badge>
          ))}
          {positions.length > 3 && (
            <span className="text-nx-caption text-nx-text-faint">+{positions.length - 3}</span>
          )}
        </div>
      )}

      {/* `tags` (BE `ecc53bb`, B26) — the domain half of `GET /projects/suggested`'s scoring,
          e.g. "Blockchain", "Fintech". Optional and neutral, unlike a position's accent badge: a
          tag is a topic, not something to apply to. */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-[var(--nx-space-pair)]">
          {project.tags.map((tag) => (
            <Badge key={tag} variant="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * "Projects that fit you" — `GET /v1/api/projects/suggested` (BE `ecc53bb`, B26, new).
 *
 * THE MIRROR OF `MatchingCandidates` IN `project-detail.tsx`: there, a project owner sees who fits
 * a role; here, a person sees which open projects fit THEM, scored against their own professional
 * profile (`knowledge`).
 *
 * RENDERS NOTHING ON AN EMPTY LIST, and that is the common case, not a failure state — a caller
 * with no professional profile row gets `[]` outright, and the backend already drops anything
 * that scores 0. A visible "no matches" block for what is usually just "you have not filled in a
 * profile yet" would be a permanent fixture on this screen for most people.
 *
 * REUSES `ProjectCard` rather than a bespoke row: it is the same project, and the match reason
 * (`matchedSkills` / `matchedDomains`) is additive information alongside it, not a different way
 * of presenting a project.
 */
export function SuggestedProjects() {
  const t = useT();
  const { data, isPending, isError } = useSuggestedProjects(5);

  if (isPending || isError || !data || data.length === 0) return null;

  return (
    <div className="flex flex-col gap-[var(--nx-space-block)]">
      <div>
        <h2 className="text-nx-heading font-semibold text-nx-text-primary">
          {t('projects.suggested.title')}
        </h2>
        <p className="text-nx-caption text-nx-text-muted">{t('projects.suggested.subtitle')}</p>
      </div>

      <ul className="flex flex-col gap-[var(--nx-space-block)]">
        {data.map((suggestion) => (
          <li key={suggestion.project?.id}>
            <SuggestedProjectCard suggestion={suggestion} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuggestedProjectCard({ suggestion }: { suggestion: SuggestedProject }) {
  const t = useT();
  if (!suggestion.project) return null;

  const reasons = [...(suggestion.matchedSkills ?? []), ...(suggestion.matchedDomains ?? [])];

  return (
    <div className="flex flex-col gap-[var(--nx-space-tight)]">
      <ProjectCard project={suggestion.project} />

      {/* The reason ships with the recommendation (backend javadoc on `SuggestedProjectDto`) so
          it renders here rather than being recomputed against `requiredSkills` client-side —
          the same principle `MatchingCandidates` follows for `matchedSkills` on a candidate. */}
      {reasons.length > 0 && (
        <p className="text-nx-caption text-nx-text-muted">
          {t('projects.matching.score', { score: suggestion.matchScore ?? 0 })} ·{' '}
          {reasons.slice(0, 4).join(' · ')}
        </p>
      )}
    </div>
  );
}
