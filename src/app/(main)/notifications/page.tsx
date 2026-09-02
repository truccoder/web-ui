'use client';

import { NotificationList } from '@/features/notifications';

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
 * PREFERENCES LEFT THIS PAGE for `/settings/notifications` when the settings hub landed — the
 * list is a feed of events, the toggles are configuration, and rendering both here meant the
 * exact same `NotificationPreferences` panel sat on two routes. This page is now just the list.
 */
export default function NotificationsPage() {
  return <NotificationList />;
}
