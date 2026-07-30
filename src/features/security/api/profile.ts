import api from '@/core/api/axios';
import type {
  ChangePasswordRequest,
  ProfilePictureResponse,
  UpdateProfileRequest,
  UserProfile,
} from '../types/profile';

/**
 * ProfileController (security cycle 3). One function per endpoint, bare-DTO responses.
 * There is only `GET /profile/me` — the backend exposes no public profile endpoint, so
 * other users' profiles cannot be deep-linked (see ledger / no-public-profile note).
 */
export const profileApi = {
  /** GET /v1/api/profile/me — the signed-in user's profile. */
  getMyProfile: () => api.get<UserProfile>('/v1/api/profile/me').then((r) => r.data),

  /** PUT /v1/api/profile — updates the display name; returns the fresh profile. */
  updateProfile: (body: UpdateProfileRequest) =>
    api.put<UserProfile>('/v1/api/profile', body).then((r) => r.data),

  /** PUT /v1/api/profile/password — changes the password; returns nothing. */
  changePassword: (body: ChangePasswordRequest) =>
    api.put<void>('/v1/api/profile/password', body).then((r) => r.data),

  /**
   * PUT /v1/api/profile/picture — multipart upload; returns the new picture URL.
   *
   * Content-Type is left unset so the browser generates the multipart boundary; the
   * axios instance strips its JSON default for FormData bodies.
   */
  changeProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.put<ProfilePictureResponse>('/v1/api/profile/picture', formData).then((r) => r.data);
  },
};
