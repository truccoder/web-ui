'use client';

import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, Camera, Mail } from 'lucide-react';
import { Avatar, Button, Card, Input } from '@/shared/components';
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
      <Card padding={24} className="w-full">
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
        <Link href="/login" className="mt-6 block">
          <Button variant="secondary" icon={<ArrowLeft />} className="w-full">
            {t('auth.register.backToLogin')}
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="group relative">
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
        <p className="text-nx-caption text-nx-text-muted">
          {preview ? t('auth.register.changePhoto') : t('auth.register.uploadPhoto')}
          <span className="mx-1">·</span>
          {t('auth.register.optional')}
        </p>
        <p className="text-nx-micro text-nx-text-faint">
          {pictureError ?? t('auth.register.photoFormats')}
        </p>

        <h1 className="mt-1 text-nx-title font-semibold text-nx-text-primary">
          {t('auth.register.title')}
        </h1>
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.register.subtitle')}</p>
      </div>

      {/* `method="post"` for the reason spelled out in `LoginForm`: without it a form defaults to
          GET, and an unhydrated page submits the password into the URL. */}
      <form onSubmit={submit} method="post" className="mt-6 flex flex-col gap-4" noValidate>
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
        <Input
          label={t('auth.password')}
          type="password"
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
        <Link href="/login" className="font-medium text-nx-text-link hover:text-nx-text-link-hover">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </Card>
  );
}
