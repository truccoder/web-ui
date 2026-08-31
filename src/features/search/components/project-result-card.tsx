'use client';

import { ProjectCard, type Project } from '@/features/matchmaking';
import { useT } from '@/core/i18n';
import { foldQuery, pickMatching } from '../lib/query-match';
import { withBackTo } from '../lib/search-return';

/**
 * One project in the results — the board's own `ProjectCard`, plus a line naming WHY it matched.
 *
 * A project matches `java` on a position's `requiredSkills`, not on anything drawn on the card —
 * which is exactly the confusion `matchmaking/4034` caused ("tại sao lại có điểm phù hợp là
 * Java?"). So when the hit is a skill or a role, the card spells it out; when it is the title or a
 * tag (both already visible) it stays quiet.
 *
 * `href` carries `?backTo=` so the detail screen returns to these results, not the board.
 */
export interface ProjectResultCardProps {
  project: Project;
  /** The active query — used only to explain the match, never to filter (the server did that). */
  query: string;
  /** The results URL to send the reader back to from the project's detail screen. */
  backTo: string;
}

export function ProjectResultCard({ project, query, backTo }: ProjectResultCardProps) {
  const t = useT();
  const trimmed = query.trim();
  const folded = foldQuery(trimmed);
  const positions = project.positions ?? [];

  const matchedSkills = [
    ...new Set(positions.flatMap((p) => pickMatching(folded, p.requiredSkills ?? []))),
  ];
  const matchedRoles = [
    ...new Set(
      positions
        .filter((p) => pickMatching(folded, [p.title, ...(p.requiredSkills ?? [])]).length > 0)
        .map((p) => p.title)
        .filter((title): title is string => Boolean(title))
    ),
  ];

  const reason = [...matchedSkills, ...matchedRoles.filter((r) => !matchedSkills.includes(r))];

  return (
    <div className="flex flex-col gap-[var(--nx-space-tight)]">
      <ProjectCard project={project} href={withBackTo(`/projects/${project.id}`, backTo)} />
      {reason.length > 0 && (
        <p className="px-1 text-nx-caption text-nx-text-muted">
          {t('search.projectMatch', { query: trimmed })} {reason.slice(0, 5).join(' · ')}
        </p>
      )}
    </div>
  );
}
