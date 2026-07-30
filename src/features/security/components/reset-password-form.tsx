'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { Button, Card, Input } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/lib/i18n';
import { useResetPassword } from '../hooks/use-recovery';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../lib/validation';

/**
 * Sets a new password using the token from the reset-link URL. Success is a terminal
 * card ("continue to sign in") rather than an auto-redirect — no session is established
 * by resetting a password.
 */
export function ResetPasswordForm() {
  const t = useT();
  const token = useSearchParams().get('token');
  const reset = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const submit = handleSubmit((values) => {
    if (!token) return;
    reset.mutate({ token, newPassword: values.newPassword });
  });

  if (!token) {
    return (
      <Card padding={24} className="w-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-nx-full bg-nx-status-danger-bg">
            <XCircle className="size-6 text-nx-status-danger-fg" aria-hidden />
          </span>
          <h1 className="text-nx-title font-semibold text-nx-text-primary">
            {t('auth.resetPassword.invalidTitle')}
          </h1>
          <p className="text-nx-body-sm text-nx-text-secondary">
            {t('auth.resetPassword.invalidDesc')}
          </p>
        </div>
        <Link href="/forgot-password" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            {t('auth.resetPassword.requestNewLink')}
          </Button>
        </Link>
      </Card>
    );
  }

  if (reset.isSuccess) {
    return (
      <Card padding={24} className="w-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-nx-full bg-nx-status-success-bg">
            <CheckCircle2 className="size-6 text-nx-status-success-fg" aria-hidden />
          </span>
          <h1 className="text-nx-title font-semibold text-nx-text-primary">
            {t('auth.resetPassword.successTitle')}
          </h1>
          <p className="text-nx-body-sm text-nx-text-secondary">
            {t('auth.resetPassword.successDesc')}
          </p>
        </div>
        <Link href="/login" className="mt-6 block">
          <Button className="w-full">{t('auth.resetPassword.continue')}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          className="flex size-11 items-center justify-center rounded-nx-md bg-nx-surface-sunken text-nx-text-secondary"
          aria-hidden
        >
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">
          {t('auth.resetPassword.title')}
        </h1>
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.resetPassword.subtitle')}</p>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        <Input
          label={t('auth.resetPassword.newPassword')}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label={t('auth.resetPassword.confirmPassword')}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {reset.isError && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {getErrorMessage(reset.error, 'Could not reset password. Please try again.')}
          </p>
        )}

        <Button type="submit" loading={reset.isPending} className="w-full">
          {reset.isPending ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-4 flex items-center justify-center gap-1 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
      >
        {t('auth.resetPassword.backToLogin')}
      </Link>
    </Card>
  );
}
