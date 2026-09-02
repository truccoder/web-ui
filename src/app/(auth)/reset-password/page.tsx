'use client';

import { Suspense } from 'react';
import { ResetPasswordForm } from '@/features/security';

export default function ResetPasswordPage() {
  // ResetPasswordForm reads the reset token via useSearchParams — needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
