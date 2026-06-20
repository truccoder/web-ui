'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, X } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/lib/schemas/auth';
import { useRegister } from '@/lib/hooks/use-auth';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function RegisterPage() {
  const { mutate: registerUser, isPending } = useRegister();
  const [preview, setPreview] = useState<string | null>(null);
  const t = useT();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      setValue('profilePicture', files, { shouldValidate: true });
      const url = URL.createObjectURL(files[0]);
      setPreview(url);
    }
  };

  const clearFile = () => {
    setValue('profilePicture', undefined, { shouldValidate: true });
    setPreview(null);
  };

  const onSubmit = (data: RegisterFormData) => {
    registerUser({
      request: {
        email: data.email,
        password: data.password,
        fullname: data.fullname,
      },
      profilePicture: data.profilePicture?.[0] ?? null,
    });
  };

  return (
    <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-2">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <CardTitle className="text-2xl font-bold">{t('auth.register.title')}</CardTitle>
        <CardDescription>{t('auth.register.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Profile picture upload */}
          <div className="space-y-2">
            <Label>
              {t('auth.register.profilePicture')}{' '}
              <span className="text-muted-foreground">{t('auth.register.optional')}</span>
            </Label>
            <div className="flex items-center gap-4">
              {preview ? (
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border">
                    <Image
                      src={preview}
                      alt="Preview"
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/90 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <span className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    {preview ? t('auth.register.changePhoto') : t('auth.register.uploadPhoto')}
                  </span>
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('auth.register.photoFormats')}
                </p>
              </div>
            </div>
            {errors.profilePicture && (
              <p className="text-sm text-destructive">{errors.profilePicture.message as string}</p>
            )}
          </div>

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
