'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Input } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useChangePassword } from '../hooks/use-profile';
import { changePasswordSchema, type ChangePasswordFormValues } from '../lib/validation';

/** Change the account password (`PUT /profile/password`). */
export function ChangePasswordForm() {
  const t = useT();
  const change = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  const submit = handleSubmit((values) => {
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => reset() }
    );
  });

  return (
    <Card className="w-full">
      <div className="mb-4">
        <h3 className="text-nx-heading font-semibold text-nx-text-primary">
          {t('profile.password.title')}
        </h3>
        <p className="text-nx-body-sm text-nx-text-muted">{t('profile.password.desc')}</p>
      </div>

      {/* `method="post"` — see `LoginForm`. Two passwords on this one. */}
      <form onSubmit={submit} method="post" className="flex flex-col gap-4" noValidate>
        <Input
          label={t('profile.password.currentPassword')}
          type="password"
          autoComplete="current-password"
          placeholder={t('profile.password.currentPlaceholder')}
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label={t('profile.password.newPassword')}
          type="password"
          autoComplete="new-password"
          placeholder={t('profile.password.newPlaceholder')}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label={t('profile.password.confirm')}
          type="password"
          autoComplete="new-password"
          placeholder={t('profile.password.confirmPlaceholder')}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {change.isError && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {getErrorMessage(change.error, 'Could not change password. Please try again.')}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={change.isPending}>
            {change.isPending ? t('profile.password.updating') : t('profile.password.update')}
          </Button>
          {change.isSuccess && !change.isPending && (
            <span className="text-nx-body-sm text-nx-status-success-fg">
              {t('profile.password.updated')}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
