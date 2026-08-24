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
 * - `coverImageUrl` is nullable for the same reason, and it is the one this shape gets WRONG BY
 *   DEFAULT. `Required<Omit<…>>` sweeps in whatever the generated DTO grows, so the day B18 added
 *   a cover to `UserResponse` this type silently began promising a `string` for a column that is
 *   `NULL` on most rows — measured, not assumed: `GET /users/backend_truc_anh/profile` answers
 *   `"coverImageUrl": null`. Nothing crashed because no caller narrows on it, which is exactly why
 *   it is worth naming: the omit list is not a formality, it is the record of which fields the
 *   backend may leave empty, and a new nullable field has to be added to it by hand.
 */
export type UserProfile = Required<
  Omit<RawUser, 'username' | 'profilePictureUrl' | 'coverImageUrl'>
> & {
  username?: string;
  profilePictureUrl?: string;
  coverImageUrl?: string;
};

/** The user's role, as it appears on `UserProfile.role`. */
export type UserRole = NonNullable<RawUser['role']>;

/**
 * `PUT /profile` — the display name and the cover.
 *
 * `fullName` IS REQUIRED AND `coverImageUrl` IS NOT, and the asymmetry is the endpoint's whole
 * contract rather than a generator artefact. The name is `@NotBlank` and replaced outright; the
 * cover is three-valued — **absent leaves it alone, a URL sets it, the empty string removes it**.
 * The backend's javadoc ties that rule to B12: this endpoint predates the field and every existing
 * caller sends `fullName` alone, so a copy-nulls rule would have let the first rename after
 * setting a cover wipe it. `ProfileInfoForm` still sends only the name and is safe for exactly
 * that reason; `ProfileCoverControl` sends both, and sends `''` to remove.
 */
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
/**
 * `PublicProfileResponse`, NOT `PublicUserResponse` — and the two are different objects now.
 *
 * `PublicUserResponse` is the THIN record shared by seven call sites, including the reactor list,
 * where adding a reputation lookup per row would be an N+1. B2 asked the backend to leave it
 * alone and give the public-profile endpoint its own richer DTO instead; it did. This type
 * follows that split, which is why the page can stop making a second request for the level name.
 */
export type PublicProfile = {
  [K in keyof Required<Schemas['PublicProfileResponse']>]:
    | Required<Schemas['PublicProfileResponse']>[K]
    | null;
};
