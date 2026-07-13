'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/lib/hooks/use-notifications';
import type { EmailFrequency, NotificationPreference, NotificationType } from '@/lib/types';

const EMAIL_FREQUENCIES: EmailFrequency[] = ['INSTANT', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'NONE'];

const NOTIFICATION_TYPES: NotificationType[] = [
  'POST_LIKED',
  'POST_COMMENTED',
  'POST_SHARED',
  'POST_TAGGED',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'EVENT_RSVP',
  'EVENT_REMINDER',
  'BOOK_REVIEW',
  'BOOK_PURCHASED',
  'SYSTEM',
];

const selectClass =
  'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring';

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 cursor-pointer">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
      />
    </label>
  );
}

function PreferencesForm({ preferences }: { preferences: NotificationPreference }) {
  const t = useT();
  const { mutate: updatePreferences, isPending } = useUpdateNotificationPreferences();

  const [pushEnabled, setPushEnabled] = useState(preferences.pushEnabled);
  const [emailEnabled, setEmailEnabled] = useState(preferences.emailEnabled);
  const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>(preferences.emailFrequency);
  const [mutedTypes, setMutedTypes] = useState<Set<string>>(new Set(preferences.mutedTypes ?? []));

  const toggleMuted = (type: NotificationType, muted: boolean) => {
    setMutedTypes((prev) => {
      const next = new Set(prev);
      if (muted) next.add(type);
      else next.delete(type);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences({
      pushEnabled,
      emailEnabled,
      emailFrequency,
      mutedTypes: Array.from(mutedTypes),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-4">
        <ToggleRow
          id="pref-push"
          label={t('notifications.prefs.push')}
          description={t('notifications.prefs.pushDesc')}
          checked={pushEnabled}
          onChange={setPushEnabled}
        />
        <ToggleRow
          id="pref-email"
          label={t('notifications.prefs.email')}
          description={t('notifications.prefs.emailDesc')}
          checked={emailEnabled}
          onChange={setEmailEnabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pref-frequency">{t('notifications.prefs.emailFrequency')}</Label>
        <select
          id="pref-frequency"
          className={selectClass}
          value={emailFrequency}
          onChange={(e) => setEmailFrequency(e.target.value as EmailFrequency)}
          disabled={!emailEnabled}
        >
          {EMAIL_FREQUENCIES.map((freq) => (
            <option key={freq} value={freq}>
              {t(`notifications.prefs.frequency.${freq}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{t('notifications.prefs.mutedTypes')}</p>
          <p className="text-xs text-muted-foreground">{t('notifications.prefs.mutedTypesDesc')}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {NOTIFICATION_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={mutedTypes.has(type)}
                onChange={(e) => toggleMuted(type, e.target.checked)}
                className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
              />
              {t(`notifications.types.${type}`)}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? t('notifications.prefs.saving') : t('notifications.prefs.save')}
      </Button>
    </form>
  );
}

export function NotificationPreferences() {
  const t = useT();
  const { data: preferences, isLoading, isError } = useNotificationPreferences();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !preferences) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t('notifications.prefs.error')}
      </p>
    );
  }

  // Keyed by id so a fresh server payload after save remounts the form seeded with it,
  // instead of syncing props into state via an effect.
  return <PreferencesForm key={preferences.id} preferences={preferences} />;
}
