'use client';

import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, Mail } from 'lucide-react';
import { Avatar, Button, Input } from '@/shared/components';
import { AuthCard } from './auth-card';
import { PasswordInput } from './password-input';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useRegister } from '../hooks/use-auth';
import {
  ACCEPTED_PICTURE_TYPES,
  MAX_PROFILE_PICTURE_BYTES,
  registerSchema,
  type RegisterFormValues,
} from '../lib/validation';
import { OAuthButtons } from './oauth-buttons';

export function RegisterForm() {
  const t = useT();

  /**
   * `next` IS FORWARDED TO SIGN-IN, and without this the guest surface leaks the destination
   * exactly halfway through the flow.
   *
   * Registration does not establish a session — it returns void and sends a verification email —
   * so the reader arrives here from `/register?next=/posts/123`, fills the form, and then follows
   * one of the two links below to sign in. A bare `/login` at that point has forgotten the post
   * they were reading, and `post-auth-redirect` has nothing left to honour.
   */
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  const register = useRegister();

  const [picture, setPicture] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: field,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const fullname = useWatch({ control, name: 'fullname' });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_PICTURE_TYPES.includes(file.type)) {
      setPictureError(t('auth.register.photoFormats'));
      return;
    }
    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      setPictureError(t('auth.register.photoTooLarge'));
      return;
    }
    setPictureError(null);
    setPicture(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = handleSubmit((values) => {
    register.mutate(
      { body: values, profilePicture: picture ?? undefined },
      { onSuccess: () => setSubmittedEmail(values.email) }
    );
  });

  // Success is a distinct surface: registration returns void and sends a verification
  // email, so the next step is "check your inbox", not a signed-in app.
  if (submittedEmail) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-nx-full bg-nx-status-success-bg">
            <Mail className="size-6 text-nx-status-success-fg" aria-hidden />
          </span>
          <h1 className="text-nx-title font-semibold text-nx-text-primary">
            {t('auth.register.checkEmailTitle')}
          </h1>
          <p className="text-nx-body-sm text-nx-text-secondary">
            {t('auth.register.checkEmailDesc', { email: submittedEmail })}
          </p>
        </div>
        <Link href={loginHref} className="mt-5 block">
          <Button variant="secondary" icon={<ArrowLeft />} className="w-full">
            {t('auth.register.backToLogin')}
          </Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      {/* CENTRED ON A PHONE, LEFT-ALIGNED BESIDE THE PANEL. The centring belonged to the card:
          a 448 box alone on a viewport reads as a poster. With the card dissolved above `lg` the
          heading sits over left-aligned labels, and a centred column has no edge to agree with. */}
      <div className="flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
        <h1 className="text-nx-title font-semibold text-nx-text-primary">
          {t('auth.register.title')}
        </h1>
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.register.subtitle')}</p>
      </div>

      {/* THE PICTURE PICKER, UNDER THE HEADING AND LAID OUT AS A ROW.
          It has been in three places across as many rounds, so the current one is written down
          rather than left to be re-derived: above the heading (where this file shipped), below the
          password (tried, reverted), and here — first thing after the sentence that says what the
          screen is, which is the owner's call.

          A ROW, NOT THE CENTRED STACK IT USED TO BE. Stacked, the avatar + two caption lines cost
          about 130px of vertical run before the first real field; side by side they cost 64 and
          the label sits beside the thing it labels. It is also the one optional control on the
          screen, and a row reads as an aside where a centred column read as the subject.

          `justify-center lg:justify-start` follows the heading above it — centred while the card
          exists on a phone, left-aligned once the card dissolves. */}
      <div className="mt-5 flex items-center justify-center gap-4 lg:justify-start">
        <div className="group relative shrink-0">
          <Avatar src={preview ?? undefined} name={fullname} size="xl" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={preview ? t('auth.register.changePhoto') : t('auth.register.uploadPhoto')}
            className="absolute inset-0 flex items-center justify-center rounded-nx-full bg-nx-surface-overlay opacity-0 transition-opacity duration-[var(--nx-duration-fast)] ease-nx-out group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            <Camera className="size-5 text-nx-text-on-color" aria-hidden />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_PICTURE_TYPES.join(',')}
            className="hidden"
            onChange={onPickFile}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          {/* A second control onto the same file input as the avatar overlay. The overlay only
              appears on hover, which does not exist on a touch screen; this is the affordance that
              always does. */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-fit text-nx-body-sm font-medium text-nx-text-link hover:text-nx-text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            {preview ? t('auth.register.changePhoto') : t('auth.register.uploadPhoto')}
            <span className="mx-1 text-nx-text-muted">·</span>
            <span className="font-normal text-nx-text-muted">{t('auth.register.optional')}</span>
          </button>
          <p
            className={
              pictureError
                ? 'text-nx-caption text-nx-status-danger-fg'
                : 'text-nx-caption text-nx-text-muted'
            }
            // The picture error is a validation result, so it is announced; the format rule it
            // replaces is static help text and is not.
            role={pictureError ? 'alert' : undefined}
          >
            {pictureError ?? t('auth.register.photoFormats')}
          </p>
        </div>
      </div>

      {/* `method="post"` for the reason spelled out in `LoginForm`: without it a form defaults to
          GET, and an unhydrated page submits the password into the URL. */}
      <form onSubmit={submit} method="post" className="mt-5 flex flex-col gap-4" noValidate>
        <Input
          label={t('auth.fullname')}
          autoComplete="name"
          placeholder={t('auth.fullNamePlaceholder')}
          error={errors.fullname?.message}
          {...field('fullname')}
        />
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          error={errors.email?.message}
          {...field('email')}
        />
        <PasswordInput
          label={t('auth.password')}
          autoComplete="new-password"
          placeholder={t('auth.register.passwordPlaceholder')}
          error={errors.password?.message}
          {...field('password')}
        />

        {register.isError && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {getErrorMessage(register.error, 'Registration failed')}
          </p>
        )}

        <Button type="submit" loading={register.isPending} className="w-full">
          {register.isPending ? t('auth.register.submitting') : t('auth.register.submit')}
        </Button>
      </form>

      <OAuthButtons />

      <p className="mt-4 text-center text-nx-body-sm text-nx-text-muted">
        {t('auth.register.alreadyHaveAccount')}{' '}
        <Link
          href={loginHref}
          className="font-medium text-nx-text-link hover:text-nx-text-link-hover"
        >
          {t('auth.register.signIn')}
        </Link>
      </p>
    </AuthCard>
  );
}
