'use client';

import Link from 'next/link';
import {
  ApiErrorNotice,
  Avatar,
  Badge,
  Card,
  EmptyState,
  SectionLink,
  Skeleton,
} from '@/shared/components';
import { useInfiniteScroll } from '@/shared/lib/use-infinite-scroll';
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

  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

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
    return <ApiErrorNotice error={projects.error} onRetry={() => projects.refetch()} />;
  }

  const items = projects.data?.pages.flatMap((page) => page.items ?? []) ?? [];

  if (items.length === 0) {
    return <EmptyState title={t('projects.emptyTitle')} description={t('projects.emptyDesc')} />;
  }

  return (
    <div>
      {/* A heading, so that when `SuggestedProjects` renders its own block directly above this one
          the two do not run together as a single undifferentiated column — the ranked cut and the
          whole board share a project, and without a break the repeat reads as a bug. */}
      <h2 className="mb-[var(--nx-space-block)] text-nx-heading font-semibold text-nx-text-primary">
        {t('projects.allTitle')}
      </h2>

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

/**
 * `href` overrides where the title links (default `/projects/{id}`) — the search results page
 * passes the same path with a `?backTo=` so the detail screen's back control returns to the
 * results rather than the board. Everywhere else omits it and gets the plain path.
 */
export function ProjectCard({ project, href }: { project: Project; href?: string }) {
  const t = useT();
  const positions = project.positions ?? [];
  const openCount = positions.filter((position) => position.status === 'OPEN').length;

  /**
   * `authorUsername` (BE, B35 in `docs/backend-plan.md`, closed). The gap this note used to
   * describe — `ProjectResponseDto` carrying `authorId`/`authorFullName` with no handle, so a
   * project's author could not link to `/u/{username}` the way a post's finally could (B13) — is
   * paid off; the backend added the field the same way it added `authorUsername` to the feed.
   * Still optional, same guard as `PostCard`'s `authorHref`: absent means plain text rather than
   * an anchor to `/u/undefined`, for a payload that predates the field.
   */
  const authorHref = project.authorUsername
    ? `/u/${encodeURIComponent(project.authorUsername)}`
    : undefined;

  const authorAvatar = (
    <Avatar src={project.authorProfilePictureUrl} name={project.authorFullName} size="md" />
  );

  return (
    <Card className="group relative flex flex-col gap-[var(--nx-space-group)]">
      <div className="flex items-start gap-3">
        {authorHref ? (
          <Link href={authorHref} className="relative z-10 shrink-0 rounded-nx-full">
            {authorAvatar}
          </Link>
        ) : (
          authorAvatar
        )}
        <div className="min-w-0 flex-1">
          <p className="text-nx-heading font-semibold text-nx-text-primary group-hover:underline">
            {project.title}
          </p>
          {authorHref ? (
            <Link
              href={authorHref}
              className="relative z-10 block truncate text-nx-caption text-nx-text-muted hover:text-nx-text-primary hover:underline"
            >
              {project.authorFullName}
            </Link>
          ) : (
            <p className="truncate text-nx-caption text-nx-text-muted">{project.authorFullName}</p>
          )}
        </div>

        {/* A closed or completed project keeps its badge; an open one does not get one. `OPEN` is
            the default state of everything on this screen, so labelling it would put an identical
            chip on every card — the same argument that removed the `Khác` badge from crawled
            cards. */}
        {project.status && project.status !== 'OPEN' && (
          <Badge variant={project.status === 'COMPLETED' ? 'success' : 'neutral'}>
            {t(`projects.status.${project.status}`)}
          </Badge>
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

      {/* THE WHOLE CARD IS THE LINK TO THE PROJECT. An absolutely-positioned overlay anchor —
          LAST in the DOM so it paints over the non-interactive body — rather than wrapping the
          card in `<Link>`, because the card carries its own nested links (the author, keyed up
          with `relative z-10`). Same stretched-link shape the book grid cell uses, adapted for a
          card that is not link-only. */}
      <Link
        href={href ?? `/projects/${project.id}`}
        aria-label={project.title ?? undefined}
        className="absolute inset-0 rounded-nx-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring"
      />
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
 * SHOWS AN EMPTY STATE NOW, NOT NOTHING (JD spec step 6). The suggestion endpoint got stricter —
 * it drops any project that does not clear the role's skills AND experience bar — so `[]` is more
 * common than it was, and "nothing here" without a word reads as a broken block. `[]` still cannot
 * tell "no profile yet" from "nothing matched", so the copy covers both and points at the whole
 * board below.
 *
 * REUSES `ProjectCard` rather than a bespoke row: it is the same project, and the match reason
 * (`qualifiedPositionIds` / `matchedSkills` / `matchedDomains`) is additive information alongside
 * it, not a different way of presenting a project.
 */
export function SuggestedProjects() {
  const t = useT();
  const { data, isPending, isError } = useSuggestedProjects(5);

  // A load failure falls through to the full board below rather than showing an error here — this
  // is a "for you" cut, not the list itself.
  if (isPending || isError) return null;

  const suggestions = data ?? [];

  return (
    <div className="flex flex-col gap-[var(--nx-space-block)]">
      <div>
        <h2 className="text-nx-heading font-semibold text-nx-text-primary">
          {t('projects.suggested.title')}
        </h2>
        <p className="text-nx-caption text-nx-text-muted">{t('projects.suggested.subtitle')}</p>
      </div>

      {suggestions.length === 0 ? (
        <EmptyState
          compact
          title={t('projects.suggested.emptyTitle')}
          description={t('projects.suggested.emptyDesc')}
          action={
            <SectionLink href="/profile?tab=professional">
              {t('projects.suggested.fillProfile')}
            </SectionLink>
          }
        />
      ) : (
        <ul className="flex flex-col gap-[var(--nx-space-block)]">
          {suggestions.map((suggestion) => (
            <li key={suggestion.project?.id}>
              <SuggestedProjectCard suggestion={suggestion} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestedProjectCard({ suggestion }: { suggestion: SuggestedProject }) {
  const t = useT();
  const project = suggestion.project;
  if (!project) return null;

  const reasons = [...(suggestion.matchedSkills ?? []), ...(suggestion.matchedDomains ?? [])];

  // `qualifiedPositionIds` (BE `V105`) — the roles on this project the caller actually clears, and
  // never empty when the project is suggested at all. Naming them and linking to the exact role
  // card beats dropping someone onto the project page to work out which one is for them.
  const positions = project.positions ?? [];
  const qualified = (suggestion.qualifiedPositionIds ?? [])
    .map((id) => positions.find((position) => position.id === id))
    .filter((position): position is NonNullable<typeof position> => position != null);

  return (
    <div className="flex flex-col gap-[var(--nx-space-tight)]">
      <ProjectCard project={project} />

      {qualified.length > 0 && (
        <p className="text-nx-caption text-nx-text-secondary">
          {t('projects.suggested.qualified')}{' '}
          {qualified.map((position, index) => (
            <span key={position.id}>
              {index > 0 && ' · '}
              <Link
                href={`/projects/${project.id}#role-${position.id}`}
                className="text-nx-text-accent hover:underline"
              >
                {position.title}
              </Link>
            </span>
          ))}
        </p>
      )}

      {/* The reason ships with the recommendation (backend javadoc on `SuggestedProjectDto`) so
          it renders here rather than being recomputed against `requiredSkills` client-side —
          the same principle `MatchingCandidates` follows for `matchedSkills` on a candidate.

          THE RAW `matchScore` IS NOT SHOWN. It is a number with no scale printed anywhere — 12
          means nothing without knowing a skill outweighs a domain — and `ledger.tsx` makes the
          same call for the same card in the flank: show the half that reads as language. The
          candidate list on `project-detail` is the one place the number stays, because there it
          is a rank between people rather than a figure on its own. */}
      {reasons.length > 0 && (
        <p className="text-nx-caption text-nx-text-muted">
          {t('ledger.matchedOn')} {reasons.slice(0, 4).join(' · ')}
        </p>
      )}
    </div>
  );
}
