import api from './axios';
import type {
  NotificationResponse,
  NotificationPreference,
  UpdatePreferenceRequest,
  UnreadCountResponse,
  Page,
} from '@/lib/types';

export const notificationsApi = {
  getNotifications: (page = 1, size = 10) =>
    api.get<Page<NotificationResponse>>('/v1/api/notifications', {
      params: { page, size },
    }),

  getUnreadCount: () =>
    api.get<UnreadCountResponse>('/v1/api/notifications/unread-count'),

  markAsRead: (notificationId: number) =>
    api.post<void>(`/v1/api/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    api.post<void>('/v1/api/notifications/read-all'),

  getPreferences: () =>
    api.get<NotificationPreference>('/v1/api/notifications/preferences'),

  updatePreferences: (data: UpdatePreferenceRequest) =>
    api.put<NotificationPreference>('/v1/api/notifications/preferences', data),
};
