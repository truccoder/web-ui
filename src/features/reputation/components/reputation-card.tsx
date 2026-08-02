'use client';

import { ShieldCheck } from 'lucide-react';
import { Card, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useReputation } from '../hooks/use-reputation';
import { RepScore } from './rep-score';

/**
 * The profile-hero reputation surface: Elite Score chip, progress toward the next level,
 * and the Verified Expert marker.
 *
 * THE PROGRESS BAR NOW RUNS `currentLevelMin` → `nextLevelMin`, the band the user is actually
 * in. It used to run 0 → `nextLevelMin`, because the response carried no floor and CLAUDE.md §1
 * forbids writing the level table a third time on the frontend — so the only honest bar was one
 * measured from zero, which made a user just past a threshold look nearly finished. The backend
 * sends `currentLevelMin` now, so the floor comes off the response like everything else and the
 * three-way sync is untouched.
 *
 * `nextLevelMin` being absent is still the backend's "already at the top level" signal, not a
 * zero.
 *
 * Amber everywhere here is deliberate and in-bounds: this component *is* reputation
 * (constitution §1.3).
 */
export interface ReputationCardProps {
  /** Whose score to show. Undefined while the caller is still resolving it. */
  userId?: number;
}

function ReputationCardShell({ children }: { children: React.ReactNode }) {
  return (
    <Card padding={24} className="w-full">
      {children}
    </Card>
  );
}

export function ReputationCard({ userId }: ReputationCardProps) {
  const t = useT();
  const { data, isPending, isError, error } = useReputation(userId);

  if (isPending) {
    return (
      <ReputationCardShell>
        <div className="flex flex-col gap-4">
          <Skeleton width={90} height={12} />
          <Skeleton width={160} height={32} radius="var(--radius-nx-sm)" />
          <Skeleton width="100%" height={6} radius="var(--radius-nx-full)" />
        </div>
      </ReputationCardShell>
    );
  }

  if (isError) {
    return (
      <ReputationCardShell>
        <p
          role="alert"
          className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
        >
          {getErrorMessage(error)}
        </p>
      </ReputationCardShell>
    );
  }

  const { eliteScore, levelName, currentLevelMin, nextLevelMin, verifiedExpert } = data;
  const isTopLevel = nextLevelMin === undefined || nextLevelMin === null;
  const remaining = isTopLevel ? 0 : Math.max(0, nextLevelMin - eliteScore);

  // The band, not the distance from zero. `NEWCOMER` has a floor of 0, so the first level is
  // unchanged; every level above it now fills from its own threshold. The `<= floor` guard is
  // for the one case arithmetic cannot survive — a malformed pair where the two thresholds meet
  // would divide by zero — rather than for anything the enum can currently produce.
  const floor = currentLevelMin ?? 0;
  const progress = isTopLevel
    ? 100
    : nextLevelMin <= floor
      ? 100
      : Math.min(100, Math.max(0, ((eliteScore - floor) / (nextLevelMin - floor)) * 100));

  return (
    <ReputationCardShell>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-nx-heading font-semibold text-nx-text-primary">
            {t('reputation.title')}
          </h3>
          <p className="text-nx-body-sm text-nx-text-muted">{t('reputation.desc')}</p>
        </div>
        {verifiedExpert && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-nx-sm border border-nx-rep-border bg-nx-rep-soft px-2 py-1 text-nx-caption font-medium text-nx-rep-text">
            <ShieldCheck className="size-3.5" aria-hidden />
            {t('reputation.verifiedExpert')}
          </span>
        )}
      </div>

      <RepScore score={eliteScore} size="lg" showLevel levelName={levelName} />

      <div className="mt-4">
        <div
          className="h-1.5 w-full overflow-hidden rounded-nx-full bg-nx-surface-sunken"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('reputation.title')}
        >
          <div className="h-full rounded-nx-full bg-nx-rep" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-nx-caption text-nx-text-muted">
          {isTopLevel
            ? t('reputation.topLevel')
            : t('reputation.toNextLevel', {
                remaining: remaining.toLocaleString('en-US'),
                next: nextLevelMin.toLocaleString('en-US'),
              })}
        </p>
      </div>
    </ReputationCardShell>
  );
}
