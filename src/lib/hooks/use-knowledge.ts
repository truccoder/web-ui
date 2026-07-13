'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { knowledgeApi } from '@/lib/api/knowledge';
import { getErrorMessage } from '@/lib/api/error';
import type {
  CreateTokenRequest,
  ExplainPostRequest,
  ProfessionalProfile,
  SaveExplanationRequest,
  UpdateProfessionalProfileRequest,
} from '@/lib/types';

// ─── AI explanations ─────────────────────────────────────────────────────────

// Mutation (not a query): each call invokes the AI pipeline and may produce a new
// version, so it should only run on an explicit user action, never on mount/refocus.
export function useExplainPost() {
  return useMutation({
    mutationFn: (vars: { postId: number } & ExplainPostRequest) =>
      knowledgeApi
        .explainPost(
          vars.postId,
          vars.feedbackNote ? { feedbackNote: vars.feedbackNote } : undefined
        )
        .then((r) => r.data),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to explain post'));
    },
  });
}

export function useSaveExplanation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveExplanationRequest) =>
      knowledgeApi.saveExplanation(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-library'] });
      toast.success('Saved to your knowledge library');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to save explanation'));
    },
  });
}

export function useKnowledgeLibrary(enabled = true) {
  return useQuery({
    queryKey: ['knowledge-library'],
    queryFn: () => knowledgeApi.getMyLibrary().then((r) => r.data),
    enabled,
  });
}

// ─── Professional profile ────────────────────────────────────────────────────

// Backend 404s when the user hasn't set up a profile yet — that's the normal state for
// new accounts, so it maps to `null` data instead of a query error.
export function useProfessionalProfile(enabled = true) {
  return useQuery({
    queryKey: ['professional-profile'],
    queryFn: async (): Promise<ProfessionalProfile | null> => {
      try {
        const r = await knowledgeApi.getProfessionalProfile();
        return r.data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled,
  });
}

export function useUpdateProfessionalProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfessionalProfileRequest) =>
      knowledgeApi.updateProfessionalProfile(payload).then((r) => r.data),
    onSuccess: (profile) => {
      qc.setQueryData(['professional-profile'], profile);
      // Friend suggestions are re-ranked by professional background (same primaryRole,
      // tech stack overlap), so a profile change should refresh them.
      qc.invalidateQueries({ queryKey: ['friend-suggestions'] });
      toast.success('Professional profile updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update professional profile'));
    },
  });
}

// ─── Personal access tokens ──────────────────────────────────────────────────

export function usePersonalAccessTokens(enabled = true) {
  return useQuery({
    queryKey: ['pat-tokens'],
    queryFn: () => knowledgeApi.listTokens().then((r) => r.data),
    enabled,
  });
}

// The mutation result's `token` field is the only time the raw token is visible —
// the UI must surface it immediately; list responses only carry the hash.
export function useCreatePersonalAccessToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTokenRequest) =>
      knowledgeApi.createToken(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pat-tokens'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create token'));
    },
  });
}

export function useRevokePersonalAccessToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: number) => knowledgeApi.revokeToken(tokenId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pat-tokens'] });
      toast.success('Token revoked');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to revoke token'));
    },
  });
}
