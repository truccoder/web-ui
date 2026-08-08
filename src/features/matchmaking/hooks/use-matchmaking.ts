'use client';

import { useMutation, useQuery, type UseMutationOptions } from '@tanstack/react-query';
import { matchmakingApi } from '../api';
import type { ApplyToPositionInput, CreateProjectInput } from '../types/matchmaking';
import { matchmakingKeys } from './keys';

/**
 * Matchmaking state layer.
 *
 * NOTHING HERE INVALIDATES ANYTHING, AND THAT IS NOT AN OVERSIGHT. Accepting or rejecting an
 * application changes an application list that no endpoint exposes; creating a project changes a
 * project list that no endpoint exposes. The single cached query — the candidate shortlist — is
 * derived from a position's `requiredSkills`, which no endpoint can change after creation. So
 * there is genuinely no cached read that any of these writes can move. When the backend adds the
 * missing lists (B24), that changes and this file grows invalidations.
 *
 * Callers still pass their own `onSuccess` for anything they need to do afterwards.
 */

export type MatchmakingMutationOptions<TVariables, TData = void> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>;

/**
 * GET /positions/{positionId}/suggested-candidates.
 *
 * **CURRENTLY 500s ON EVERY CALL** — the backend's native query omits the schema qualifier (B24).
 * The hook is written correctly and will start working the moment that is fixed; consumers should
 * expect `isError` for now.
 *
 * `undefined` disables it. Necessary rather than tidy: a position id can only come from outside
 * this app today, so a screen will often have none.
 */
export function useSuggestedCandidates(positionId: number | undefined) {
  return useQuery({
    // Non-null assertion is safe: `enabled` gates the fn and the key is only built with an id.
    queryKey: matchmakingKeys.suggestedCandidates(positionId!),
    queryFn: () => matchmakingApi.getSuggestedCandidates(positionId!),
    enabled: positionId !== undefined,
  });
}

/**
 * POST /projects.
 *
 * The response is `void`, so this cannot hand back the project it created — the caller learns only
 * that the request was accepted. Any screen built on this has to say exactly that and no more.
 */
export function useCreateProject(options?: MatchmakingMutationOptions<CreateProjectInput>) {
  return useMutation({
    mutationFn: (payload: CreateProjectInput) => matchmakingApi.createProject(payload),
    ...options,
  });
}

export interface ApplyToPositionVariables {
  positionId: number;
  payload: ApplyToPositionInput;
}

/** POST /positions/{positionId}/apply. Fails when the position is not `OPEN`. */
export function useApplyToPosition(options?: MatchmakingMutationOptions<ApplyToPositionVariables>) {
  return useMutation({
    mutationFn: ({ positionId, payload }: ApplyToPositionVariables) =>
      matchmakingApi.applyToPosition(positionId, payload),
    ...options,
  });
}

/**
 * POST /applications/{applicationId}/accept.
 *
 * Can fail for a reason the user did nothing to cause: the position row is locked per transaction,
 * so a concurrent accept that fills the last slot makes this one refuse. Surface the error rather
 * than assuming success.
 */
export function useAcceptApplication(options?: MatchmakingMutationOptions<number>) {
  return useMutation({
    mutationFn: (applicationId: number) => matchmakingApi.acceptApplication(applicationId),
    ...options,
  });
}

/** POST /applications/{applicationId}/reject. */
export function useRejectApplication(options?: MatchmakingMutationOptions<number>) {
  return useMutation({
    mutationFn: (applicationId: number) => matchmakingApi.rejectApplication(applicationId),
    ...options,
  });
}
