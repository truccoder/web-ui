'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { reputationApi } from '../api/reputation';
import type { Reputation } from '../types/reputation';
import { reputationKeys } from './keys';

/**
 * Reputation state layer. Read-only: the score is never written from the client — the
 * backend awards it from events (accepted answers, roadmap verifications, …), so there is
 * no mutation here and nothing to invalidate.
 */

/**
 * Elite Score for one user. Disabled until `userId` is known, so callers can pass an id
 * that is still loading (e.g. from `GET /profile/me`) without firing a request for
 * `undefined`.
 */
export function useReputation(userId: number | undefined) {
  return useQuery({
    queryKey: reputationKeys.user(userId ?? -1),
    queryFn: () => reputationApi.getReputation(userId as number),
    enabled: userId !== undefined,
  });
}

/**
 * Elite Score for a SET of users, as a `Map` keyed by id.
 *
 * RE-ADDED FOR `features/chat`. This hook was deleted at B22 once its only caller — a comment row —
 * could read the score straight off `CommentResponseDto`. The group-member list in `ChatInfo` is
 * the new caller: it needs each member's `username` to link the row to `/u/{username}`, and that
 * handle only comes from `GET /users/{id}/reputation`. Same shape as before — see git history.
 *
 * IT IS A BATCH IN SHAPE ONLY. `ReputationController` has one route, so this is N requests; what it
 * buys is making N visible and bounded in one place, de-duplicated, rather than a `useReputation`
 * call hidden inside every row (which rules-of-hooks forbids for a list that changes length). The
 * app-wide 60s `staleTime` means a member also open elsewhere — the DM peer, a feed author — is a
 * cache hit, not a second request.
 *
 * SORTED BEFORE USE so the same ids in a different order do not rebuild the `queries` array each
 * render.
 */
export function useReputations(userIds: number[]) {
  const ids = Array.from(new Set(userIds.filter(Number.isFinite))).sort((a, b) => a - b);

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: reputationKeys.user(id),
      queryFn: () => reputationApi.getReputation(id),
    })),
    /**
     * `combine` RATHER THAN MAPPING THE RESULT ARRAY IN THE CALLER. `useQueries` returns a fresh
     * array every render, so a `useMemo` over it in the component would never hit — React Query
     * memoises `combine`'s output structurally instead. A failed lookup is simply absent: no entry
     * means the row renders unlinked, the same fallback the DM peer already uses.
     */
    combine: (results) => {
      const map = new Map<number, Reputation>();
      results.forEach((result, index) => {
        if (result.data) map.set(ids[index], result.data);
      });
      return map;
    },
  });
}
