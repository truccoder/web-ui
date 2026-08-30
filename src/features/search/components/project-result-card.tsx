'use client';

import Link from 'next/link';
import { Avatar, Badge } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { Project } from '@/features/matchmaking';

/**
 * One project in the results — a row, not the full `ProjectCard` the board draws.
 *
 * `features/matchmaking` exports `ProjectCard`, but that is a whole `Card` with a description
 * paragraph and a wrapped row of role badges: right for a board where a project is the subject,
 * too tall for a result list scanned against a term. This matches `UserResultCard` /
 * `BookResultCard` instead — one line, identification not detail, one click to the real page.
 *
 * The author is an avatar and a name with no link: `ProjectResponseDto` carries `authorId` and
 * `authorFullName` but no handle, the same gap the feed has, so there is nowhere for a link to go.
 */
export interface ProjectResultCardProps {
  project: Project;
  className?: string;
}

export function ProjectResultCard({ project, className }: ProjectResultCardProps) {
  const t = useT();
  const openCount = (project.positions ?? []).filter((p) => p.status === 'OPEN').length;

  const row = (
    <div className={cn('flex items-center gap-3 px-3 py-3', className)}>
      <Avatar src={project.authorProfilePictureUrl} name={project.authorFullName} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-nx-ui font-medium text-nx-text-primary">
            {project.title}
          </span>
          {project.status === 'CLOSED' && (
            <Badge variant="neutral">{t('projects.status.CLOSED')}</Badge>
          )}
        </p>
        <p className="truncate text-nx-caption text-nx-text-muted">
          {project.authorFullName}
          {openCount > 0 && <> · {t('search.openPositions', { count: openCount })}</>}
        </p>
      </div>
    </div>
  );

  if (project.id == null) return row;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-nx-sm hover:bg-nx-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
    >
      {row}
    </Link>
  );
}
