import api from './axios';
import type {
  LoginResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  SessionResponse,
} from '@/lib/types';

export const userApi = {
  updateProfile: (data: UpdateProfileRequest) => api.put<LoginResponse>('/v1/api/me/profile', data),

  uploadProfilePicture: (file: File, refreshToken: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('refreshToken', refreshToken);
    return api.post<LoginResponse>('/v1/api/me/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  changePassword: (data: ChangePasswordRequest) =>
    api.post<void>('/v1/api/me/change-password', data),

  listSessions: () => api.get<SessionResponse[]>('/v1/api/me/sessions'),

  revokeSession: (sessionId: string) => api.delete<void>(`/v1/api/me/sessions/${sessionId}`),

  revokeOtherSessions: () => api.delete<void>('/v1/api/me/sessions'),
};
