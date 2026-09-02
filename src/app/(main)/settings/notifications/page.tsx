'use client';

import { Section } from '@/shared/components';
import { NotificationPreferences } from '@/features/notifications';
import { useT } from '@/core/i18n';

/**
 * `/settings/notifications` — was stacked under the `/notifications` list. The list is a feed of
 * events; the toggles are configuration, and reading past the feed to reach them was the reason
 * this moved.
 */
export default function SettingsNotificationsPage() {
  const t = useT();
  return (
    <Section
      title={t('settings.notifications.title')}
      description={t('settings.notifications.desc')}
    >
      <NotificationPreferences />
    </Section>
  );
}
