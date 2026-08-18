'use client';

import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Skeleton,
  Textarea,
} from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { ProjectApplication, ProjectPosition } from '../types/matchmaking';
import {
  useAcceptApplication,
  useApplyToPosition,
  useProject,
  useProjectApplications,
  useRejectApplication,
} from '../hooks/use-matchmaking';

/**
 * One project: what it is, which roles are open, and — if you own it — who has asked to join.
 *
 * TWO AUDIENCES, ONE SCREEN, SPLIT BY `authorId`. A visitor sees the roles and an `Ứng tuyển`
 * button; the owner sees the same roles plus the application inbox. The split is computed from the
 * project's own `authorId` rather than discovered by calling the inbox: that endpoint answers
 * **403** to everyone else, so probing it would put a guaranteed error in every visitor's console
 * and would be using an authorization failure as a feature detector.
 *
 * THE OWNER DOES NOT GET AN APPLY BUTTON. Nothing server-side forbids applying to your own
 * project, which is exactly why the control is withheld here — the honest reason is that it makes
 * no sense, not that it fails.
 */
export interface ProjectDetailProps {
  projectId: number;
  /** The signed-in account, for the owner split. Undefined while the profile is in flight. */
  viewerId?: number;
}

export function ProjectDetail({ projectId, viewerId }: ProjectDetailProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const { data: project, isPending, isError, error } = useProject(projectId);

  const isOwner = viewerId != null && project?.authorId === viewerId;
  const applications = useProjectApplications(projectId, isOwner);

  if (isPending) {
    return (
      <Card>
        <Skeleton lines={4} />
      </Card>
    );
  }

  if (isError || !project) {
    return (
      <EmptyState
        title={t('projects.detail.notFoundTitle')}
        description={getErrorMessage(error, t('projects.detail.notFoundDesc'))}
      />
    );
  }

  const positions = project.positions ?? [];

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Card className="flex flex-col gap-[var(--nx-space-group)]">
        <div className="flex items-start gap-3">
          <Avatar src={project.authorProfilePictureUrl} name={project.authorFullName} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
              {project.title}
            </h1>
            <p className="text-nx-caption text-nx-text-muted">
              {project.authorFullName}
              {project.createdAt && ` · ${formatDate(project.createdAt, localeTag)}`}
            </p>
          </div>
          {project.status === 'CLOSED' && (
            <Badge variant="neutral">{t('projects.status.CLOSED')}</Badge>
          )}
        </div>

        {project.description && (
          <p className="whitespace-pre-wrap text-nx-body text-nx-text-primary">
            {project.description}
          </p>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-nx-title-sm text-nx-text-primary">{t('projects.detail.positions')}</h2>

        {positions.length === 0 ? (
          // A project with no roles is a real state the API allows: `positions` is optional on the
          // create request. It is not an error and does not read as one.
          <EmptyState compact title={t('projects.detail.noPositions')} />
        ) : (
          <ul className="flex flex-col gap-[var(--nx-space-block)]">
            {positions.map((position) => (
              <li key={position.id}>
                <PositionCard position={position} canApply={!isOwner} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-3">
          <h2 className="text-nx-title-sm text-nx-text-primary">
            {t('projects.detail.applications')}
          </h2>
          <OwnerInbox
            applications={applications.data}
            isPending={applications.isPending}
            isError={applications.isError}
            error={applications.error}
          />
        </section>
      )}
    </div>
  );
}

function PositionCard({ position, canApply }: { position: ProjectPosition; canApply: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const apply = useApplyToPosition();

  const isOpen = position.status === 'OPEN';

  return (
    <Card className="flex flex-col gap-[var(--nx-space-tight)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-nx-ui font-medium text-nx-text-primary">{position.title}</p>
          {position.description && (
            <p className="mt-0.5 whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
              {position.description}
            </p>
          )}
        </div>

        {/* The button is only offered on an open role. A filled one says so instead — the API
            refuses the call with "Position is not open for applications", and a button that
            exists to produce that error is a trap. */}
        {canApply && isOpen ? (
          <Button
            size="sm"
            onClick={() => {
              apply.reset();
              setMessage('');
              setOpen(true);
            }}
          >
            {t('projects.apply')}
          </Button>
        ) : (
          <Badge variant="neutral">
            {t(`projects.positionStatus.${position.status ?? 'OPEN'}`)}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        {position.quantity != null && position.quantity > 1 && (
          <span className="text-nx-caption text-nx-text-muted">
            {t('projects.quantity', { count: position.quantity })}
          </span>
        )}
        {position.requiredSkills?.map((skill) => (
          <Badge key={skill} variant="accent">
            {skill}
          </Badge>
        ))}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        title={t('projects.applyTitle', { title: position.title ?? '' })}
        description={t('projects.applyDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              loading={apply.isPending}
              // The server accepts an empty message — `ApplicationRequestDTO.message` carries no
              // validation at all — so this gate is the product's, not the API's. An application
              // with nothing in it gives the owner nothing to decide on.
              disabled={message.trim().length === 0}
              onClick={() => {
                if (position.id == null) return;
                apply.mutate(
                  { positionId: position.id, payload: { message: message.trim() } },
                  { onSuccess: () => setOpen(false) }
                );
              }}
            >
              {t('projects.submitApplication')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('projects.messagePlaceholder')}
            aria-label={t('projects.messageLabel')}
          />
          {apply.isError && (
            <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
              {getErrorMessage(apply.error, t('projects.applyError'))}
            </p>
          )}
        </div>
      </Dialog>
    </Card>
  );
}

/**
 * The owner's inbox.
 *
 * ACCEPT CAN FAIL WITHOUT ANYONE DOING ANYTHING WRONG. The position row is locked per transaction,
 * so a concurrent accept that fills the last slot makes this one refuse — the error is shown
 * rather than swallowed, and the list refetches either way because the same action can flip the
 * position to `FILLED`.
 */
function OwnerInbox({
  applications,
  isPending,
  isError,
  error,
}: {
  applications?: ProjectApplication[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
}) {
  const t = useT();
  const localeTag = useIntlLocale();
  const accept = useAcceptApplication();
  const reject = useRejectApplication();

  if (isPending) return <Skeleton lines={2} />;

  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('projects.detail.applicationsError'))}
      </p>
    );
  }

  const rows = applications ?? [];
  if (rows.length === 0) {
    return <EmptyState compact title={t('projects.detail.noApplications')} />;
  }

  const busy = accept.isPending || reject.isPending;

  return (
    <div className="flex flex-col gap-4">
      {(accept.isError || reject.isError) && (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
          {getErrorMessage(accept.error ?? reject.error, t('projects.decisionError'))}
        </p>
      )}

      {rows.map((application) => (
        <div
          key={application.id}
          className="flex flex-col gap-[var(--nx-space-tight)] rounded-nx-md bg-nx-surface-card px-5 py-3"
        >
          <div className="flex items-center gap-3">
            <Avatar
              src={application.applicantProfilePictureUrl}
              name={application.applicantFullName}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-nx-ui font-medium text-nx-text-primary">
                {application.applicantFullName}
              </p>
              <p className="truncate text-nx-caption text-nx-text-muted">
                {application.positionTitle}
                {application.createdAt && ` · ${formatDate(application.createdAt, localeTag)}`}
              </p>
            </div>

            {application.status === 'PENDING' ? (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => application.id != null && accept.mutate(application.id)}
                >
                  {t('projects.accept')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => application.id != null && reject.mutate(application.id)}
                >
                  {t('projects.reject')}
                </Button>
              </div>
            ) : (
              <Badge variant={application.status === 'ACCEPTED' ? 'success' : 'neutral'}>
                {t(`projects.applicationStatus.${application.status ?? 'PENDING'}`)}
              </Badge>
            )}
          </div>

          {application.message && (
            <p className="whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
              {application.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
