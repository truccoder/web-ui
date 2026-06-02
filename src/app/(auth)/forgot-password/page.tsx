'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/schemas/auth';
import { useForgotPassword } from '@/lib/hooks/use-auth';
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

export default function ForgotPasswordPage() {
  const { mutate: sendReset, isPending, isSuccess } = useForgotPassword();
  const t = useT();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    sendReset(data);
  };

  if (isSuccess) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t('auth.forgotPassword.successTitle')}
          </CardTitle>
          <CardDescription>{t('auth.forgotPassword.successDesc')}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('auth.forgotPassword.backToLogin')}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-2">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <CardTitle className="text-2xl font-bold">{t('auth.forgotPassword.title')}</CardTitle>
        <CardDescription>{t('auth.forgotPassword.subtitle')}</CardDescription>
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
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
          </Button>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
