'use client';

import { Suspense } from 'react';
import { VerifyEmailStatus } from '@/features/security';

export default function VerifyEmailPage() {
  // VerifyEmailStatus reads the token via useSearchParams — needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
