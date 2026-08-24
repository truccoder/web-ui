'use client';

import { useState } from 'react';
import { Button, Dialog, Radio, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useReportPost } from '../hooks/use-moderation';
import type { ReportReason } from '../types/moderation';

/**
 * Report a post to the moderation queue.
 *
 * THIS WAS THE MISSING HALF OF MODERATION. The queue could only ever be filled by the AI
 * classifier: there was no user-facing report endpoint, so someone who saw spam had nowhere to
 * put it, while the appeal path — the same conversation running the other way — had shipped long
 * before. B11 added the endpoint; this is the surface.
 *
 * REASON IS A RADIO GROUP, NOT A SELECT. Seven options, all of them short, and the choice is the
 * whole content of the dialog rather than one field among several — so they are laid out to be
 * read and compared, not hidden behind a control that shows one at a time.
 *
 * THE CONFIRMATION PROMISES NOTHING. `PostReportReceiptDto` is a single `reported` boolean: the
 * report was recorded. Whether anything happens to the post depends on a threshold the reporter
 * cannot see, so the closing message says the report was sent and stops there. "This post will be
 * reviewed" would be a claim this screen has no way to keep.
 */
const REASONS: ReportReason[] = [
  'SPAM',
  'HARASSMENT',
  'HATE_SPEECH',
  'ADULT_CONTENT',
  'VIOLENCE',
  'MISINFORMATION',
  'OTHER',
];

export interface ReportPostDialogProps {
  postId: number;
  open: boolean;
  onClose: () => void;
}

export function ReportPostDialog({ postId, open, onClose }: ReportPostDialogProps) {
  const t = useT();
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);

  const report = useReportPost({ onSuccess: () => setSent(true) });

  const close = () => {
    onClose();
    // Reset after the dialog is gone, so the reader never watches the form empty itself.
    setTimeout(() => {
      setSent(false);
      setReason('SPAM');
      setDetails('');
      report.reset();
    }, 200);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      width={520}
      title={sent ? t('moderation.report.sentTitle') : t('moderation.report.title')}
      description={sent ? undefined : t('moderation.report.description')}
      footer={
        sent ? (
          <Button onClick={close}>{t('moderation.report.done')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              {t('moderation.report.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={report.isPending}
              onClick={() =>
                report.mutate({ postId, reason, details: details.trim() || undefined })
              }
            >
              {t('moderation.report.submit')}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <p className="text-nx-body-sm text-nx-text-secondary">{t('moderation.report.sentBody')}</p>
      ) : (
        <div className="flex flex-col gap-[var(--nx-space-element)]">
          <div
            role="radiogroup"
            aria-label={t('moderation.report.reasonLabel')}
            className="flex flex-col gap-[var(--nx-space-tight)]"
          >
            {REASONS.map((option) => (
              <Radio
                key={option}
                name="report-reason"
                label={t(`moderation.report.reason.${option}`)}
                checked={reason === option}
                onChange={() => setReason(option)}
              />
            ))}
          </div>

          <Textarea
            label={t('moderation.report.detailsLabel')}
            placeholder={t('moderation.report.detailsPlaceholder')}
            rows={3}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />

          {report.isError && (
            <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
              {getErrorMessage(report.error, t('moderation.report.failed'))}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
