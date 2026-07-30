import api from '@/core/api/axios';
import type {
  UserResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ProfilePictureUploadResponse,
} from '@/lib/types';

export const profileApi = {
  getProfile: () => api.get<UserResponse>('/v1/api/profile/me'),

  updateProfile: (data: UpdateProfileRequest) => api.put<UserResponse>('/v1/api/profile', data),

  changePassword: (data: ChangePasswordRequest) => api.put<void>('/v1/api/profile/password', data),

  uploadProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.put<ProfilePictureUploadResponse>('/v1/api/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
