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
 * WHY THIS EXISTS AT ALL, WHEN THE BARREL SAYS THIS ENDPOINT SHOULD NOT BE CALLED FROM OTHER
 * FEATURES. That note is accurate about the surfaces it names: `FeedPostDataDto` and the search
 * DTO both embed `authorEliteScore` and `authorLevelName`, so a post card renders the chip from
 * data it already holds. **`CommentResponseDto` embeds neither** — its ten fields are `id ·
 * postId · authorId · authorUsername · authorFullName · authorProfilePictureUrl · content ·
 * parentId · createdAt/updatedAt · likeCount · myReaction` — so a comment's identity row has no
 * way to show a score except by asking. The real fix is the backend adding the same two columns
 * to the comment DTO from the join its post mapper already does; until then, this.
 *
 * IT IS A BATCH IN SHAPE ONLY — there is no batch endpoint (`ReputationController` has exactly
 * one route, `GET /users/{userId}/reputation`), so this is N requests and the name should not
 * pretend otherwise. What it does do is make N *visible and bounded*: the caller hands over every
 * id it is about to render, the set is de-duplicated here, and one component holds the whole
 * cost instead of it being smeared across a hook call inside every row. A thread of six comments
 * from four people is four requests, not six — and the app-wide `staleTime` of 60s means the
 * same four are free for the rest of the minute, including on the next post those people appear
 * under.
 *
 * SORTED BEFORE USE so that the same set of ids in a different order does not produce a different
 * `queries` array on every render.
 */
export function useReputations(userIds: number[]) {
  const ids = Array.from(new Set(userIds)).sort((a, b) => a - b);

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: reputationKeys.user(id),
      queryFn: () => reputationApi.getReputation(id),
    })),
    /**
     * `combine` RATHER THAN MAPPING THE RESULT ARRAY IN THE CALLER. `useQueries` returns a fresh
     * array every render, so a `useMemo` over it in the component would never hit — React Query
     * memoises `combine`'s output structurally instead, which is the whole reason the option
     * exists. The map is therefore referentially stable while the data is.
     *
     * A FAILED LOOKUP IS SIMPLY ABSENT. No entry means no chip, which is the same thing a score
     * of zero or a 404 means to a reader: nothing to show. Nothing here surfaces an error —
     * a comment is still perfectly readable without a number beside its author's name.
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
