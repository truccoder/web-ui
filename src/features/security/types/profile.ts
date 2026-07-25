import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];
type RawUser = Schemas['UserResponse'];

/**
 * The signed-in user's profile (`GET /profile/me`, `PUT /profile`).
 *
 * Response DTOs carry no validation annotations, so every generated field is optional.
 * Confirmed against `security/dto/UserResponse.java` + `ProfileService.toResponse`:
 * - `role`, `id`, `email`, `fullName`, `emailVerified`, `createdAt` are always populated
 *   for a persisted user → tightened to required. `role` in particular backs the admin
 *   redirect, so it must not be optional.
 * - `username` is nullable: OAuth sign-up generates one, but password registration
 *   (`AuthService.register`) never sets it.
 * - `profilePictureUrl` is nullable: a user may have no picture.
 */
export type UserProfile = Required<Omit<RawUser, 'username' | 'profilePictureUrl'>> & {
  username?: string;
  profilePictureUrl?: string;
};

/** The user's role, as it appears on `UserProfile.role`. */
export type UserRole = NonNullable<RawUser['role']>;

/** `PUT /profile` — only the display name is editable. */
export type UpdateProfileRequest = Schemas['UpdateProfileRequest'];

/** `PUT /profile/password` — both fields `@NotBlank`, newPassword `@Size(min = 6)`. */
export type ChangePasswordRequest = Schemas['ChangePasswordRequestDto'];

/** `PUT /profile/picture` — the uploaded picture's new URL. Always populated on success. */
export type ProfilePictureResponse = Required<Schemas['ProfilePictureResponseDto']>;
