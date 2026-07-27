/**
 * `features/notifications` — mirrors the backend package `com.socialapp.notifications`
 * (NotificationController: 6 endpoints).
 *
 * NOTHING PUSHES TO THIS CLIENT. The backend has no WebSocket or SSE transport of any kind
 * (verified by grep across `src/main/java`, not inferred from endpoint names), so freshness is
 * a 30s poll of the unread count and nothing else. Any future "realtime notifications" work is
 * a backend change first.
 *
 * THE SURFACE IS `/notifications`, AND THERE IS NO BELL HERE. Decided at the top of P2.6cd:
 * the list and the preferences panel own a route of their own, while the topbar bell is app
 * shell and belongs to P3.4 — building it now would mean guessing a shell that does not exist
 * yet. P3.4 mounts its own bell over `useUnreadNotificationCount` and links here. The count is
 * consumed today by this route's own header, so no endpoint is left waiting on that.
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

export {
  NotificationList,
  type NotificationListProps,
  NotificationPreferences,
  type NotificationPreferencesProps,
  NotificationItem,
  type NotificationItemProps,
} from './components';

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
