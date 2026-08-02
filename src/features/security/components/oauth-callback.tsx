'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button, Card } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { OAuthProvider } from '../types/auth';
import { useOAuthCallback } from '../hooks/use-oauth';

export interface OAuthCallbackProps {
  provider: OAuthProvider;
  /**
   * Where to go after a successful exchange. The route injects role-aware routing;
   * without it the component falls back to `/dashboard`.
   */
  onSuccess?: () => void;
}

/**
 * Handles the redirect back from a provider: reads `code` from the query string, trades
 * it for our tokens via `useOAuthCallback`, then routes into the app.
 *
 * The provider sends the browser here (redirect uri is :3000/oauth/{provider}/callback).
 * If the user denied consent it returns `?error=...` instead of a code.
 */
export function OAuthCallback({ provider, onSuccess }: OAuthCallbackProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = useOAuthCallback(provider);

  const code = searchParams.get('code');
  const providerError = searchParams.get('error');
  // Fire the exchange exactly once. A mutation is not idempotent — the code is
  // single-use — and effects run twice under React strict mode in dev.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !code || providerError) return;
    fired.current = true;
    callback.mutate(code, {
      onSuccess: () => {
        // The route injects role-aware routing (legacy bridge, ledger §6). Fallback
        // sends everyone to /dashboard.
        if (onSuccess) onSuccess();
        else router.replace('/dashboard');
      },
    });
  }, [code, providerError, callback, router, onSuccess]);

  const hasError = providerError || !code || callback.isError;

  if (hasError) {
    const message = providerError
      ? t('auth.oauth.denied')
      : !code
        ? t('auth.oauth.missingCode')
        : getErrorMessage(callback.error, t('auth.oauth.failed'));

    return (
      <Card padding={24} className="w-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-nx-full bg-nx-status-danger-bg">
            <AlertCircle className="size-6 text-nx-status-danger-fg" aria-hidden />
          </span>
          <h1 className="text-nx-title font-semibold text-nx-text-primary">
            {t('auth.oauth.failedTitle')}
          </h1>
          <p role="alert" className="text-nx-body-sm text-nx-text-secondary">
            {message}
          </p>
        </div>
        <Link href="/login" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            {t('auth.oauth.backToLogin')}
          </Button>
        </Link>
      </Card>
    );
  }

  // Pending / success: the redirect happens in onSuccess, so success briefly shows the
  // same spinner rather than flashing a separate state.
  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Loader2 className="size-8 animate-spin text-nx-accent" aria-hidden />
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.oauth.exchanging')}</p>
      </div>
    </Card>
  );
}
