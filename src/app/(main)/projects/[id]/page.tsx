'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/shared/components';
import { ProjectDetail } from '@/features/matchmaking';
import { useMyProfile } from '@/features/security';
import { BACK_TO_PARAM, safeBackTo } from '@/features/search';
import { useT } from '@/core/i18n';

/**
 * `/projects/{id}` — one project.
 *
 * THE VIEWER'S ID IS RESOLVED HERE AND PASSED DOWN, rather than looked up inside the feature. The
 * owner split decides whether the application inbox is fetched at all — that endpoint answers 403
 * to everyone else — so the decision needs the signed-in account, and `features/matchmaking` has
 * no business importing `features/security` to get it (CLAUDE.md §4). The page composes; the
 * feature renders.
 *
 * THE BACK LINK IS NORMALLY THE BOARD, but a `?backTo=` left by the search results page (B33)
 * overrides it so a project opened from `/search` returns to the same results, query and tab
 * intact. `safeBackTo` pins the value to `/search?` so the param can only ever be a search URL.
 */
export default function ProjectDetailPage() {
  return (
    <Suspense>
      <ProjectDetailContent />
    </Suspense>
  );
}

function ProjectDetailContent() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
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

  const backTo = safeBackTo(searchParams.get(BACK_TO_PARAM));

  return (
    /**
     * THE BLOCK RUNG, NOT THE SECTION RUNG — the same argument `posts/[id]/page.tsx:94` already
     * carries, applied to the page that did not know about it. Report §3.3 (B001).
     *
     * `--nx-space-section` (40) separates two things that each stand on their own. This column
     * has exactly two children — the way BACK OUT of the project, and the project — so there is
     * no section ↔ section pair here for 40 to be the distance of; it was only ever paying for
     * "link → content", and at 40 the link floats in the middle of nothing with the content
     * starting below the first comfortable line.
     *
     * The sections *inside* `ProjectDetail` keep their own 40. This is the boundary above them.
     */
    <div className="flex flex-col gap-[var(--nx-space-block)]">
      <Link
        href={backTo ?? '/projects'}
        className="inline-flex w-fit items-center gap-2 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backTo ? t('search.backToResults') : t('projects.backToBoard')}
      </Link>

      <ProjectDetail
        projectId={projectId}
        viewerId={profile?.id}
        onDeleted={() => router.push('/projects')}
      />
    </div>
  );
}
