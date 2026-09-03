'use client';

import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, Dialog, Textarea } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { ProjectPosition } from '../types/matchmaking';
import { useApplyToPosition } from '../hooks/use-matchmaking';
import { JobDescriptionDialog } from './job-description-dialog';

/**
 * One role on a project, as a self-contained horizontal card — `project-detail.tsx` lays a row of
 * these in a scroll strip on mobile and a 2–3 column grid from `lg`.
 *
 * READING ORDER, top to bottom: name (the card heading), a status + headcount badge, the level and
 * "≥ N years" chips when set, the skill chips, the first few lines of `roleSummary` (clamped so a
 * long summary cannot stretch the card past its neighbours), then the button row pinned to the
 * bottom with `mt-auto` so every card's actions line up.
 *
 * "Xem mô tả công việc" SHOWS ONLY WHEN `hasJobDescription`. A role created before `V105` has no JD
 * content, and the button would open a near-blank PDF — `hasJobDescription` is the backend's
 * computed "there is enough to render", not "a file exists yet" (the PDF is built on first read).
 */
export interface PositionCardProps {
  position: ProjectPosition;
  /** Whether the viewer may apply — false for the owner and for a non-`OPEN` project. */
  canApply: boolean;
  /** The owner's edit / status / delete row, plus the candidate match, rendered below the card. */
  ownerControls?: ReactNode;
}

export function PositionCard({ position, canApply, ownerControls }: PositionCardProps) {
  const t = useT();
  const [applyOpen, setApplyOpen] = useState(false);
  const [jdOpen, setJdOpen] = useState(false);
  const [message, setMessage] = useState('');
  const apply = useApplyToPosition();

  const status = position.status ?? 'OPEN';
  const isOpen = status === 'OPEN';
  const title = position.title ?? '';
  const quantity = position.quantity ?? 1;
  const skills = position.requiredSkills ?? [];

  const statusLabel =
    quantity > 1
      ? `${t(`projects.positionStatus.${status}`)} · ${t('projects.quantity', { count: quantity })}`
      : t(`projects.positionStatus.${status}`);

  return (
    <Card bordered className="flex h-full flex-col gap-[var(--nx-space-tight)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-nx-ui font-medium text-nx-text-primary">{title}</h3>
        <Badge variant={isOpen ? 'accent' : 'neutral'}>{statusLabel}</Badge>
      </div>

      {(position.seniorityLevel || position.minYearsExperience != null) && (
        <div className="flex flex-wrap gap-[var(--nx-space-pair)]">
          {position.seniorityLevel && (
            <Badge variant="neutral">{t(`knowledge.seniority.${position.seniorityLevel}`)}</Badge>
          )}
          {position.minYearsExperience != null && (
            <Badge variant="neutral">
              {t('projects.card.minYears', { count: position.minYearsExperience })}
            </Badge>
          )}
        </div>
      )}

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-[var(--nx-space-pair)]">
          {skills.slice(0, 6).map((skill) => (
            <Badge key={skill} variant="accent">
              {skill}
            </Badge>
          ))}
          {skills.length > 6 && (
            <span className="text-nx-caption text-nx-text-faint">+{skills.length - 6}</span>
          )}
        </div>
      )}

      {position.roleSummary && (
        <p className="line-clamp-3 whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
          {position.roleSummary}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-[var(--nx-space-pair)] pt-[var(--nx-space-pair)]">
        {canApply && isOpen && (
          <Button
            size="sm"
            aria-label={t('projects.applyAria', { title })}
            onClick={() => {
              apply.reset();
              setMessage('');
              setApplyOpen(true);
            }}
          >
            {t('projects.apply')}
          </Button>
        )}
        {position.hasJobDescription && position.id != null && (
          <Button
            size="sm"
            variant="secondary"
            aria-label={t('projects.jd.viewAria', { title })}
            onClick={() => setJdOpen(true)}
          >
            {t('projects.jd.view')}
          </Button>
        )}
      </div>

      {ownerControls}

      {position.id != null && (
        <JobDescriptionDialog
          positionId={position.id}
          positionTitle={title}
          open={jdOpen}
          onClose={() => setJdOpen(false)}
        />
      )}

      <Dialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        width={560}
        title={t('projects.applyTitle', { title })}
        description={t('projects.applyDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>
              {t('projects.cancel')}
            </Button>
            <Button
              loading={apply.isPending}
              disabled={message.trim().length === 0}
              onClick={() => {
                if (position.id == null) return;
                apply.mutate(
                  { positionId: position.id, payload: { message: message.trim() } },
                  { onSuccess: () => setApplyOpen(false) }
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
