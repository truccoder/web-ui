'use client';

import { CheckCircle2, Link2 } from 'lucide-react';
import { ApiErrorNotice, Button, Card, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useCalendarStatus, useGoogleAuthUrl } from '../hooks/use-event';

/**
 * The account-level Google Calendar connection, for `/settings/calendar`.
 *
 * WHY THIS IS SEPARATE FROM `EventCalendarActions`. That component offers "connect" as a
 * fallback beside an event's `.ics` download — a per-event affordance. This is the standing
 * question "is my calendar linked?", which belongs in settings and had no home before the hub.
 * Both read the same `useCalendarStatus` cache entry, so they never disagree.
 *
 * NO DISCONNECT. The backend exposes `GET /google/status` and `GET /google/auth-url` and
 * nothing else — there is no revoke endpoint. A token is dropped by re-authorising or at
 * Google's own settings, so the copy says so rather than showing a button that cannot exist.
 *
 * The connect query is disabled and fired by `refetch()` on click — minting a consent URL for
 * every visitor to this page would be waste (same pattern as `EventCalendarActions`).
 */
export function CalendarConnectCard() {
  const t = useT();
  const status = useCalendarStatus();
  const authUrl = useGoogleAuthUrl(false);

  const connect = async () => {
    const { data } = await authUrl.refetch();
    if (data?.authUrl) window.location.assign(data.authUrl);
  };

  if (status.isLoading) {
    return (
      <Card>
        <Skeleton lines={2} />
      </Card>
    );
  }

  if (status.isError) {
    return <ApiErrorNotice error={status.error} onRetry={() => status.refetch()} />;
  }

  const connected = status.data?.connected === true;

  return (
    <Card className="flex flex-col gap-[var(--nx-space-element)]">
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <CheckCircle2 className="size-4 text-nx-status-success-fg" aria-hidden />
            <span className="text-nx-body-sm font-medium text-nx-text-primary">
              {t('settings.calendar.connected')}
            </span>
          </>
        ) : (
          <span className="text-nx-body-sm text-nx-text-secondary">
            {t('settings.calendar.notConnected')}
          </span>
        )}
      </div>

      <p className="text-nx-caption text-nx-text-muted">
        {connected ? t('settings.calendar.reconnectHint') : t('settings.calendar.connectHint')}
      </p>

      <Button
        size="sm"
        variant={connected ? 'secondary' : 'primary'}
        icon={<Link2 className="size-4" aria-hidden />}
        loading={authUrl.isFetching}
        onClick={connect}
        className="self-start"
      >
        {connected ? t('settings.calendar.reconnect') : t('settings.calendar.connect')}
      </Button>

      {authUrl.isError && <ApiErrorNotice variant="inline" error={authUrl.error} />}
    </Card>
  );
}
