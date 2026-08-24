'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { BrandMark, Button, Input } from '@/shared/components';
import { AuthCard } from './auth-card';
import { PasswordInput } from './password-input';
import { getErrorMessage } from '@/shared/lib/api-error';
// i18n is app-wide infrastructure still living in lib/. It is the one edge out of this
// feature; when it moves to core/ (recommended infra checkpoint) this import updates and
// security passes the extraction test cleanly.
import { useT } from '@/core/i18n';
import { useLogin } from '../hooks/use-auth';
import { loginSchema, type LoginFormValues } from '../lib/validation';
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

  /**
   * `padding={24}` STAYS ON THE AUTH CARDS WHILE THE CANVAS CARDS DROPPED IT, and the line is
   * deliberate.
   *
   * A census of five kit screens found exactly three card paddings — `16px 20px` (the standard
   * card), `12px 20px` (a denser row) and `0 10px` (a bare set member) — and **no 24 anywhere**;
   * 24 is also on neither course (horizontal 8 · 12 · 20 · 40, vertical 8 · 12 · 16 · 20). So
   * every card inside the app shell moved to the default.
   *
   * The auth screens are not inside the shell. They are one card alone on an empty viewport, with
   * no neighbouring block for the ladder to relate them to — and the kit ships no auth specimen,
   * so there is nothing to measure. Shrinking them would be a guess dressed up as a correction.
   * Left at 24 with the reason written down instead.
   */
  return (
    <AuthCard>
      {/* CENTRED ON A PHONE, LEFT-ALIGNED BESIDE THE PANEL. The centring belonged to the card:
          a 448 box alone on a viewport reads as a poster and a centred header suits it. With the
          card dissolved above `lg` the header sits directly over left-aligned labels and fields,
          and a centred title over a left-aligned column has no edge to agree with. */}
      <div className="flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
        {/* THE REAL MARK, NOT THE PLACEHOLDER THIS FILE USED TO IMPORT. `features/security` carried
            its own `brand-mark.tsx` — an ink tile with a mono "N", whose own header called itself
            an APPROXIMATION and said to "swap for the real mark when the app has a shared logo
            asset". `shared/components/BrandMark` is that asset: the DS's chevron, drawn in two
            forms so it sits correctly on light and dark. The placeholder outlived the condition
            for its own removal, which is how a stand-in becomes a second brand.

            `size={44}` keeps the auth card's header exactly the height it was — the placeholder
            rendered `size-11`. A px prop, not a spacing rung, so no ladder applies. */}
        {/* `lg:hidden` — THE MARK IS ONLY HERE WHEN THE BRAND PANEL IS NOT.
            Measured on the split layout: two copies of the mark rendered on one 1440 screen, one
            in the panel and one 300px away at the top of this card. Below `lg` the panel does not
            render at all, and a sign-in screen with no mark anywhere is a form from nobody — so
            this is a fallback, not a duplicate. */}
        <BrandMark size={44} className="lg:hidden" />
        <h1 className="text-nx-title font-semibold text-nx-text-primary">
          {t('auth.login.title')}
        </h1>
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.login.subtitle')}</p>
      </div>

      {/**
       * `method="post"` ON A FORM THAT IS SUBMITTED BY JAVASCRIPT — deliberately, and this is not
       * belt-and-braces.
       *
       * A `<form>` with no `method` defaults to **GET**. `onSubmit` normally preventDefaults it,
       * so the attribute never matters — until the moment `onSubmit` does not run. Measured, not
       * theorised: with the dev server down the bundle never loaded, React never hydrated, the
       * browser fell back to its native submit, and the page navigated to
       * `/login?email=…&password=12345678`.
       *
       * A password in a query string does not stay in the address bar. It goes into browser
       * history, into the server's access log, and into the `Referer` header of the next request
       * off that page. `method="post"` puts the same values in a request body that nothing
       * records — the submission still fails, which is correct, but it fails without leaking.
       *
       * Every form on this screen family that carries a secret or an identifier gets the same
       * treatment, because "JavaScript did not run" is not a rare state: it is every failed
       * deploy, every chunk 404, every extension that breaks hydration.
       */}
      <form onSubmit={submit} method="post" className="mt-5 flex flex-col gap-4" noValidate>
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="flex flex-col gap-2">
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
          <PasswordInput
            id="login-password"
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
    </AuthCard>
  );
}
