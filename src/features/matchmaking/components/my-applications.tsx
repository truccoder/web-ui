'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Dialog, EmptyState, Skeleton, toast } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { ProjectApplication } from '../types/matchmaking';
import { useMyApplications, useWithdrawApplication } from '../hooks/use-matchmaking';

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
        <li key={application.id}>
          <ApplicationRow application={application} />
        </li>
      ))}
    </ul>
  );
}

/**
 * WITHDRAW IS ONLY OFFERED WHILE `PENDING`. `DELETE /projects/applications/{id}` answers 409 once
 * the owner has accepted or rejected — the decision is final from the applicant's side — so a
 * button in those states would exist only to produce that error. It is behind a confirm because a
 * withdrawn application is hard-deleted and cannot be resent as the same row.
 */
function ApplicationRow({ application }: { application: ProjectApplication }) {
  const t = useT();
  const localeTag = useIntlLocale();
  const [confirm, setConfirm] = useState(false);
  const withdraw = useWithdrawApplication();

  const status = application.status ?? 'PENDING';
  const canWithdraw = status === 'PENDING';

  return (
    // `Card` rather than a hand-rolled `rounded-nx-md bg-nx-surface-card` div — this is the same
    // kind of object as `ProjectCard` beside it in `project-list.tsx` (one project, summarised),
    // so it takes the same padding/radius/fill from the shared component instead of a copy that
    // drifts the moment `Card`'s own styling changes.
    <Card className="flex flex-col gap-[var(--nx-space-tight)]">
      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        <Badge
          variant={
            status === 'ACCEPTED'
              ? 'success'
              : status === 'REJECTED' || status === 'REMOVED'
                ? 'danger'
                : 'neutral'
          }
        >
          {t(`projects.applicationStatus.${status}`)}
        </Badge>
        {application.createdAt && (
          <span className="text-nx-caption text-nx-text-muted">
            {formatDate(application.createdAt, localeTag)}
          </span>
        )}
        {canWithdraw && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            loading={withdraw.isPending}
            onClick={() => {
              withdraw.reset();
              setConfirm(true);
            }}
          >
            {t('projects.manage.withdraw')}
          </Button>
        )}
      </div>

      <p className="text-nx-ui text-nx-text-primary">
        {/* The project is reachable, so its title is the link — an application row with no way
            back to what it is about would make the reader search for it by name. */}
        <Link href={`/projects/${application.projectId}`} className="font-medium hover:underline">
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

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('projects.manage.withdrawConfirmTitle')}
        description={t('projects.manage.withdrawConfirmDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={withdraw.isPending}
              onClick={() => {
                if (application.id == null) return;
                withdraw.mutate(application.id, {
                  onSuccess: () => setConfirm(false),
                  onError: (error) =>
                    toast.error(getErrorMessage(error, t('projects.manage.withdrawError'))),
                });
              }}
            >
              {t('projects.manage.withdraw')}
            </Button>
          </>
        }
      >
        {withdraw.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(withdraw.error, t('projects.manage.withdrawError'))}
          </p>
        )}
      </Dialog>
    </Card>
  );
}
