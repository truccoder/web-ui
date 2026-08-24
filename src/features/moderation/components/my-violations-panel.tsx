'use client';

import { useState } from 'react';
import { Badge, Button, Dialog, EmptyState, Skeleton, Textarea } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { Appeal, UserViolation } from '../types/moderation';
import { useMyAppeals, useMyViolations, useSubmitAppeal } from '../hooks/use-moderation';

/**
 * What moderation has decided about the signed-in account, and the one way to contest it.
 *
 * THE PRODUCT COULD PUNISH AND COULD NOT BE ARGUED WITH until this shipped. `AppealController` has
 * existed since the 2026-08-09 backend batch with no frontend surface, which meant a rejected post
 * — and the automatic seven-day ban that two rejections trigger — arrived with no explanation the
 * reader could see and no route to challenge it. That asymmetry is the reason this is worth
 * building even though most accounts will never open it.
 *
 * IT RENDERS NOTHING WHEN THERE IS NOTHING. A heading reading "Vi phạm của tôi" over an empty
 * space on a clean account is an accusation with no content; the section only appears once there
 * is something to show. The empty state is reserved for the case where a violation list has been
 * appealed away, not for the ordinary account that never had one.
 *
 * WHY THE APPEAL BUTTON DISAPPEARS RATHER THAN ERRORING. `appealPending` on the violation row is
 * the backend's own record that an appeal exists; submitting a second one is rejected server-side.
 * The row carries the reason, so the control simply is not offered.
 *
 * THE VIOLATION TYPE IS SHOWN AS THE BACKEND STORED IT, and that is worth knowing rather than
 * softening: `reviewPost` files EVERY rejection as `HATE_SPEECH` regardless of what the post did
 * (B22). So a spam removal reads as hate speech here. Rewriting the label on this side would hide
 * a backend defect behind a friendlier word, and the person reading it is exactly the person who
 * needs to see the discrepancy in order to appeal it.
 */
export function MyViolationsPanel() {
  const t = useT();
  const localeTag = useIntlLocale();
  const violations = useMyViolations();
  const appeals = useMyAppeals();

  const [appealing, setAppealing] = useState<UserViolation | null>(null);
  const [reason, setReason] = useState('');
  const submit = useSubmitAppeal();

  if (violations.isPending) return <Skeleton lines={2} />;

  if (violations.isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(violations.error, t('moderationMine.loadError'))}
      </p>
    );
  }

  const rows = violations.data ?? [];
  const appealRows = appeals.data ?? [];

  if (rows.length === 0 && appealRows.length === 0) {
    return (
      <EmptyState
        compact
        title={t('moderationMine.emptyTitle')}
        description={t('moderationMine.emptyDesc')}
      />
    );
  }

  const close = () => {
    setAppealing(null);
    setReason('');
  };

  return (
    <div className="flex flex-col gap-4">
      {rows.map((violation) => (
        <div
          key={violation.id}
          className="flex flex-col gap-[var(--nx-space-tight)] rounded-nx-md bg-nx-surface-card px-5 py-3"
        >
          <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
            {violation.violationType && (
              <Badge mono variant="danger">
                {violation.violationType}
              </Badge>
            )}
            {violation.severity && <Badge variant="neutral">{violation.severity}</Badge>}
            {violation.createdAt && (
              <span className="text-nx-caption text-nx-text-muted">
                {formatDate(violation.createdAt, localeTag)}
              </span>
            )}
          </div>

          {violation.description && (
            <p className="text-nx-body-sm text-nx-text-secondary">{violation.description}</p>
          )}

          <div className="flex items-center gap-2">
            {violation.appealPending ? (
              <span className="text-nx-caption text-nx-text-muted">
                {t('moderationMine.appealPending')}
              </span>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  submit.reset();
                  setReason('');
                  setAppealing(violation);
                }}
              >
                {t('moderationMine.appeal')}
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* THE DECIDED APPEALS, kept separate from the violations rather than folded into each row.
          An appeal has its own outcome and its own reviewer note, and a decision that says
          `Đã chấp nhận` under a violation that is still listed would read as a contradiction. */}
      {appealRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-nx-overline font-medium text-nx-text-muted">
            {t('moderationMine.appealsTitle')}
          </h3>
          {appealRows.map((appeal) => (
            <AppealRow key={appeal.id} appeal={appeal} localeTag={localeTag} />
          ))}
        </div>
      )}

      <Dialog
        open={appealing != null}
        onClose={close}
        width={560}
        title={t('moderationMine.appealTitle')}
        description={t('moderationMine.appealDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('moderationMine.cancel')}
            </Button>
            <Button
              loading={submit.isPending}
              // An empty appeal is the one thing a reviewer cannot act on, so the gate is the
              // reason having any content at all — not a length rule the server does not have.
              disabled={reason.trim().length === 0}
              onClick={() => {
                if (appealing?.id == null) return;
                submit.mutate(
                  { violationId: appealing.id, reason: reason.trim() },
                  { onSuccess: close }
                );
              }}
            >
              {t('moderationMine.submitAppeal')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {appealing?.description && (
            <p className="rounded-nx-sm bg-nx-surface-sunken px-3 py-2 text-nx-body-sm text-nx-text-secondary">
              {appealing.description}
            </p>
          )}
          <Textarea
            rows={5}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('moderationMine.reasonPlaceholder')}
            aria-label={t('moderationMine.reasonLabel')}
          />
          {submit.isError && (
            <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
              {getErrorMessage(submit.error, t('moderationMine.submitError'))}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}

const STATUS_VARIANT = {
  PENDING: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
} as const;

function AppealRow({ appeal, localeTag }: { appeal: Appeal; localeTag: string }) {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-tight)] rounded-nx-md bg-nx-surface-card px-5 py-3">
      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        {appeal.status && (
          <Badge variant={STATUS_VARIANT[appeal.status]}>
            {t(`moderationMine.status.${appeal.status}`)}
          </Badge>
        )}
        {appeal.createdAt && (
          <span className="text-nx-caption text-nx-text-muted">
            {formatDate(appeal.createdAt, localeTag)}
          </span>
        )}
      </div>

      {appeal.reason && <p className="text-nx-body-sm text-nx-text-secondary">{appeal.reason}</p>}

      {/* The reviewer's note is the only thing on this screen written by a person rather than by
          the classifier, so it is set apart rather than run together with your own words. */}
      {appeal.reviewerNote && (
        <p className="rounded-nx-sm bg-nx-surface-sunken px-3 py-2 text-nx-body-sm text-nx-text-primary">
          {appeal.reviewerNote}
        </p>
      )}
    </div>
  );
}
