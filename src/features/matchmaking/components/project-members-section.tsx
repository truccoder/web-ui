'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, Button, Dialog, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { ProjectMember } from '../types/matchmaking';
import { useProjectMembers, useRemoveMember } from '../hooks/use-matchmaking';

/**
 * The team roster — `GET /v1/api/projects/{id}/members`, built from `ACCEPTED` applications.
 *
 * SHOWN TO EVERYONE, not just the owner: a project's detail page should say who is on it. The
 * owner additionally gets a remove control per member.
 *
 * REMOVING IS PER-PERSON, NOT PER-SEAT. The backend takes a member off EVERY position they hold in
 * one call — each application becomes `REMOVED`, their `PROJECT_APPLICATION_ACCEPTED` reputation is
 * revoked, and a freed seat reopens a `FILLED` role — so the confirm says that rather than
 * implying it only touches the row shown. A person holding two roles appears twice here (one row
 * per position); removing from either row removes them from both.
 */
export interface ProjectMembersSectionProps {
  projectId: number;
  isOwner: boolean;
}

export function ProjectMembersSection({ projectId, isOwner }: ProjectMembersSectionProps) {
  const t = useT();
  const { data, isPending, isError, error } = useProjectMembers(projectId);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-nx-title-sm text-nx-text-primary">{t('projects.manage.members')}</h2>

      {isPending ? (
        <Skeleton lines={2} />
      ) : isError ? (
        <p className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(error, t('projects.manage.membersError'))}
        </p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState compact title={t('projects.manage.noMembers')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((member) => (
            <li key={`${member.applicationId}-${member.positionId}`}>
              <MemberRow member={member} projectId={projectId} isOwner={isOwner} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MemberRow({
  member,
  projectId,
  isOwner,
}: {
  member: ProjectMember;
  projectId: number;
  isOwner: boolean;
}) {
  const t = useT();
  const localeTag = useIntlLocale();
  const [confirm, setConfirm] = useState(false);
  const remove = useRemoveMember();

  const name = member.fullName?.trim() || member.username || t('projects.manage.unknownMember');
  const href = member.username ? `/u/${encodeURIComponent(member.username)}` : undefined;

  const avatar = <Avatar src={member.profilePictureUrl} name={name} size="md" />;

  return (
    <div className="flex items-center gap-3 rounded-nx-md bg-nx-surface-card px-5 py-3">
      {href ? (
        <Link href={href} className="shrink-0 rounded-nx-full">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="block truncate text-nx-ui font-medium text-nx-text-primary hover:underline"
          >
            {name}
          </Link>
        ) : (
          <p className="truncate text-nx-ui font-medium text-nx-text-primary">{name}</p>
        )}
        <p className="truncate text-nx-caption text-nx-text-muted">
          {member.positionTitle}
          {member.joinedAt && ` · ${formatDate(member.joinedAt, localeTag)}`}
        </p>
      </div>

      {isOwner && (
        <Button
          size="sm"
          variant="secondary"
          loading={remove.isPending}
          onClick={() => {
            remove.reset();
            setConfirm(true);
          }}
        >
          {t('projects.manage.removeMember')}
        </Button>
      )}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('projects.manage.removeMemberConfirmTitle', { name })}
        description={t('projects.manage.removeMemberConfirmDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => {
                if (member.userId == null) return;
                remove.mutate(
                  { projectId, userId: member.userId },
                  { onSuccess: () => setConfirm(false) }
                );
              }}
            >
              {t('projects.manage.removeMember')}
            </Button>
          </>
        }
      >
        {remove.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(remove.error, t('projects.manage.removeMemberError'))}
          </p>
        )}
      </Dialog>
    </div>
  );
}
