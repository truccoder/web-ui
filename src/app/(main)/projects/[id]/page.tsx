'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/shared/components';
import { ProjectDetail } from '@/features/matchmaking';
import { useMyProfile } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/projects/{id}` — one project.
 *
 * THE VIEWER'S ID IS RESOLVED HERE AND PASSED DOWN, rather than looked up inside the feature. The
 * owner split decides whether the application inbox is fetched at all — that endpoint answers 403
 * to everyone else — so the decision needs the signed-in account, and `features/matchmaking` has
 * no business importing `features/security` to get it (CLAUDE.md §4). The page composes; the
 * feature renders.
 */
export default function ProjectDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const { data: profile } = useMyProfile();

  const raw = Number(params?.id);
  const projectId = Number.isInteger(raw) && raw > 0 ? raw : undefined;

  if (projectId === undefined) {
    return (
      <EmptyState
        title={t('projects.detail.notFoundTitle')}
        description={t('projects.detail.notFoundDesc')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Link
        href="/projects"
        className="inline-flex w-fit items-center gap-2 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('projects.backToBoard')}
      </Link>

      <ProjectDetail projectId={projectId} viewerId={profile?.id} />
    </div>
  );
}
