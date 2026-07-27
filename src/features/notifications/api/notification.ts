import api from '@/core/api/axios';
import type { NotificationPage, UnreadCount } from '../types/notification';

/**
 * NotificationController (`com.socialapp.notifications`) — the list half: 4 of the domain's 6
 * endpoints. Bare responses, no wrapper. The preference half lives in `api/preference.ts`;
 * both are surfaced through one `notificationsApi` object in `api/index.ts`, because the
 * backend has one controller and the split here is only about file size.
 */
export const notificationListApi = {
  /**
   * GET /v1/api/notifications — one page of the signed-in user's notifications, newest first.
   *
   * `page` IS 1-BASED ON THE WAY IN AND 0-BASED ON THE WAY BACK. The parameter is
   * `@Positive` with `defaultValue = "1"` and the service does `PageRequest.of(page - 1, size)`,
   * so `getNotifications(0)` is a 400 rather than the first page; the `number` field of the
   * response is Spring's own and counts from 0. `size` defaults to 10 server-side
   * (`Constants.DEFAULT_PAGINATION_PAGE_SIZE`).
   */
  getNotifications: (page = 1, size = 10) =>
    api
      .get<NotificationPage>('/v1/api/notifications', { params: { page, size } })
      .then((r) => r.data),

  /**
   * GET /v1/api/notifications/unread-count — how many are unread.
   *
   * Returns the envelope rather than the bare number so the caller sees the shape the endpoint
   * actually has; the hook is where it gets unwrapped.
   */
  getUnreadCount: () =>
    api.get<UnreadCount>('/v1/api/notifications/unread-count').then((r) => r.data),

  /**
   * POST /v1/api/notifications/{id}/read — mark one as read.
   *
   * RETURNS 200 WITH NO BODY, AND ALSO RETURNS 200 WHEN IT DID NOTHING. `markAsRead` is
   * `findById(...).ifPresent(...)` with an inner `recipientId.equals(userId)` guard: an unknown
   * id and someone else's notification are both silent no-ops, not 404 or 403. Success here
   * therefore does not prove the row changed — the refetch that follows is what tells the truth.
   */
  markAsRead: (notificationId: number) =>
    api.post<void>(`/v1/api/notifications/${notificationId}/read`).then((r) => r.data),

  /** POST /v1/api/notifications/read-all — mark every unread one as read. 200, no body. */
  markAllAsRead: () => api.post<void>('/v1/api/notifications/read-all').then((r) => r.data),
};
