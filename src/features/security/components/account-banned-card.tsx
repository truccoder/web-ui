'use client';

import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/shared/components';
import { formatDateTime, useIntlLocale } from '@/shared/lib/format';
import { getBanDetails } from '@/shared/lib/api-error';
import { useBanCountdown } from '@/features/moderation';
import { useT } from '@/core/i18n';
import { AuthCard } from './auth-card';

/**
 * The login-403 ban screen (Plate 01). Replaces `LoginError`'s compact inline box for this one
 * case: a seven-day lockout with a violation type and a reason is a full screen's worth of
 * information, not a red strip above a form the reader cannot use anyway.
 *
 * NO APPEAL LINK, and the reason is a real gap: `/moderation` is behind the session gate, and a
 * banned account has no session — the middleware would bounce the link straight back to `/login`.
 * The backend keeps the two appeal endpoints reachable while banned, but there is no logged-out
 * surface for them yet. Until there is, this screen informs and counts down; once the ban lifts,
 * `expired` flips and it offers a retry.
 *
 * THE VIOLATION TYPE IS SHOWN RAW. `reviewPost` files every rejection as `HATE_SPEECH` regardless
 * (B22) — the same note `MyViolationsPanel` carries. Softening it here would hide the discrepancy
 * from the person who needs it to appeal.
 */
export interface AccountBannedCardProps {
  /** The login error carrying `banDetails`. */
  error: unknown;
  /** Let the reader try signing in again — wired once the countdown has expired. */
  onRetry?: () => void;
}

export function AccountBannedCard({ error, onRetry }: AccountBannedCardProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const ban = getBanDetails(error);
  const { remaining, expired } = useBanCountdown(ban?.bannedUntil);

  const until = formatDateTime(ban?.bannedUntil, localeTag);

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="size-8 text-nx-status-danger-fg" aria-hidden />
        <h1 className="text-nx-title font-semibold text-nx-text-primary">
          {until ? t('auth.login.banned.title', { until }) : t('auth.login.banned.titleNoTime')}
        </h1>
        {remaining && (
          <p className="text-nx-body-sm text-nx-text-secondary">
            {t('auth.login.banned.remaining', { remaining })}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-nx-sm bg-nx-surface-sunken px-4 py-3">
        {ban?.violationType && (
          <div className="flex items-center gap-2">
            <span className="text-nx-caption text-nx-text-muted">
              {t('auth.login.banned.violationType')}
            </span>
            <Badge mono variant="danger">
              {ban.violationType}
            </Badge>
          </div>
        )}
        {ban?.reason && (
          <div className="flex flex-col gap-1">
            <span className="text-nx-caption text-nx-text-muted">
              {t('auth.login.banned.reason')}
            </span>
            <p className="text-nx-body-sm text-nx-text-secondary">{ban.reason}</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-nx-caption text-nx-text-muted">{t('auth.login.banned.appealHint')}</p>

      {expired && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-nx-body-sm font-medium text-nx-text-link hover:text-nx-text-link-hover"
        >
          {t('auth.login.banned.retry')}
        </button>
      )}
    </AuthCard>
  );
}
