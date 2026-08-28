import api from '@/core/api/axios';
import type {
  PublicProfile,
  ChangePasswordRequest,
  ProfilePictureResponse,
  UpdateProfileRequest,
  UserProfile,
} from '../types/profile';

/**
 * ProfileController (security cycle 3). One function per endpoint, bare-DTO responses.
 *
 * THE "NO PUBLIC PROFILE" CEILING IS GONE. This block used to say there was only
 * `GET /profile/me` and that other users could not be deep-linked; `GET /users/{username}/profile`
 * shipped on 2026-08-09 and `getPublicProfile` below calls it. Note the asymmetry that survives:
 * the public read is keyed by USERNAME while every other per-user read is keyed by ID, which is
 * why `/u/{username}` resolves the handle once and drives every section from `profile.id`.
 */
export const profileApi = {
  /**
   * GET /v1/api/users/{username}/profile — someone else's profile.
   *
   * OPEN TO SIGNED-OUT VISITORS. The controller reads the viewer with the non-throwing accessor
   * precisely so a guest gets the public subset rather than a 401, which is why this is safe to
   * call from a surface that does not require a session.
   *
   * KEYED BY HANDLE, unlike every other per-user read in the app (`/users/{userId}/posts`,
   * `/users/{userId}/reputation`, `/users/{userId}/roadmap-progress`). The backend's own note
   * explains the split: a client resolves handle → id ONCE here, then uses the id for every other
   * section of the page. Two lookup keys for one resource would make every section pick a side.
   */
  getPublicProfile: (username: string) =>
    api
      .get<PublicProfile>(`/v1/api/users/${encodeURIComponent(username)}/profile`)
      .then((r) => r.data),

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
