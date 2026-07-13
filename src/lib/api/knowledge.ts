import api from './axios';
import type {
  ExplanationResponse,
  ExplainPostRequest,
  SaveExplanationRequest,
  KnowledgeLibraryResponse,
  ProfessionalProfile,
  UpdateProfessionalProfileRequest,
  CreateTokenRequest,
  CreateTokenResponse,
  PersonalAccessToken,
} from '@/lib/types';

// NOTE: /v1/api/knowledge/sync/pull|push are deliberately not wrapped here — they
// authenticate with a Personal Access Token (not the session JWT) and exist for
// external vault clients, not the web app.
export const knowledgeApi = {
  // AI explanation of a post; pass feedbackNote to steer a re-explanation.
  explainPost: (postId: number, payload?: ExplainPostRequest) =>
    api.post<ExplanationResponse>(`/v1/api/knowledge/posts/${postId}/explain`, payload ?? {}),

  saveExplanation: (payload: SaveExplanationRequest) =>
    api.post<ExplanationResponse>('/v1/api/knowledge/save', payload),

  getMyLibrary: () => api.get<KnowledgeLibraryResponse>('/v1/api/knowledge/my-library'),

  getProfessionalProfile: () => api.get<ProfessionalProfile>('/v1/api/profile/professional'),

  updateProfessionalProfile: (payload: UpdateProfessionalProfileRequest) =>
    api.put<ProfessionalProfile>('/v1/api/profile/professional', payload),

  createToken: (payload: CreateTokenRequest) =>
    api.post<CreateTokenResponse>('/v1/api/tokens', payload),

  listTokens: () => api.get<PersonalAccessToken[]>('/v1/api/tokens'),

  revokeToken: (tokenId: number) => api.delete<void>(`/v1/api/tokens/${tokenId}`),
};
