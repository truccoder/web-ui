'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { onAccountBanned, type AccountBanInfo } from '@/core/api/axios';
import { useT } from '@/core/i18n';

/**
 * A sticky banner that appears the moment a request comes back 403 with a ban attached
 * (`core/api/axios`'s `onAccountBanned`). A ban can land mid-session — a moderator rejecting a
 * second post auto-bans the author — and without this the reader just sees writes start failing
 * with a generic error.
 *
 * Mounted once in the `(main)` shell. It counts down to `bannedUntil` and links to the page
 * where the violation and the appeal form live.
 */
function formatRemaining(untilIso: string | undefined, t: ReturnType<typeof useT>): string | null {
  if (!untilIso) return null;
  const ms = new Date(untilIso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return t('moderation.banBanner.remainingDays', { days, hours });
  if (hours > 0) return t('moderation.banBanner.remainingHours', { hours, minutes });
  return t('moderation.banBanner.remainingMinutes', { minutes });
}

export function AccountBanBanner() {
  const t = useT();
  const [ban, setBan] = useState<AccountBanInfo | null>(null);
  // Re-render once a minute so the countdown ticks.
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = onAccountBanned(setBan);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ban) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [ban]);

  if (!ban) return null;

  const remaining = formatRemaining(ban.bannedUntil, t);

  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b border-nx-status-danger bg-nx-status-danger-bg px-4 py-3 text-nx-status-danger-fg"
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5 text-nx-body-sm">
        <span className="font-medium">
          {remaining
            ? t('moderation.banBanner.title', { remaining })
            : t('moderation.banBanner.titleNoTime')}
        </span>
        {ban.reason && <span className="text-nx-body-sm opacity-90">{ban.reason}</span>}
        <Link href="/profile?tab=account" className="w-fit underline hover:no-underline">
          {t('moderation.banBanner.link')}
        </Link>
      </div>
    </div>
  );
}
