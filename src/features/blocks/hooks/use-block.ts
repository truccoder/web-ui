'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockApi } from '../api/block';
import { blockKeys } from './keys';

/**
 * Hooks over `BlockController`.
 *
 * BLOCKING INVALIDATES MORE THAN THIS FEATURE'S OWN LIST, and that is the whole reason these
 * mutations are not one-liners. On the backend a block removes the friendship and hides the two
 * people from each other's feed and search, so after a block the friends list, the pending
 * requests, the suggestions and the feed are all stale.
 *
 * The invalidations name those caches BY KEY PREFIX rather than importing another feature's key
 * factory — `['friendships']` and `['newsfeed']` are strings here, not a dependency on
 * `features/friendships` (CLAUDE.md §4: features do not import each other's internals). A prefix
 * that stops matching is a cache that refreshes late; an import that stops compiling would be an
 * architecture violation that shipped.
 */
export function useBlockedUsers() {
  return useQuery({
    queryKey: blockKeys.list,
    queryFn: blockApi.getBlockedUsers,
  });
}

/** Cross-feature caches a block or unblock makes stale. */
const AFFECTED_PREFIXES = [['friendships'], ['newsfeed'], ['search']];

function useInvalidateAfterBlockChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: blockKeys.all });
    for (const prefix of AFFECTED_PREFIXES) {
      queryClient.invalidateQueries({ queryKey: prefix });
    }
  };
}

export function useBlockUser() {
  const invalidate = useInvalidateAfterBlockChange();
  return useMutation({
    mutationFn: (userId: number) => blockApi.block(userId),
    onSuccess: invalidate,
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidateAfterBlockChange();
  return useMutation({
    mutationFn: (userId: number) => blockApi.unblock(userId),
    onSuccess: invalidate,
  });
}
