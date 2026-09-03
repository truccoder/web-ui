/**
 * `features/notifications` — mirrors the backend package `com.socialapp.notifications`
 * (NotificationController: 6 endpoints).
 *
 * NOTHING PUSHES TO THIS CLIENT. The backend has no WebSocket or SSE transport of any kind
 * (verified by grep across `src/main/java`, not inferred from endpoint names), so freshness is
 * a 30s poll of the unread count and nothing else. Any future "realtime notifications" work is
 * a backend change first.
 *
 * THE SURFACE IS `/notifications`, AND THE BELL LANDED AT P3.4 AS PLANNED. P2.6cd deliberately
 * shipped the route without any chrome — building a topbar bell before the topbar exists means
 * guessing at it — and P3.4 added `NotificationBell` over the same hooks. The bell's panel is a
 * PREVIEW of the first page that hands off to `/notifications`; it is not a second list, and it
 * does not mark anything read on open. See the header of `components/notification-bell.tsx`.
 */

export { notificationsApi } from './api';

export {
  notificationKeys,
  useNotifications,
  useNotificationStream,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useWebPush,
  type WebPushState,
} from './hooks';

export {
  NotificationBell,
  type NotificationBellProps,
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
