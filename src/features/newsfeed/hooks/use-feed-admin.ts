'use client';

import { useMutation } from '@tanstack/react-query';
import { newsfeedApi } from '../api/feed';
import type { FeedRebuildResult } from '../types/feed';

/**
 * POST /v1/api/admin/newsfeed/rebuild.
 *
 * A MUTATION with nothing to invalidate from an admin screen: the caller is not looking at their
 * own feed here, and every other user's cache lives in their own browser. The result
 * (`{ processed, skipped }`) is shown in place. No retry — a rebuild is expensive and firing it
 * twice on a transient error would double the work.
 */
export function useRebuildFeed() {
  return useMutation<FeedRebuildResult, Error, void>({
    mutationFn: () => newsfeedApi.rebuildFeed(),
    retry: false,
  });
}
