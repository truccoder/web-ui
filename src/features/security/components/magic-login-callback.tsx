'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, XCircle } from 'lucide-react';
import { Button, Card } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { useMagicLinkLogin } from '../hooks/use-recovery';

export interface MagicLoginCallbackProps {
  /** Where to go after sign-in; the route injects role-aware routing. Defaults to /dashboard. */
  onSuccess?: () => void;
}

/**
 * The magic-token twin of `OAuthCallback`: reads `token` from the sign-in-link URL,
 * trades it for a session on mount, then routes into the app. The single-use token means
 * the exchange fires exactly once (ref guard).
 */
export function MagicLoginCallback({ onSuccess }: MagicLoginCallbackProps) {
  const t = useT();
  const router = useRouter();
  const token = useSearchParams().get('token');
  const login = useMagicLinkLogin();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !token) return;
    fired.current = true;
    login.mutate(
      { token },
      {
        onSuccess: () => {
          if (onSuccess) onSuccess();
          else router.replace('/dashboard');
        },
      }
    );
  }, [token, login, router, onSuccess]);

  if (!token || login.isError) {
    return (
      <Card padding={24} className="w-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-nx-full bg-nx-status-danger-bg">
            <XCircle className="size-6 text-nx-status-danger-fg" aria-hidden />
          </span>
          <h1 className="text-nx-title font-semibold text-nx-text-primary">
            {t('auth.magicLogin.invalidTitle')}
          </h1>
          <p role="alert" className="text-nx-body-sm text-nx-text-secondary">
            {t('auth.magicLogin.invalidDesc')}
          </p>
        </div>
        <Link href="/magic-link" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            {t('auth.magicLogin.requestNewLink')}
          </Button>
        </Link>
      </Card>
    );
  }

  // pending / success: the redirect happens in onSuccess, so success keeps the spinner.
  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Loader2 className="size-8 animate-spin text-nx-accent" aria-hidden />
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.magicLogin.signingIn')}</p>
      </div>
    </Card>
  );
}
