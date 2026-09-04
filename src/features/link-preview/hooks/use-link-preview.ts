'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { linkPreviewApi } from '../api/link-preview';
import type { LinkPreview } from '../types/link-preview';

/**
 * POST /v1/api/link-preview.
 *
 * A MUTATION, NOT A QUERY, on purpose: unfurling costs an outbound HTTP fetch server-side and is
 * rate-limited (20/min/user), so it must fire only when the author asks — never on mount, on
 * focus, on reconnect, or on a shared `invalidateQueries`. Nothing to cache; the result flows
 * straight into the composer's `linkDetails` state.
 */
export function useLinkPreview(
  options?: Omit<UseMutationOptions<LinkPreview, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (url: string) => linkPreviewApi.fetch(url),
    ...options,
  });
}
