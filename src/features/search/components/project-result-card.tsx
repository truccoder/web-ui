'use client';

import { ProjectCard, type Project } from '@/features/matchmaking';

/**
 * One project in the results — now the board's own `ProjectCard`, not a bespoke row.
 *
 * This used to be a one-line row "too tall for the full `ProjectCard`". The owner's call was the
 * other way: "dùng style có sẵn (của … project board) thay vì random" — a project hit is the same
 * object the board shows, so it gets the same card, description paragraph, role badges and all.
 * `features/matchmaking` exports `ProjectCard` from its barrel for exactly this reuse.
 */
export interface ProjectResultCardProps {
  project: Project;
}

export function ProjectResultCard({ project }: ProjectResultCardProps) {
  return <ProjectCard project={project} />;
}
