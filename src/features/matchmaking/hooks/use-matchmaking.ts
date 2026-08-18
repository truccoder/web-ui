'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { matchmakingApi } from '../api';
import type { ApplyToPositionInput, CreateProjectInput, Project } from '../types/matchmaking';
import { matchmakingKeys } from './keys';

/**
 * Matchmaking state layer.
 *
 * THE OLD FILE NOTE SAID "NOTHING HERE INVALIDATES ANYTHING, AND THAT IS NOT AN OVERSIGHT" —
 * because every write moved a list that no endpoint exposed. All three lists exist now, so every
 * write here moves something readable and every one of them invalidates.
 *
 * WHAT MOVES WHAT, since it is not symmetric:
 *  - creating a project prepends to the browse list
 *  - applying appends to the applicant's own list, and to the owner's inbox they cannot see
 *  - accepting or rejecting moves one application's status AND can change the POSITION's status,
 *    because filling the last slot marks the role `FILLED` — so the project read is stale too,
 *    not just the inbox
 *
 * That last one is the reason accept/reject invalidate the whole namespace rather than one key: a
 * `void` response cannot say whether the position tipped over, and guessing wrong leaves an
 * `OPEN` badge on a role nobody can apply to any more.
 */

export type MatchmakingMutationOptions<TVariables, TData = void> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>;

/** GET /projects — the browse list, cursor-paged. */
export function useProjects(limit = 10) {
  return useInfiniteQuery({
    queryKey: matchmakingKeys.projects(limit),
    queryFn: ({ pageParam }) => matchmakingApi.getProjects(pageParam, limit),
    initialPageParam: undefined as number | undefined,
    // `hasMore` is the whole pagination contract — there is no total and no page count, so the
    // cursor is only followed while the server says there is more behind it.
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  });
}

/** GET /projects/{id} — one project with its positions. `undefined` keeps the query idle. */
export function useProject(projectId: number | undefined) {
  return useQuery({
    queryKey: matchmakingKeys.project(projectId!),
    queryFn: () => matchmakingApi.getProject(projectId!),
    enabled: projectId !== undefined,
  });
}

/**
 * GET /projects/{id}/applications — the owner's inbox.
 *
 * `enabled` IS A PERMISSION GATE HERE, not just an optimisation. This endpoint answers 403 to
 * anyone who is not the project's author, so a screen must decide from `authorId` whether to ask
 * at all — calling it to find out would put a guaranteed error in the console of every visitor
 * looking at someone else's project.
 */
export function useProjectApplications(projectId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: matchmakingKeys.projectApplications(projectId!),
    queryFn: () => matchmakingApi.getProjectApplications(projectId!),
    enabled: projectId !== undefined && enabled,
  });
}

/** GET /projects/applications/mine. */
export function useMyApplications() {
  return useQuery({
    queryKey: matchmakingKeys.myApplications,
    queryFn: matchmakingApi.getMyApplications,
  });
}

/**
 * GET /positions/{positionId}/suggested-candidates.
 *
 * IT USED TO 500 ON EVERY CALL (B24: the one native query in the backend omitted the schema
 * qualifier). Consumers should still handle `isError` as a normal outcome rather than a bug —
 * and must not present the result as a ranking: matching is "shares at least one skill", with no
 * score and no ordering.
 */
export function useSuggestedCandidates(positionId: number | undefined) {
  return useQuery({
    queryKey: matchmakingKeys.suggestedCandidates(positionId!),
    queryFn: () => matchmakingApi.getSuggestedCandidates(positionId!),
    enabled: positionId !== undefined,
  });
}

/** POST /projects. Returns the created project, ids included, so the caller can open it. */
export function useCreateProject(
  options?: MatchmakingMutationOptions<CreateProjectInput, Project>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectInput) => matchmakingApi.createProject(payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface ApplyToPositionVariables {
  positionId: number;
  payload: ApplyToPositionInput;
}

/** POST /positions/{positionId}/apply. Fails when the position is not `OPEN`. */
export function useApplyToPosition(options?: MatchmakingMutationOptions<ApplyToPositionVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, payload }: ApplyToPositionVariables) =>
      matchmakingApi.applyToPosition(positionId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: number) => matchmakingApi.acceptApplication(applicationId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/** POST /applications/{applicationId}/reject. */
export function useRejectApplication(options?: MatchmakingMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: number) => matchmakingApi.rejectApplication(applicationId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}
