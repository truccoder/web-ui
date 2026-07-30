'use client';

import { NotificationList, NotificationPreferences } from '@/features/notifications';
import { useT } from '@/lib/i18n';

/**
 * `/notifications` — owned entirely by `notifications`, no contributing domains.
 *
 * A NEW ROUTE RATHER THAN A REWIRE, because there was nothing to rewire: this domain shipped a
 * complete data layer and zero UI (`ledger/legacy-inventory.md` — "6/6 endpoint, 0 UI"), so no
 * existing page held any of its functionality and Guardrail C has nothing to reconcile. The
 * route is protected by the same middleware rule as every other `(main)` page — it is simply
 * not in `publicPaths`, so no middleware change was needed.
 *
 * THE BELL IS NOT HERE AND NOT ANYWHERE YET. A topbar bell with an unread badge belongs to the
 * app shell (P3.4); it will link to this page and mount its own `useUnreadNotificationCount`.
 * Building it during this checkpoint would mean designing a component against a shell that is
 * still legacy shadcn markup.
 *
 * The page composes and does nothing else: both children own their own queries.
 */
export default function NotificationsPage() {
  const t = useT();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-nx-h2 font-semibold tracking-tight text-nx-text-primary">
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
