'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Mail, Sparkles } from 'lucide-react';
import { Button, Card, Input } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useForgotPassword, useRequestMagicLink } from '../hooks/use-recovery';

/**
 * "Enter your email, we'll send you a link" — shared by the two request flows, which are
 * structurally identical and differ only in copy and which mutation they fire:
 *   - `password-reset`  → POST /auth/forgot-password
 *   - `magic-link`      → POST /auth/magic-link
 *
 * Both mutation hooks are called unconditionally (rules of hooks) and one is selected;
 * neither fires a request until `mutate`, so the unused one costs nothing.
 */
export type RequestLinkVariant = 'password-reset' | 'magic-link';

const emailSchema = z.object({ email: z.string().email('Invalid email address') });
type EmailValues = z.infer<typeof emailSchema>;

const CONFIG: Record<RequestLinkVariant, { i18nKey: string; icon: React.ReactNode }> = {
  'password-reset': { i18nKey: 'auth.forgotPassword', icon: <KeyRound className="size-6" /> },
  'magic-link': { i18nKey: 'auth.magicLink', icon: <Sparkles className="size-6" /> },
};

export interface RequestLinkFormProps {
  variant: RequestLinkVariant;
}

export function RequestLinkForm({ variant }: RequestLinkFormProps) {
  const t = useT();
  const forgot = useForgotPassword();
  const magic = useRequestMagicLink();
  const mutation = variant === 'password-reset' ? forgot : magic;

  const { i18nKey, icon } = CONFIG[variant];
  const tk = (k: string) => t(`${i18nKey}.${k}`);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });

  const submit = handleSubmit((values) => mutation.mutate(values));

  // Success is a distinct surface: the backend replies by sending an email, so the next
  // step is "check your inbox". Deliberately generic (no "no such account") — the reset
  // flow must not confirm whether an email is registered.
  if (mutation.isSuccess) {
    return (
      <Card padding={24} className="w-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-nx-full bg-nx-status-success-bg">
            <Mail className="size-6 text-nx-status-success-fg" aria-hidden />
          </span>
          <h1 className="text-nx-title font-semibold text-nx-text-primary">{tk('successTitle')}</h1>
          <p className="text-nx-body-sm text-nx-text-secondary">{tk('successDesc')}</p>
        </div>
        <Link href="/login" className="mt-5 block">
          <Button variant="secondary" icon={<ArrowLeft />} className="w-full">
            {tk('backToLogin')}
          </Button>
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
          {icon}
        </span>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">{tk('title')}</h1>
        <p className="text-nx-body-sm text-nx-text-secondary">{tk('subtitle')}</p>
      </div>

      {/* `method="post"` — see `LoginForm`. No password here, but an email address in a URL is
          still personal data written into history and access logs. */}
      <form onSubmit={submit} method="post" className="mt-5 flex flex-col gap-4" noValidate>
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          error={errors.email?.message}
          {...register('email')}
        />

        {mutation.isError && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {getErrorMessage(mutation.error, 'Something went wrong. Please try again.')}
          </p>
        )}

        <Button type="submit" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? tk('submitting') : tk('submit')}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-4 flex items-center justify-center gap-1 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {tk('backToLogin')}
      </Link>
    </Card>
  );
}
