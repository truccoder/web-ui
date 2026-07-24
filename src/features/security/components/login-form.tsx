'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button, Card, Input } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
// i18n is app-wide infrastructure still living in lib/. It is the one edge out of this
// feature; when it moves to core/ (recommended infra checkpoint) this import updates and
// security passes the extraction test cleanly.
import { useT } from '@/lib/i18n';
import { useLogin } from '../hooks/use-auth';
import { loginSchema, type LoginFormValues } from '../lib/validation';
import { BrandMark } from './brand-mark';
import { OAuthButtons } from './oauth-buttons';

export interface LoginFormProps {
  /** Called after a successful sign-in. The page decides where to route. */
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const t = useT();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const submit = handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => onSuccess?.() });
  });

  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <BrandMark />
        <h1 className="text-nx-title font-semibold text-nx-text-primary">
          {t('auth.login.title')}
        </h1>
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.login.subtitle')}</p>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-nx-body-sm font-medium text-nx-text-secondary"
            >
              {t('auth.password')}
            </label>
            <Link
              href="/forgot-password"
              className="text-nx-body-sm text-nx-text-link hover:text-nx-text-link-hover"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.login.passwordPlaceholder')}
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {login.isError && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {getErrorMessage(login.error, 'Invalid email or password')}
          </p>
        )}

        <Button type="submit" loading={login.isPending} className="w-full">
          {login.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </form>

      <OAuthButtons />

      <div className="mt-4 flex flex-col items-center gap-3 text-center">
        <Link
          href="/magic-link"
          className="text-nx-body-sm text-nx-text-link hover:text-nx-text-link-hover"
        >
          {t('auth.login.magicLink')}
        </Link>
        <p className="text-nx-body-sm text-nx-text-muted">
          {t('auth.login.noAccount')}{' '}
          <Link
            href="/register"
            className="font-medium text-nx-text-link hover:text-nx-text-link-hover"
          >
            {t('auth.login.signUp')}
          </Link>
        </p>
      </div>
    </Card>
  );
}
