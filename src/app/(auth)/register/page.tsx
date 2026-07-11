'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Camera, Loader2, Mail } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/lib/schemas/auth';
import { useRegister } from '@/lib/hooks/use-auth';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function RegisterPage() {
  const { mutate: registerUser, isPending, isSuccess } = useRegister();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    registerUser(
      { data, profilePicture: profilePicture ?? undefined },
      { onSuccess: () => setRegisteredEmail(data.email) }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    setProfilePicture(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  const fullname = useWatch({ control, name: 'fullname' });
  const initials = fullname
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatarColor = getNeutralAvatarColor(fullname?.trim() || 'default');

  if (isSuccess) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            {registeredEmail
              ? `We've sent a verification link to ${registeredEmail}. Please check your inbox to activate your account.`
              : "We've sent a verification link to your email. Please check your inbox to activate your account."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="text-center space-y-2">
        <div className="relative mx-auto h-16 w-16 mb-2 group">
          <Avatar className="h-16 w-16">
            {picturePreview ? <AvatarImage src={picturePreview} /> : null}
            <AvatarFallback className={`${avatarColor} text-white text-xl font-bold`}>
              {initials || <span className="text-2xl">?</span>}
            </AvatarFallback>
          </Avatar>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {picturePreview ? t('auth.register.changePhoto') : t('auth.register.uploadPhoto')}
          <span className="mx-1">·</span>
          {t('auth.register.optional')}
        </button>
        <p className="text-[11px] text-muted-foreground">{t('auth.register.photoFormats')}</p>
        <CardTitle className="text-2xl font-bold">{t('auth.register.title')}</CardTitle>
        <CardDescription>{t('auth.register.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullname">{t('auth.fullname')}</Label>
            <Input
              id="fullname"
              placeholder={t('auth.fullNamePlaceholder')}
              {...register('fullname')}
            />
            {errors.fullname && (
              <p className="text-sm text-destructive">{errors.fullname.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('auth.register.passwordPlaceholder')}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? t('auth.register.submitting') : t('auth.register.submit')}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.register.alreadyHaveAccount')}{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
            >
              {t('auth.register.signIn')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
