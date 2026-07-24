import { z } from 'zod';

// login + register schemas have moved to features/security/lib/validation (P2.1d).
// Recovery + magic-link schemas remain until those cycles migrate.

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const magicLinkRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type MagicLinkRequestFormData = z.infer<typeof magicLinkRequestSchema>;
