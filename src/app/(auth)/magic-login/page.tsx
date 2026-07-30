'use client';

import { Suspense } from 'react';
import { MagicLoginCallback } from '@/features/security';
import { usePostAuthRedirect } from '../post-auth-redirect';

export default function MagicLoginPage() {
  // Magic-link login establishes a session, so it routes through the same role-aware
  // redirect bridge as password/OAuth login. MagicLoginCallback reads the token via
  // useSearchParams — needs a Suspense boundary.
  const redirectAfterAuth = usePostAuthRedirect();
  return (
    <Suspense fallback={null}>
      <MagicLoginCallback onSuccess={redirectAfterAuth} />
    </Suspense>
  );
}
