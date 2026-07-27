/**
 * `features/notifications` — mirrors the backend package `com.socialapp.notifications`
 * (NotificationController: 6 endpoints).
 *
 * DATA + STATE ONLY AS OF P2.6ab. There are no components yet, and the barrel deliberately
 * exports none: this domain had a full legacy data layer and zero UI (`ledger/legacy-inventory.md`
 * — "6/6 endpoint, 0 UI"), so there is no consumer to rewire at this checkpoint and nothing to
 * wire it to. The legacy `lib/api/notifications.ts` and `lib/hooks/use-notifications.ts` stay
 * alive until P2.6cd for the same reason Guardrail B gives: a domain's legacy code goes only
 * after its replacement is implemented *and* something uses it.
 *
 * NOTHING PUSHES TO THIS CLIENT. The backend has no WebSocket or SSE transport of any kind
 * (verified by grep across `src/main/java`, not inferred from endpoint names), so freshness is
 * a 30s poll of the unread count and nothing else. Any future "realtime notifications" work is
 * a backend change first.
 *
 * WHERE THE UI GOES IS NOT DECIDED HERE. The bell belongs to the app shell (P3.4) while a
 * preferences panel belongs to a settings surface; picking those is the first thing P2.6cd must
 * announce, before any component is written.
 */

export { notificationsApi } from './api';

export {
  notificationKeys,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './hooks';

export type {
  AppNotification,
  NotificationType,
  NotificationChannel,
  NotificationPage,
  UnreadCount,
  NotificationPreference,
  EmailFrequency,
  UpdatePreferenceInput,
} from './types';
