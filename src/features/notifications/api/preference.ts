import api from '@/core/api/axios';
import type { NotificationPreference, UpdatePreferenceInput } from '../types/preference';

/**
 * NotificationController (`com.socialapp.notifications`) — the preference half: 2 of the
 * domain's 6 endpoints.
 */
export const notificationPreferenceApi = {
  /**
   * GET /v1/api/notifications/preferences — the signed-in user's preferences.
   *
   * NEVER 404s AND HAS A WRITE SIDE EFFECT. `getPreference` delegates to
   * `getOrCreatePreference`, which inserts a defaults row (push on, email on, `INSTANT`, no
   * muted types) when the user has none. A first read therefore both succeeds and creates
   * state; there is no "not configured yet" case for the UI to handle.
   */
  getPreferences: () =>
    api.get<NotificationPreference>('/v1/api/notifications/preferences').then((r) => r.data),

  /**
   * PUT /v1/api/notifications/preferences — update some or all preferences.
   *
   * PARTIAL DESPITE THE VERB: every field is applied under `Objects.nonNull`, so omitted keys
   * keep their stored value and there is no way to null a field back out. Returns the whole
   * saved entity, which is the authoritative post-write state — worth writing into the cache
   * rather than discarding.
   */
  updatePreferences: (input: UpdatePreferenceInput) =>
    api.put<NotificationPreference>('/v1/api/notifications/preferences', input).then((r) => r.data),
};
