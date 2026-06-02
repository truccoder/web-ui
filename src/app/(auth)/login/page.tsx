'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/schemas/auth';
import { useLogin } from '@/lib/hooks/use-auth';
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

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const t = useT();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-2">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <CardTitle className="text-2xl font-bold">{t('auth.login.title')}</CardTitle>
        <CardDescription>{t('auth.login.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder={t('auth.login.passwordPlaceholder')}
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
            {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.login.noAccount')}{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
            >
              {t('auth.login.signUp')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
