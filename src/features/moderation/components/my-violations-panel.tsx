'use client';

import { useState } from 'react';
import {
  ApiErrorNotice,
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
import type { UserViolation } from '../types/moderation';
import { useMyViolations, useSubmitAppeal } from '../hooks/use-moderation';

/**
 * What moderation has recorded against the signed-in account, and the one way to contest it.
 *
 * THE PRODUCT COULD PUNISH AND COULD NOT BE ARGUED WITH until this shipped. `AppealController` has
 * existed since the 2026-08-09 backend batch with no frontend surface, which meant a rejected post
 * — and the automatic seven-day ban that two rejections trigger — arrived with no explanation the
 * reader could see and no route to challenge it.
 *
 * THE APPEALS TIMELINE MOVED OUT to `MyAppealsPanel` when `/moderation` became a two-tab route.
 * This panel is the `Vi phạm của tôi` tab; that one is `Kháng cáo`. A violation and the outcome of
 * appealing it are two states — a decision reading "accepted" under a violation still listed reads
 * as a contradiction — and a tab each is the cleaner split than the old stacked sections.
 *
 * WHY THE APPEAL BUTTON DISAPPEARS RATHER THAN ERRORING. `appealPending` on the violation row is
 * the backend's own record that an appeal exists; submitting a second one is rejected server-side.
 *
 * THE VIOLATION TYPE IS SHOWN AS THE BACKEND STORED IT, and that is worth knowing rather than
 * softening: `reviewPost` files EVERY rejection as `HATE_SPEECH` regardless of what the post did
 * (B22). Rewriting the label here would hide a backend defect behind a friendlier word from the
 * one person who needs to see the discrepancy to appeal it.
 */
export function MyViolationsPanel() {
  const t = useT();
  const localeTag = useIntlLocale();
  const violations = useMyViolations();

  const [appealing, setAppealing] = useState<UserViolation | null>(null);
  const [reason, setReason] = useState('');
  const submit = useSubmitAppeal();

  if (violations.isPending) {
    return (
      <Card>
        <Skeleton lines={2} />
      </Card>
    );
  }

  if (violations.isError) {
    return <ApiErrorNotice error={violations.error} onRetry={() => violations.refetch()} />;
  }

  const rows = violations.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
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
