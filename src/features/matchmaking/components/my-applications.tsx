'use client';

import Link from 'next/link';
import { Badge, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import { useMyApplications } from '../hooks/use-matchmaking';

/**
 * What the signed-in account has applied to, and what came of it.
 *
 * THE APPLICANT'S HALF OF THE SAME DTO the owner's inbox renders — `ProjectApplicationResponseDto`
 * carries both sides, so this reads the project title and drops the applicant identity, which is
 * the reader's own.
 *
 * STATUS IS THE POINT OF THE SCREEN, so it leads each row rather than trailing it. An application
 * is a thing you are waiting on; the only question a reader brings here is which ones are still
 * open, and that has to be answerable without reading the project titles.
 */
export function MyApplications() {
  const t = useT();
  const localeTag = useIntlLocale();
  const { data, isPending, isError, error } = useMyApplications();

  if (isPending) return <Skeleton lines={2} />;

  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('projects.mine.loadError'))}
      </p>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title={t('projects.mine.emptyTitle')}
        description={t('projects.mine.emptyDesc')}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((application) => (
        <li
          key={application.id}
          className="flex flex-col gap-[var(--nx-space-tight)] rounded-nx-md bg-nx-surface-card px-5 py-3"
        >
          <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
            <Badge
              variant={
                application.status === 'ACCEPTED'
                  ? 'success'
                  : application.status === 'REJECTED'
                    ? 'danger'
                    : 'neutral'
              }
            >
              {t(`projects.applicationStatus.${application.status ?? 'PENDING'}`)}
            </Badge>
            {application.createdAt && (
              <span className="text-nx-caption text-nx-text-muted">
                {formatDate(application.createdAt, localeTag)}
              </span>
            )}
          </div>

          <p className="text-nx-ui text-nx-text-primary">
            {/* The project is reachable, so its title is the link — an application row with no way
                back to what it is about would make the reader search for it by name. */}
            <Link
              href={`/projects/${application.projectId}`}
              className="font-medium hover:underline"
            >
              {application.projectTitle}
            </Link>
            {application.positionTitle && (
              <span className="text-nx-text-muted"> · {application.positionTitle}</span>
            )}
          </p>

          {application.message && (
            <p className="whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
              {application.message}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
