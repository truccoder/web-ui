import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Account-recovery + email-verification + magic-link requests (AuthController,
 * security cycle 2). All fields come out non-optional from the generator: the Java
 * DTOs are `@NotBlank` (and `@Email` / `@Size` where relevant), so springdoc marks
 * them required. Nothing to tighten.
 */

export type ForgotPasswordRequest = Schemas['ForgotPasswordRequestDto'];
/** `{ token, newPassword }` — the token arrives in the reset-link URL. */
export type ResetPasswordRequest = Schemas['ResetPasswordRequestDto'];
/** `{ token }` — token from the verification-link URL. */
export type VerifyEmailRequest = Schemas['VerifyEmailRequestDto'];
export type MagicLinkRequest = Schemas['MagicLinkRequestDto'];
/** `{ token }` — token from the magic-link URL; the only recovery call that returns a session. */
export type MagicLinkLoginRequest = Schemas['MagicLinkLoginRequestDto'];
