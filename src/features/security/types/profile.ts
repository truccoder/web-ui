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

/**
 * Someone else's profile, as returned by `GET /v1/api/users/{username}/profile`.
 *
 * THE ENDPOINT THAT ENDED THE PROJECT'S LONGEST-STANDING CEILING. "No public profile endpoint"
 * was written into CLAUDE.md Phase 3.1 and designed around in four places — search results were
 * static rows, the ⌘K palette routed people to `/search`, notification hrefs returned null, and
 * review lists showed anonymous avatars. It shipped in the 2026-08-09 backend batch.
 *
 * IT IS KEYED BY USERNAME, WHICH IS NOT WHAT MOST PAYLOADS CARRY. `FeedPostDataDto` has
 * `authorId` and no username at all, so a post in the feed still cannot link here — see the note
 * on `usePublicProfile`. `UserProfileDto` (the friends list) and `UserDto` (search) both do carry
 * one, which is why those two surfaces can link and the feed cannot.
 *
 * `id` IS THE USEFUL PART OF THE RESPONSE, beyond the display fields: every other public section
 * of a profile — posts, reputation, roadmap progress, GitHub stats — is keyed by user ID. So the
 * page resolves handle → id exactly once here and uses the id for everything else, which is the
 * shape the backend's own javadoc asks for.
 *
 * Deliberately THIN compared to `/profile/me`: no email, no role, no verification state. What is
 * absent is absent on purpose — the endpoint is open to signed-out visitors.
 */
export type PublicProfile = {
  [K in keyof Required<Schemas['PublicUserResponse']>]:
    | Required<Schemas['PublicUserResponse']>[K]
    | null;
};
