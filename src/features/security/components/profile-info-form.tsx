'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Input } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useMyProfile, useUpdateProfile } from '../hooks/use-profile';
import { updateProfileSchema, type UpdateProfileFormValues } from '../lib/validation';

/** Edit the display name (`PUT /profile`). The only editable profile field. */
export function ProfileInfoForm() {
  const t = useT();
  const { data: profile } = useMyProfile();
  const update = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    // `values` (not `defaultValues`) so the field syncs once the profile query resolves.
    values: { fullName: profile?.fullName ?? '' },
  });

  const submit = handleSubmit((body) => update.mutate(body));

  return (
    <Card className="w-full">
      <div className="mb-4">
        <h3 className="text-nx-heading font-semibold text-nx-text-primary">
          {t('profile.info.title')}
        </h3>
        <p className="text-nx-body-sm text-nx-text-muted">{t('profile.info.desc')}</p>
      </div>

      {/* `method="post"` — see `LoginForm`. */}
      <form onSubmit={submit} method="post" className="flex flex-col gap-4" noValidate>
        <Input
          label={t('profile.info.fullname')}
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        {update.isError && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {getErrorMessage(update.error)}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={update.isPending}>
            {update.isPending ? t('profile.info.saving') : t('profile.info.save')}
          </Button>
          {update.isSuccess && !update.isPending && (
            <span className="text-nx-body-sm text-nx-status-success-fg">
              {t('profile.info.saved')}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
