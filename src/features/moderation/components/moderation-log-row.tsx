'use client';

import { Badge } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { ModerationLog } from '../types/moderation';

/**
 * One moderation log row, used by the post history timeline and by the log search.
 *
 * INTERNAL TO THIS FEATURE — not exported from the barrel. Two tabs render the same row, so it is
 * a file rather than a copy, but nothing outside `features/moderation` has any use for a log row
 * and exporting it would invite one.
 *
 * MACHINE ROWS AND HUMAN ROWS LOOK DIFFERENT BECAUSE THEY ARE DIFFERENT. The classifier writes
 * `textToxicityScore`/`imageSafeScore`/`ruleViolations` and leaves `reviewedAt` null; a human
 * review writes `reviewedAt` and `violationType` and leaves the scores null. So every score here
 * is rendered only when present — **an absent score is not a zero**, and "toxicity 0%" on a row
 * nobody scored would be a measurement this system never took.
 *
 * `showPostId` exists because the same row means different things in the two places: inside one
 * post's history the id is already known and repeating it is noise, while in the flat log search
 * it is the only thing identifying what the row is about.
 */
export interface ModerationLogRowProps {
  log: ModerationLog;
  showPostId?: boolean;
  className?: string;
}

/** A 0–1 score as a percentage. Only ever called with a non-null value. */
function toPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function ModerationLogRow({ log, showPostId = false, className }: ModerationLogRowProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  const hasScores = log.textToxicityScore !== null || log.imageSafeScore !== null;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {showPostId && (
          <span className="font-mono text-nx-caption text-nx-text-primary">#{log.postId}</span>
        )}

        <Badge variant={log.status === 'REJECTED' ? 'danger' : 'neutral'}>
          {t(`moderation.status.${log.status}`)}
        </Badge>

        {log.violationType && (
          <span className="text-nx-caption text-nx-status-danger-fg">
            {t(`moderation.violation.${log.violationType}`)}
          </span>
        )}

        {/* `reviewedAt` is null until someone (or something) acted, so the row falls back to when
            it was written. Both are `OffsetDateTime` and safe for `new Date()`. */}
        <span className="ml-auto text-nx-micro text-nx-text-muted">
          {relativeTime(log.reviewedAt ?? log.createdAt)}
        </span>
      </div>

      {hasScores && (
        <p className="text-nx-micro text-nx-text-muted">
          {log.textToxicityScore !== null &&
            `${t('moderation.log.toxicity')}: ${toPercent(log.textToxicityScore)}`}
          {log.textToxicityScore !== null && log.imageSafeScore !== null && ' · '}
          {log.imageSafeScore !== null &&
            `${t('moderation.log.imageUnsafe')}: ${toPercent(log.imageSafeScore)}`}
        </p>
      )}

      {log.ruleViolations && log.ruleViolations.length > 0 && (
        <p className="text-nx-micro text-nx-text-muted">{log.ruleViolations.join(', ')}</p>
      )}
    </div>
  );
}
