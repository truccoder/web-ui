import { z } from 'zod';

/**
 * Login/register validation lives inside the security feature — it is domain rules,
 * not shared utility. Mirrors the backend's Jakarta constraints:
 * `RegisterRequestDto` is `@NotBlank @Email` email, `@Size(min = 6)` password,
 * `@NotBlank` fullname. Keep the min in sync with the DTO if the backend changes it.
 */

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  fullname: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * `newPassword` mirrors the backend `@Size(min = 6)`. `confirmPassword` is FE-only — the
 * request DTO is just `{ token, newPassword }`, so the match check never leaves the client.
 */
export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/** Matches ProfileService.MAX_PROFILE_PICTURE_SIZE (5MB) on the backend. */
export const MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
