import { notificationListApi } from './notification';
import { notificationPreferenceApi } from './preference';

/**
 * The domain's whole API surface: 6 functions for NotificationController's 6 endpoints.
 *
 * One object rather than two, because the backend has one controller — the two files behind it
 * are a file-length split, not a boundary. Callers should not have to know which half a call
 * lives in.
 */
export const notificationsApi = {
  ...notificationListApi,
  ...notificationPreferenceApi,
};
