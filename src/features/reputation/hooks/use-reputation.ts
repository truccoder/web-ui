'use client';

import { useQuery } from '@tanstack/react-query';
import { reputationApi } from '../api/reputation';
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
