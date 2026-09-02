'use client';

import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, Switch } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useNotificationPreferences, useUpdateNotificationPreferences, useWebPush } from '../hooks';
import type { NotificationType } from '../types/notification';

/**
 * The notification preferences panel.
 *
 * EVERY CONTROL SAVES ON TOGGLE — no Save button. That is what makes `Switch` the right
 * primitive rather than `Checkbox` (the DS draws the line exactly there: "On/off toggle for
 * immediate-effect settings, use Checkbox inside forms"), and the backend cooperates: `PUT
 * /preferences` applies each field under `Objects.nonNull`, so one toggle sends one field and
 * leaves the rest of the row alone.
 *
 * `emailFrequency` IS STILL DELIBERATELY ABSENT, FOR A NEW REASON. It used to be a dead setting —
 * stored, echoed back, read by nothing, so even `NONE` sent mail instantly. `18efb6c` fixed that
 * and, in the same move, deleted `DAILY_DIGEST`/`WEEKLY_DIGEST` because no scheduler ever batched
 * anything. What is left is `INSTANT | NONE`, which is the `emailEnabled` switch above wearing a
 * different name. Two controls for one decision is worse than one, so it stays cut — now as a
 * redundancy rather than a lie. Bring it back if digests are ever implemented, not before.
 *
 * PUSH IS WIRED THROUGH ONESIGNAL (`useWebPush`) BUT FEATURE-FLAGGED. Turning the switch on now
 * asks the browser for permission and opts a subscription in, then sends `onesignalPlayerId` with
 * `pushEnabled`. It only does any of that when `NEXT_PUBLIC_ONESIGNAL_APP_ID` is set — with no app
 * id (this environment) the switch is disabled and a line says so. Delivery still additionally
 * needs `onesignal.app-id` + `api-key` on the backend, so end-to-end push is not verifiable here;
 * the id is write-only on the response (`39b5666`).
 */
export interface NotificationPreferencesProps {
  className?: string;
}

/**
 * Which types get a mute control.
 *
 * ALL NINE — the union and this list finally agree. It used to be seven of eleven: `POST_SHARED`,
 * `EVENT_RSVP`, `EVENT_REMINDER` and `SYSTEM` had no producer, so a switch for them would have
 * muted a notification that could not arrive. The backend closed the gap from both ends —
 * `POST_SHARED`/`SYSTEM` deleted from the enum (`f0dc820`), `EVENT_RSVP` given a producer when a
 * guest answers (`b0d1539`) and `EVENT_REMINDER` one the day before (`4ff5d5f`) — so the two
 * survivors are added here.
 *
 * Keep the order matching the Java enum: this list is read top to bottom in the panel, and a
 * reader comparing it against `NotificationType` should not have to sort.
 */
const MUTABLE_TYPES: NotificationType[] = [
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_TAGGED',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'EVENT_RSVP',
  'EVENT_REMINDER',
  'BOOK_REVIEW',
  'BOOK_PURCHASED',
  // Matchmaking decisions (BE `task/E4rkd1nF`). `PROJECT_APPLICATION_*` land on the applicant when
  // the owner accepts or rejects; `PROJECT_MEMBER_REMOVED` when the owner drops them from a
  // project. All three have a producer, so a switch here mutes something real.
  'PROJECT_APPLICATION_ACCEPTED',
  'PROJECT_APPLICATION_REJECTED',
  'PROJECT_MEMBER_REMOVED',
];

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const t = useT();
  const { data: preference, isLoading, isError, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const webPush = useWebPush();

  if (isLoading) {
    return (
      <Card className={cn('flex flex-col gap-4', className)}>
        <Skeleton width={160} height={14} />
        <Skeleton lines={3} />
      </Card>
    );
  }

  if (isError || !preference) {
    return (
      <Card className={className}>
        <EmptyState
          compact
          title={t('notifications.prefs.error')}
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="size-4" />}
              onClick={() => refetch()}
            >
              {t('notifications.retry')}
            </Button>
          }
        />
      </Card>
    );
  }

  /**
   * What the switches show while a save is in flight.
   *
   * READ FROM THE MUTATION'S OWN `variables` RATHER THAN FROM AN OPTIMISTIC CACHE WRITE. A
   * switch that snaps back for the duration of the request reads as a rejected click, but
   * patching the query cache would mean owning a rollback (and this endpoint can fail). Taking
   * the in-flight input as the displayed value is bounded to this component and unwinds by
   * itself: when the mutation settles, `variables` stops applying and the server's answer —
   * success or the unchanged old value — is what remains.
   *
   * `??` is correct here even for booleans: a pending `false` is not nullish, so it wins, and
   * a field the current save did not mention falls through to the stored value.
   */
  const pending = update.isPending ? update.variables : undefined;
  const pushEnabled = pending?.pushEnabled ?? preference.pushEnabled;
  const emailEnabled = pending?.emailEnabled ?? preference.emailEnabled;
  const mutedTypes: readonly string[] = pending?.mutedTypes ?? preference.mutedTypes;

  /**
   * Turning push ON registers a browser subscription first, then stores the flag + the
   * subscription id. Turning it OFF just stores the flag — the subscription can stay, it simply
   * stops being sent to. With no OneSignal app id configured the switch is inert (see the header).
   */
  const pushBlocked = webPush.configured && webPush.permission === 'denied';
  const setPush = async (next: boolean) => {
    if (!next) {
      update.mutate({ pushEnabled: false });
      return;
    }
    if (!webPush.configured) {
      update.mutate({ pushEnabled: true });
      return;
    }
    const playerId = await webPush.subscribe();
    if (!playerId) return; // denied or unsupported — leave the switch off
    update.mutate({ pushEnabled: true, onesignalPlayerId: playerId });
  };

  const pushDescription = !webPush.configured
    ? t('notifications.prefs.pushNotConfigured')
    : pushBlocked
      ? t('notifications.prefs.pushDenied')
      : t('notifications.prefs.pushDesc');

  const toggleMuted = (type: NotificationType, wantNotifications: boolean) => {
    // The switch reads positively ("notify me about X"), the backend stores the negative
    // ("mutedTypes"). Inverting here rather than labelling the control "Mute X" keeps every
    // row in this panel meaning the same thing when it is on.
    const next = wantNotifications ? mutedTypes.filter((t) => t !== type) : [...mutedTypes, type];

    // Cast: the stored list is free-form `string[]` because the column is unvalidated jsonb,
    // while the request narrows to real enum members. Everything added here comes from
    // `MUTABLE_TYPES`, and anything pre-existing that is not a valid member was already inert
    // (the backend compares with `List.contains(type.name())`).
    update.mutate({ mutedTypes: next as NotificationType[] });
  };

  return (
    <Card className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-3">
        <h2 className="text-nx-title-sm font-semibold text-nx-text-primary">
          {t('notifications.prefs.channels')}
        </h2>

        <Switch
          checked={pushEnabled}
          onChange={setPush}
          disabled={pushBlocked}
          label={t('notifications.prefs.push')}
          description={pushDescription}
        />

        <Switch
          checked={emailEnabled}
          onChange={(next) => update.mutate({ emailEnabled: next })}
          label={t('notifications.prefs.email')}
          description={t('notifications.prefs.emailDesc')}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-nx-title-sm font-semibold text-nx-text-primary">
            {t('notifications.prefs.types')}
          </h2>
          <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">
            {t('notifications.prefs.typesDesc')}
          </p>
        </div>

        {MUTABLE_TYPES.map((type) => (
          <Switch
            key={type}
            checked={!mutedTypes.includes(type)}
            onChange={(next) => toggleMuted(type, next)}
            label={t(`notifications.types.${type}`)}
          />
        ))}
      </div>

      {/* One shared error line for the whole panel: the mutation is the same one behind every
          switch, so there is only ever one failure to report. */}
      {update.isError && (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger">
          {t('notifications.prefs.saveError')}
        </p>
      )}
    </Card>
  );
}
