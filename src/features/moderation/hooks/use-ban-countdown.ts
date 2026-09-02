'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/core/i18n';

/**
 * The "banned until" countdown, shared by the shell banner (`AccountBanBanner`) and the login
 * ban screen (`AccountBannedCard`).
 *
 * IT RE-RENDERS ONCE A MINUTE. A seven-day ban does not need second precision, and a per-second
 * interval on a screen someone leaves open is wasted work. `expired` flips when the clock passes
 * `bannedUntil`, which is the signal a caller uses to offer "try again" instead of the countdown.
 *
 * The copy keys are `moderation.banBanner.remaining*` — reused rather than duplicated, because the
 * phrase "2 days, 4 hours left" is the same phrase wherever the ban is shown.
 */
export interface BanCountdown {
  /** A localised "N days, M hours left" string, or `null` once the ban has lifted or no date was given. */
  remaining: string | null;
  /** True once `bannedUntil` is in the past (or was absent). */
  expired: boolean;
}

export function useBanCountdown(bannedUntil: string | undefined): BanCountdown {
  const t = useT();
  // The clock is read once on mount (lazy initialiser) and then advanced by the interval — never
  // during render, which `react-hooks/purity` forbids.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!bannedUntil) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [bannedUntil]);

  if (!bannedUntil) return { remaining: null, expired: true };

  const ms = new Date(bannedUntil).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return { remaining: null, expired: true };

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const remaining =
    days > 0
      ? t('moderation.banBanner.remainingDays', { days, hours })
      : hours > 0
        ? t('moderation.banBanner.remainingHours', { hours, minutes })
        : t('moderation.banBanner.remainingMinutes', { minutes });

  return { remaining, expired: false };
}
