'use client';

import { Section } from '@/shared/components';
import { CalendarConnectCard } from '@/features/posts';
import { useT } from '@/core/i18n';

/**
 * `/settings/calendar` — the standing Google Calendar connection. Connecting here means the
 * "Add to calendar" button on any event just works, instead of each event card being the only
 * place to notice the account is not linked.
 */
export default function SettingsCalendarPage() {
  const t = useT();
  return (
    <Section title={t('settings.calendar.title')} description={t('settings.calendar.desc')}>
      <CalendarConnectCard />
    </Section>
  );
}
