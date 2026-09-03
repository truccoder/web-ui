'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  ApiErrorNotice,
  Badge,
  Button,
  ButtonLink,
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
 * THE VIOLATION TYPE IS TRANSLATED NOW, AND THAT REVERSES AN EARLIER DECISION HERE. It used to be
 * printed as the raw enum on purpose: `reviewPost` filed EVERY rejection as `HATE_SPEECH` whatever
 * the post did, and softening the label would have hidden that defect behind a friendlier word
 * from the one person who needed to see the discrepancy in order to appeal it.
 *
 * The backend now requires the moderator to choose the type per decision, and this screen's own
 * queue asks for it (`ModerationPostsTab`), so the stored value is a real claim about this post
 * rather than a constant. A real claim is worth reading in words: `SPAM` and `LOW` in a monospace
 * badge are database values, and this panel is where someone finds out why they were sanctioned.
 *
 * IT LINKS TO THE POST THE CLAIM IS ABOUT. `UserViolationDto` carries `postId`, and the reader is
 * its author, so `/posts/{postId}` shows them their own post whatever its moderation status
 * (`PostVisibilityService` only 404s an uncleared post to everyone ELSE). Someone deciding whether
 * to appeal needs to reread what they wrote; the link is in the row and again in the appeal
 * dialog, next to the reason they are contesting. Same handoff `ModerationReportsTab` makes for
 * the admin side — a pointer at a post is shown as a way to open the post, not faked into a card.
 *
 * `postId` CAN GO NULL AFTER THE FACT, AND THAT IS THE FK, NOT A BUG. `t_user_violations.post_id`
 * is `ON DELETE SET NULL` (V9): deleting the flagged post clears the pointer on every violation row
 * that named it, and the link above simply stops rendering — with nothing left telling the reader
 * which post it used to be. `postExcerpt` (V106) is the fix: a snapshot of the post's text taken at
 * the moment the violation was recorded, independent of whether the row it points at still exists.
 * It is optional on the DTO because it is not backfilled — a row written before V106, or through a
 * call site still on the old 4-arg `recordViolation` overload, carries none — so the quote below
 * renders only when one is present rather than assuming every row has it.
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
            {/* TRANSLATED, NOT THE RAW ENUM. This panel is read by the person the violation is
                recorded against, and it used to show them `SPAM` and `LOW` — database constants,
                in a monospace badge, as the explanation for a sanction. The labels already
                existed for the moderator's own log rows (`moderation.violation.*`); the severity
                ones are new. The `mono` treatment goes with the enum it was styling. */}
            {violation.violationType && (
              <Badge variant="danger">{t(`moderation.violation.${violation.violationType}`)}</Badge>
            )}
            {violation.severity && (
              <Badge variant="neutral">{t(`moderation.severity.${violation.severity}`)}</Badge>
            )}
            {violation.createdAt && (
              <span className="text-nx-caption text-nx-text-muted">
                {formatDate(violation.createdAt, localeTag)}
              </span>
            )}
          </div>

          {violation.postExcerpt && (
            <p className="line-clamp-3 border-l-2 border-nx-border-default pl-3 text-nx-body-sm text-nx-text-secondary">
              {violation.postExcerpt}
            </p>
          )}

          {violation.description && (
            <p className="text-nx-body-sm text-nx-text-secondary">
              <span className="font-medium text-nx-text-primary">
                {t('moderationMine.violationReason')}
              </span>{' '}
              {violation.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {violation.postId != null ? (
              <ButtonLink
                href={`/posts/${violation.postId}`}
                size="sm"
                variant="ghost"
                icon={<ExternalLink className="size-4" aria-hidden />}
              >
                {t('moderationMine.viewPost')}
              </ButtonLink>
            ) : (
              violation.postExcerpt && (
                <span className="text-nx-caption text-nx-text-muted">
                  {t('moderationMine.postDeleted')}
                </span>
              )
            )}
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
          {appealing?.postExcerpt && (
            <p className="border-l-2 border-nx-border-default pl-3 text-nx-body-sm text-nx-text-secondary">
              {appealing.postExcerpt}
            </p>
          )}
          {appealing?.description && (
            <p className="rounded-nx-sm bg-nx-surface-sunken px-3 py-2 text-nx-body-sm text-nx-text-secondary">
              <span className="font-medium text-nx-text-primary">
                {t('moderationMine.violationReason')}
              </span>{' '}
              {appealing.description}
            </p>
          )}
          {appealing?.postId != null ? (
            <ButtonLink
              href={`/posts/${appealing.postId}`}
              size="sm"
              variant="secondary"
              icon={<ExternalLink className="size-4" aria-hidden />}
              className="w-fit"
            >
              {t('moderationMine.viewPost')}
            </ButtonLink>
          ) : (
            appealing?.postExcerpt && (
              <span className="text-nx-caption text-nx-text-muted">
                {t('moderationMine.postDeleted')}
              </span>
            )
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
