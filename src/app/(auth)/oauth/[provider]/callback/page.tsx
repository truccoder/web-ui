'use client';

import { Suspense } from 'react';
import { notFound, useParams } from 'next/navigation';
import { OAuthCallback } from '@/features/security';
import type { OAuthProvider } from '@/features/security';
import { usePostAuthRedirect } from '../../../post-auth-redirect';

const PROVIDERS: OAuthProvider[] = ['google', 'github'];

export default function OAuthCallbackPage() {
  const params = useParams<{ provider: string }>();
  const redirectAfterAuth = usePostAuthRedirect();

  const provider = params.provider as OAuthProvider;
  if (!PROVIDERS.includes(provider)) notFound();

  // OAuthCallback reads `code` from the query string, so it must sit under a Suspense
  // boundary (useSearchParams).
  return (
    <Suspense fallback={null}>
      <OAuthCallback provider={provider} onSuccess={redirectAfterAuth} />
    </Suspense>
  );
}
