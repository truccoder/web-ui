'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api';
import { notificationKeys } from './keys';
import type { UpdatePreferenceInput } from '../types/preference';

/** GET /v1/api/notifications/preferences — always resolves; the backend creates defaults. */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationsApi.getPreferences(),
  });
}

/**
 * PUT /v1/api/notifications/preferences.
 *
 * SEEDS THE CACHE FROM THE RESPONSE *AND* INVALIDATES, which is not redundant. The endpoint
 * returns the saved entity, so `setQueryData` gives the settings form the server's own
 * post-write state with no round trip — including `updatedAt`, which only the server knows.
 * The invalidation stays because the write is partial (omitted keys keep their stored value)
 * and a caller sending a subset should still converge on whatever else changed; without it the
 * cache would be trusting a response to a request that deliberately did not mention every
 * field.
 *
 * Only the preferences key is touched. The list and the badge are unaffected: muting a type
 * stops *future* notifications of it (`send` returns before `saveNotification`), it does not
 * retract ones already stored.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePreferenceInput) => notificationsApi.updatePreferences(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(notificationKeys.preferences(), updated);
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}
