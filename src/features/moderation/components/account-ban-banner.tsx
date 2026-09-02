'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { onAccountBanned, type AccountBanInfo } from '@/core/api/axios';
import { useT } from '@/core/i18n';
import { useBanCountdown } from '../hooks/use-ban-countdown';

/**
 * A sticky banner that appears the moment a request comes back 403 with a ban attached
 * (`core/api/axios`'s `onAccountBanned`). A ban can land mid-session — a moderator rejecting a
 * second post auto-bans the author — and without this the reader just sees writes start failing
 * with a generic error.
 *
 * Mounted once in the `(main)` shell. The countdown to `bannedUntil` is `useBanCountdown`, shared
 * with the login ban screen; this links to `/moderation`, where the violation and appeal form live.
 */
export function AccountBanBanner() {
  const t = useT();
  const [ban, setBan] = useState<AccountBanInfo | null>(null);

  useEffect(() => {
    const unsubscribe = onAccountBanned(setBan);
    return () => {
      unsubscribe();
    };
  }, []);

  const { remaining } = useBanCountdown(ban?.bannedUntil);

  if (!ban) return null;

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
        <Link href="/moderation" className="w-fit underline hover:no-underline">
          {t('moderation.banBanner.link')}
        </Link>
      </div>
    </div>
  );
}
