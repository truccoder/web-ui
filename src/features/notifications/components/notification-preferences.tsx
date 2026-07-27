'use client';

import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, Switch } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks';
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
 * `emailFrequency` IS DELIBERATELY ABSENT. It is stored, echoed back, and read by nothing —
 * no scheduler in the backend mentions `EmailFrequency`, and `shouldSendEmail` checks only
 * `emailEnabled`, so even `NONE` still sends mail instantly (`findings/notifications.md` §6).
 * A control for it would be a lie whether or not it carried a "not yet active" label, so it is
 * cut and recorded as a DS deviation. Bring it back when a digest job exists, not before.
 *
 * PUSH CANNOT BE VERIFIED LOCALLY, only stored: `onesignal.app-id` is empty in this
 * environment and `shouldSendPush` additionally requires an `onesignalPlayerId`, which is null
 * for every user until a browser registers a subscription. The toggle is real; the delivery
 * path behind it is untested here.
 */
export interface NotificationPreferencesProps {
  className?: string;
}

/**
 * Which types get a mute control.
 *
 * THE SEVEN THE BACKEND ACTUALLY EMITS. `POST_SHARED`, `EVENT_RSVP`, `EVENT_REMINDER` and
 * `SYSTEM` are in the enum but no service anywhere constructs them
 * (`findings/notifications.md` §9), so a switch for them would mute a notification that cannot
 * arrive — the same kind of dead control as `emailFrequency`. If a producer for one of them
 * ever lands, add it here; muting is stored as free-form strings, so nothing else changes.
 */
const MUTABLE_TYPES: NotificationType[] = [
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_TAGGED',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'BOOK_REVIEW',
  'BOOK_PURCHASED',
];

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const t = useT();
  const { data: preference, isLoading, isError, refetch } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  if (isLoading) {
    return (
      <Card padding={16} className={cn('flex flex-col gap-4', className)}>
        <Skeleton width={160} height={14} />
        <Skeleton lines={3} />
      </Card>
    );
  }

  if (isError || !preference) {
    return (
      <Card padding={16} className={className}>
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
    <Card padding={16} className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-3">
        <h2 className="text-nx-title-sm font-semibold text-nx-text-primary">
          {t('notifications.prefs.channels')}
        </h2>

        <Switch
          checked={pushEnabled}
          onChange={(next) => update.mutate({ pushEnabled: next })}
          label={t('notifications.prefs.push')}
          description={t('notifications.prefs.pushDesc')}
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
