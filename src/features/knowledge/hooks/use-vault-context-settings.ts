'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vaultApi } from '../api';
import type { UpdateVaultContextSettingsInput } from '../types/knowledge';
import { knowledgeKeys } from './keys';

/**
 * State for the vault context filter — which synced notes `/explain` is allowed to see.
 *
 * THIS IS A PRIVACY CONTROL, AND THE CACHING IS WRITTEN AS ONE. No optimistic update anywhere in
 * this file: the mutation resolves with the server's normalised lists and those are what gets
 * written into the cache, because the server trims, strips a leading `#`, lower-cases and
 * de-duplicates on write. Showing the raw input as though it had been saved would tell somebody
 * their `#Private` rule was in force while the stored rule reads `private` — the same string in
 * their eyes, a different one to the matcher.
 */

/**
 * Every distinct tag the caller's notes actually carry.
 *
 * SEPARATE QUERY FROM THE SETTINGS, not one combined call, because they answer different questions
 * and change at different times: this is what the vault contains, the settings are what the user
 * chose. Deleting notes changes this one and not the other, which is why the note mutations
 * invalidate `vaultTags` and nothing else.
 */
export function useVaultTags(enabled = true) {
  return useQuery({
    queryKey: knowledgeKeys.vaultTags,
    queryFn: () => vaultApi.getTags(),
    enabled,
  });
}

/**
 * The saved filter.
 *
 * Never 404s — a user who has never configured anything gets two empty lists, which is the default
 * and means "no filtering". So there is no not-found state for the UI to explain, only an ordinary
 * empty one.
 */
export function useVaultContextSettings(enabled = true) {
  return useQuery({
    queryKey: knowledgeKeys.vaultSettings,
    queryFn: () => vaultApi.getSettings(),
    enabled,
  });
}

/**
 * Replace the filter.
 *
 * `setQueryData` from the response rather than an invalidate-and-refetch: the PUT already returns
 * the authoritative, normalised lists, so a second GET would ask for what is in hand. The cache is
 * still keyed on `vaultSettings` alone — saving a filter cannot have changed a note or a tag.
 */
export function useUpdateVaultContextSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVaultContextSettingsInput) => vaultApi.updateSettings(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(knowledgeKeys.vaultSettings, settings);
    },
  });
}
