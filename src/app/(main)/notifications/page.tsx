'use client';

import { NotificationList, NotificationPreferences } from '@/features/notifications';
import { useT } from '@/core/i18n';

/**
 * `/notifications` — owned entirely by `notifications`, no contributing domains.
 *
 * A NEW ROUTE RATHER THAN A REWIRE, because there was nothing to rewire: this domain shipped a
 * complete data layer and zero UI (`ledger/legacy-inventory.md` — "6/6 endpoint, 0 UI"), so no
 * existing page held any of its functionality and Guardrail C has nothing to reconcile. The
 * route is protected by the same middleware rule as every other `(main)` page — it is simply
 * not in `publicPaths`, so no middleware change was needed.
 *
 * THE BELL SHIPPED AT P3.4b AND LIVES IN THE APP SHELL, not here. It carries the unread badge,
 * mounts its own `useUnreadNotificationCount`, and its panel is a preview of the first page that
 * links back to this route — which is why the sidebar has no `/notifications` row any more: two
 * entry points, one of them without a badge, is the weaker pair.
 *
 * The page composes and does nothing else: both children own their own queries.
 */
export default function NotificationsPage() {
  const t = useT();

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <div>
        <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
          {t('notifications.title')}
        </h1>
        <p className="mt-0.5 text-nx-body-sm text-nx-text-secondary">
          {t('notifications.subtitle')}
        </p>
      </div>

      <NotificationList />

      <NotificationPreferences />
    </div>
  );
}
