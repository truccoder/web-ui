'use client';

import { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { explanationApi, professionalProfileApi, tokenApi } from '../api';
import type {
  CreateTokenInput,
  SaveExplanationInput,
  UpdateProfessionalProfileInput,
} from '../types/knowledge';
import { knowledgeKeys } from './keys';

/**
 * Knowledge state layer. Hooks return the feature's own DTOs directly and stay free of toasts and
 * navigation; the screens own feedback. Same shape as every other feature here.
 *
 * Two rules are specific to this domain and neither is a matter of taste:
 * `useProfessionalProfile` must not retry a 404, and `useExplainPost` must not retry at all.
 */

/**
 * The signed-in user's professional profile.
 *
 * A 404 IS A VALID ANSWER — "no profile yet" — and the retry is switched off for it. The endpoint
 * is `findById().orElseThrow`, with no get-or-create, so a user who has never filled the form gets
 * a 404 every single time. Left on the shared `retry: 1`, every such visit would issue a second
 * pointless request and sit in a loading state twice as long before admitting the truth. Other
 * statuses keep one retry, because those really can be transient.
 *
 * The 404 still surfaces as `isError`; consumers distinguish it with `isProfileMissing` below
 * rather than this hook pretending the profile is an empty object. Inventing a blank profile here
 * would make "never filled in" indistinguishable from "filled in and then cleared", and the form
 * needs to tell those apart to decide between creating and replacing.
 */
export function useProfessionalProfile(enabled = true) {
  return useQuery({
    queryKey: knowledgeKeys.profile,
    queryFn: () => professionalProfileApi.getProfile(),
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof AxiosError && error.response?.status === 404) return false;
      return failureCount < 1;
    },
  });
}

/** Whether a `useProfessionalProfile` error is the benign "not set up yet" case. */
export function isProfileMissing(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

/**
 * Whether an `explainPost` failure is "you have no professional profile yet".
 *
 * `explainPost` refuses to run without one — it throws `PRECONDITION_REQUIRED` (**428**) with
 * "Professional profile required. Please set up your profile first.". That check happens BEFORE
 * the model call, so this branch costs nothing, and it is the one hard coupling between the two
 * halves of this domain: the profile is what the prompt is built from.
 *
 * Worth distinguishing from a generic failure because the fix is a specific action the user can
 * take, not a retry — and retrying is exactly the wrong response to an operation that bills.
 */
export function isProfileRequired(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 428;
}

/**
 * Create or replace the professional profile.
 *
 * THE CALLER MUST PASS THE WHOLE PROFILE. `PUT` is a full replace — measured: omitted fields come
 * back null and the previous values are gone. `UpdateProfessionalProfileInput` requires every key
 * so a forgotten field is a compile error, but no type can stop a caller passing `null` for
 * something it never loaded, so the form must render from a fetched profile rather than from
 * blank state.
 *
 * The response is the saved profile, so it is written straight into the cache — authoritative, and
 * it avoids a refetch of something the server just handed back. This also flips the query out of
 * its 404 state on first creation without a second round trip.
 */
export function useUpdateProfessionalProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfessionalProfileInput) =>
      professionalProfileApi.updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(knowledgeKeys.profile, profile);
    },
  });
}

/** The user's personal access tokens, secrets excluded. `[]` rather than 404 when there are none. */
export function usePersonalAccessTokens(enabled = true) {
  return useQuery({
    queryKey: knowledgeKeys.tokens,
    queryFn: () => tokenApi.listTokens(),
    enabled,
  });
}

/**
 * Mint a personal access token.
 *
 * THE SECRET IN THE RESULT IS NOT CACHED, deliberately. `POST /tokens` is the only response that
 * ever contains `token`, and writing it into the query cache would leave a long-lived credential
 * sitting in memory — and in any devtools or cache dump — long after the dialog that needed it
 * closed. The list is invalidated instead, which refetches the secret-free rows; the raw value
 * lives only in the calling component's state, for as long as its dialog is open.
 */
export function useCreateToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTokenInput) => tokenApi.createToken(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.tokens });
    },
  });
}

/**
 * Revoke a token.
 *
 * An unknown id is a real 404 here rather than a silent success, so the error is worth showing —
 * unlike `markAsRead` in `notifications`, where a 200 proves nothing.
 */
export function useRevokeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: number) => tokenApi.revokeToken(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.tokens });
    },
  });
}

/** Everything the user has saved. `totalCount === 0` is the empty state; never a 404. */
export function useKnowledgeLibrary(enabled = true) {
  return useQuery({
    queryKey: knowledgeKeys.library,
    queryFn: () => explanationApi.getMyLibrary(),
    enabled,
  });
}

/**
 * Ask the model to explain a post.
 *
 * A MUTATION WITH RETRIES DISABLED, BECAUSE EVERY CALL SPENDS GEMINI QUOTA.
 * `ExplanationService.explainPost` calls `geminiClient.generateContent`, which makes this the only
 * read-shaped operation in the app that costs money per invocation. Two consequences, both
 * enforced here rather than left to each caller:
 *
 *  - It is a mutation, so no refetch policy can fire it: not on mount, not on reconnect, not
 *    through an `invalidateQueries` that happens to touch its key.
 *  - `retry: 0` overrides the shared client's `retry: 1`. A retry on a timeout would bill a second
 *    generation for a request that may well have succeeded on the server — the worst case being
 *    two paid generations for one click.
 *
 * NOTHING IS CACHED AND NOTHING IS INVALIDATED. The result is not persisted by the backend either;
 * `useSaveExplanation` is what puts it in the library. Caching it under a query key would invite
 * a later refetch of an operation that must only ever run when a person asks for it.
 *
 * The 404 for an unknown post id happens before the model call, so that branch is free.
 */
export function useExplainPost() {
  return useMutation({
    mutationFn: ({ postId, feedbackNote }: { postId: number; feedbackNote?: string }) =>
      explanationApi.explainPost(postId, feedbackNote),
    retry: 0,
  });
}

/**
 * Keep a generated explanation in the library.
 *
 * Separate from generating on purpose: an explanation is shown first and stored only if the user
 * asks, so nothing reaches the library — or costs a second generation to reproduce — by accident.
 */
export function useSaveExplanation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveExplanationInput) => explanationApi.saveExplanation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.library });
    },
  });
}
