'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useMyProfile } from '@/features/security';
import { roadmapApi, skillVerificationApi } from '../api';
import type {
  CreateRoadmapInput,
  CreateRoadmapNodeInput,
  RoadmapNode,
  SkillVerificationInput,
} from '../types/roadmap';
import { roadmapKeys } from './keys';

/**
 * Roadmap state layer. Hooks return the feature's own types and stay free of toasts and
 * navigation; the screens own feedback. Same shape as every other feature here.
 *
 * THE ADMIN GATE IN THIS FILE IS NOT SECURITY, AND MUST NOT BE MISTAKEN FOR IT. Five of the eight
 * endpoints are meant to be admin/moderator-only and the backend does not enforce that at all
 * (B20 — `@PreAuthorize` without `@EnableMethodSecurity`; a plain seed user creating a roadmap
 * measured **200**). `useIsRoadmapAdmin` below exists so this app does not *offer* those actions
 * to everyone, which is a UX and honesty concern. Anyone who wants to call them anyway still can,
 * with curl, and will succeed until the backend is fixed.
 */

export type RoadmapMutationOptions<TVariables, TData = void> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>;

/**
 * Whether the signed-in user may be shown the authoring and moderation surfaces.
 *
 * ADMIN ONLY, DELIBERATELY, even though the backend annotations say `hasAnyRole('ADMIN',
 * 'MODERATOR')`. `UserRole` on the backend is `{USER, ADMIN}` — there is no `MODERATOR` member,
 * so the annotation names a role nobody can hold and admitting moderators here would be gating on
 * a value that cannot occur. Recorded in `findings/roadmap.md` §1; if the role is ever added, this
 * is the one place that changes.
 *
 * Reads the profile through `features/security`'s barrel rather than the legacy `role` cookie in
 * `lib/hooks/use-admin-role.ts`: that cookie exists for edge middleware, which cannot reach the
 * query cache, and is scheduled for removal at P3.4. A feature has no business reading it.
 *
 * `isPending` is surfaced separately because "not an admin" and "we do not know yet" must render
 * differently — treating the loading state as a denial makes the controls flicker in and out on
 * every mount.
 */
export function useIsRoadmapAdmin() {
  const profile = useMyProfile();
  return {
    isAdmin: profile.data?.role === 'ADMIN',
    isPending: profile.isPending,
  };
}

/** GET /v1/api/roadmaps — every roadmap, unpaginated. */
export function useRoadmaps() {
  return useQuery({
    queryKey: roadmapKeys.roadmaps,
    queryFn: () => roadmapApi.getRoadmaps(),
  });
}

/**
 * GET /v1/api/roadmaps/{id}/nodes — the nodes of one roadmap, SORTED HERE.
 *
 * `undefined` disables it, so a screen can mount before the user has picked a roadmap.
 *
 * THE SORT IS THIS HOOK'S JOB BECAUSE THE BACKEND DOES NOT DO IT. `RoadmapNodeRepository`
 * declares a plain `findByRoadmapId` with no `OrderBy`, so rows arrive in whatever order the
 * database chose — stable enough in a small dev table to look correct, and free to change in
 * production. Sorting once here rather than in each component means a second consumer cannot
 * forget; `select` runs after caching, so the cost is paid per fetch, not per render.
 *
 * Ties break on `id` so the order is TOTAL. `orderIndex` defaults to 0 for every node created
 * without one, which in practice means whole roadmaps share a single index — without the
 * tiebreak, `sort` would leave those in backend order and reintroduce exactly the instability
 * this is here to remove.
 */
export function useRoadmapNodes(roadmapId: number | undefined) {
  return useQuery({
    // Non-null assertion is safe: `enabled` gates the fn and the key is only built with an id.
    queryKey: roadmapKeys.nodes(roadmapId!),
    queryFn: () => roadmapApi.getRoadmapNodes(roadmapId!),
    enabled: roadmapId !== undefined,
    select: (nodes: RoadmapNode[]) =>
      [...nodes].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id),
  });
}

/**
 * POST /v1/api/roadmaps — admin surface (see the file note).
 *
 * The response is the request echoed back with an id, not a re-read, so the list is invalidated
 * rather than patched: a `setQueryData` here would seed the cache from the caller's own input.
 */
export function useCreateRoadmap(options?: RoadmapMutationOptions<CreateRoadmapInput, unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoadmapInput) => roadmapApi.createRoadmap(payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.roadmaps });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export interface CreateRoadmapNodeVariables {
  roadmapId: number;
  payload: CreateRoadmapNodeInput;
}

/**
 * POST /v1/api/roadmaps/{id}/nodes — admin surface (see the file note).
 *
 * INVALIDATES THE ONE ROADMAP, NOT ALL OF THEM. The node belongs to a known roadmap, so the
 * narrow key is both correct and cheap. `nodesAll` exists for a caller that genuinely cannot know
 * — nothing needs it yet, and inventing a use for it here would refetch every other roadmap's
 * nodes to no purpose.
 *
 * Refetching is also the only way to learn the node's real `orderIndex`: the create response
 * echoes the request, so it reports `null` for a field the database defaulted to 0.
 */
export function useCreateRoadmapNode(
  options?: RoadmapMutationOptions<CreateRoadmapNodeVariables, unknown>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roadmapId, payload }: CreateRoadmapNodeVariables) =>
      roadmapApi.createRoadmapNode(roadmapId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.nodes(variables.roadmapId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/**
 * GET /v1/api/skills/pending — the moderator queue.
 *
 * `enabled` is the caller's gate, wired from `useIsRoadmapAdmin`. Left to the caller rather than
 * read inside this hook so that a screen which has already resolved the role does not make every
 * mount wait on the profile query a second time.
 */
export function usePendingVerifications(enabled = true) {
  return useQuery({
    queryKey: roadmapKeys.pendingVerifications,
    queryFn: () => skillVerificationApi.getPendingVerifications(),
    enabled,
  });
}

/**
 * POST /v1/api/skills/verify — claim a node.
 *
 * INVALIDATES NOTHING, AND THAT IS NOT AN OVERSIGHT. There is no endpoint that reads a user's own
 * progress back (B21), so there is no cached query this could refresh. The queue is not it
 * either: only `MOD_VERIFIED` and `QUIZ_VERIFIED` land there, and only an admin can read it, so
 * invalidating `pendingVerifications` from an ordinary user's submission would refetch a list
 * they are not allowed to see.
 *
 * A SUCCESSFUL MUTATION DOES NOT MEAN THE CLAIM WAS ACCEPTED. The endpoint returns `void` and the
 * four tiers behave differently behind it — `SELF_VERIFIED` verifies instantly, the two mod tiers
 * queue, and `AUTO_CERTIFIED` is checked on the spot and may be **rejected**, still answering 200.
 * Callers must phrase success as "submitted", never "verified".
 *
 * Reputation moves for two of those tiers, and this deliberately does not invalidate it: that is
 * another domain's cache, which CLAUDE.md §4 forbids this hook from touching. A screen showing
 * both passes its own `onSuccess`.
 */
export function useSubmitVerification(options?: RoadmapMutationOptions<SkillVerificationInput>) {
  return useMutation({
    mutationFn: (payload: SkillVerificationInput) =>
      skillVerificationApi.submitVerification(payload),
    ...options,
  });
}

/**
 * POST /v1/api/skills/{progressId}/approve — moderator surface (see the file note).
 *
 * THE QUEUE IS SHARED, SO FAILURE IS A NORMAL OUTCOME. Only a `PENDING_APPROVAL` row can be
 * approved; anything else throws "Cannot approve a verification request that is already …". Two
 * moderators working the same list means the second one gets an error rather than a no-op, which
 * is why the queue is invalidated on success — and why the UI must show the error rather than
 * assume it acted on a stale row.
 *
 * Awards `ROADMAP_NODE_VERIFIED` reputation to the REQUESTER. Not invalidated here: it is another
 * user's score and another domain's cache.
 */
export function useApproveVerification(options?: RoadmapMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (progressId: number) => skillVerificationApi.approveVerification(progressId),
    ...options,
    onSuccess: (data, progressId, ...rest) => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.pendingVerifications });
      options?.onSuccess?.(data, progressId, ...rest);
    },
  });
}

/**
 * POST /v1/api/skills/{progressId}/reject — moderator surface (see the file note).
 *
 * Same `PENDING_APPROVAL`-only rule as approve. No reputation is awarded or revoked: rejecting is
 * not the inverse of approving, it is the other terminal state.
 */
export function useRejectVerification(options?: RoadmapMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (progressId: number) => skillVerificationApi.rejectVerification(progressId),
    ...options,
    onSuccess: (data, progressId, ...rest) => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.pendingVerifications });
      options?.onSuccess?.(data, progressId, ...rest);
    },
  });
}
