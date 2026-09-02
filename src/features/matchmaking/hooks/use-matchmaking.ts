'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { matchmakingApi } from '../api';
import type {
  ApplyToPositionInput,
  CreatePositionInput,
  CreateProjectInput,
  Project,
  ProjectPosition,
  ProjectStatus,
  UpdatePositionInput,
  UpdateProjectInput,
} from '../types/matchmaking';
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

/**
 * GET /projects — the browse list, cursor-paged.
 *
 * `enabled` IS A SECOND-CHOICE GATE, not a permission one (that is `useProjectApplications`).
 * `GET /projects/suggested` is the ranked answer and `[]` is its ordinary reply — for a caller
 * with no professional profile it is the ONLY reply — so a screen that prefers the ranking has to
 * be able to hold this list back until the ranking has spoken, then let it through. Cached pages
 * are still served while it is off, which is the point: the shared key means the fallback is
 * usually already in hand by the time it is wanted.
 */
export function useProjects(limit = 10, enabled = true) {
  return useInfiniteQuery({
    queryKey: matchmakingKeys.projects(limit),
    queryFn: ({ pageParam }) => matchmakingApi.getProjects(pageParam, limit),
    enabled,
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
 * GET /projects/{id}/members — the team roster.
 *
 * `enabled` IS AN OPTIMISATION, NOT A PERMISSION GATE (unlike `useProjectApplications`): any
 * signed-in user may read this, and the detail screen shows it to everyone. `undefined` keeps it
 * idle while the id resolves.
 */
export function useProjectMembers(projectId: number | undefined) {
  return useQuery({
    queryKey: matchmakingKeys.projectMembers(projectId!),
    queryFn: () => matchmakingApi.getProjectMembers(projectId!),
    enabled: projectId !== undefined,
  });
}

/**
 * GET /positions/{positionId}/suggested-candidates — best match first (B26).
 *
 * IT USED TO 500 ON EVERY CALL (B24: the one native query in the backend omitted the schema
 * qualifier), and once fixed carried no score or order. Both are stale: the backend now ranks by
 * `matchScore` and returns it with each row, so consumers may present position, not just content.
 * `isError` is still a normal outcome to handle (a position simply has no matches) rather than a
 * bug to report.
 */
export function useSuggestedCandidates(positionId: number | undefined, limit = 10) {
  return useQuery({
    queryKey: matchmakingKeys.suggestedCandidates(positionId!, limit),
    queryFn: () => matchmakingApi.getSuggestedCandidates(positionId!, limit),
    enabled: positionId !== undefined,
  });
}

/**
 * GET /projects/suggested — projects ranked against the caller's own professional profile (B26,
 * new). `[]` covers both "no profile yet" and "nothing scored above 0", and is the common case
 * rather than an error; a screen using this should hide itself on an empty list instead of
 * showing an empty-state block for what is, most of the time, an unremarkable answer.
 */
export function useSuggestedProjects(limit = 10) {
  return useQuery({
    queryKey: matchmakingKeys.suggestedProjects(limit),
    queryFn: () => matchmakingApi.getSuggestedProjects(limit),
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

/**
 * ─── PROJECT MANAGEMENT (BE `task/E4rkd1nF`). ────────────────────────────────────────────────
 *
 * Every one of these invalidates the whole `matchmaking` namespace, for the same reason
 * accept/reject do: the writes cross list boundaries. Editing a position can flip it
 * `FILLED ↔ OPEN`; removing a member moves an application to `REMOVED`, reopens a role AND drops a
 * name from the roster; deleting a project takes its positions and applications with it. A
 * narrower key would leave one of those three reads stale.
 */

export interface UpdateProjectVariables {
  projectId: number;
  payload: UpdateProjectInput;
}

/** PUT /projects/{id}. 409 when the project is `COMPLETED`. */
export function useUpdateProject(
  options?: MatchmakingMutationOptions<UpdateProjectVariables, Project>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: UpdateProjectVariables) =>
      matchmakingApi.updateProject(projectId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface UpdateProjectStatusVariables {
  projectId: number;
  status: ProjectStatus;
}

/** PATCH /projects/{id}/status. `→ COMPLETED` is one-way (409 on any move out of it). */
export function useUpdateProjectStatus(
  options?: MatchmakingMutationOptions<UpdateProjectStatusVariables, Project>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, status }: UpdateProjectStatusVariables) =>
      matchmakingApi.updateProjectStatus(projectId, status),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/** DELETE /projects/{id} — hard delete. The caller's `onSuccess` navigates away. */
export function useDeleteProject(options?: MatchmakingMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => matchmakingApi.deleteProject(projectId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface AddPositionVariables {
  projectId: number;
  payload: CreatePositionInput;
}

/** POST /projects/{id}/positions. 409 when the project is `COMPLETED`. */
export function useAddPosition(
  options?: MatchmakingMutationOptions<AddPositionVariables, ProjectPosition>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: AddPositionVariables) =>
      matchmakingApi.addPosition(projectId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface UpdatePositionVariables {
  positionId: number;
  payload: UpdatePositionInput;
}

/** PUT /projects/positions/{id}. 409 when `quantity` is below the seats already `ACCEPTED`. */
export function useUpdatePosition(
  options?: MatchmakingMutationOptions<UpdatePositionVariables, ProjectPosition>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, payload }: UpdatePositionVariables) =>
      matchmakingApi.updatePosition(positionId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface UpdatePositionStatusVariables {
  positionId: number;
  status: 'OPEN' | 'CLOSED';
}

/** PATCH /projects/positions/{id}/status. Reopening a full role answers 409. */
export function useUpdatePositionStatus(
  options?: MatchmakingMutationOptions<UpdatePositionStatusVariables, ProjectPosition>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, status }: UpdatePositionStatusVariables) =>
      matchmakingApi.updatePositionStatus(positionId, status),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/** DELETE /projects/positions/{id}. 409 while any member is still `ACCEPTED` on it. */
export function useDeletePosition(options?: MatchmakingMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (positionId: number) => matchmakingApi.deletePosition(positionId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface RemoveMemberVariables {
  projectId: number;
  userId: number;
}

/** DELETE /projects/{projectId}/members/{userId}. Removes them from every position they hold. */
export function useRemoveMember(options?: MatchmakingMutationOptions<RemoveMemberVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: RemoveMemberVariables) =>
      matchmakingApi.removeMember(projectId, userId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/**
 * DELETE /projects/applications/{applicationId} — the applicant withdraws.
 *
 * 409 once the owner has acted (only `PENDING` withdraws), which is a real race on a shared row:
 * surface it rather than assuming the delete took.
 */
export function useWithdrawApplication(options?: MatchmakingMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: number) => matchmakingApi.withdrawApplication(applicationId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: matchmakingKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}
