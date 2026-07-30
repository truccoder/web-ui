'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentResultPanel } from '@/features/bookstore';

/**
 * `/payment/success` — where MoMo sends the buyer back. Owned entirely by `bookstore`.
 *
 * The route keeps only what a route can know: the query string. Everything else — the bounded poll
 * that resolves the webhook-vs-redirect race, and the four states it can end in — belongs to
 * `features/bookstore` and lives in `PaymentResultPanel`.
 *
 * `useSearchParams` forces a Suspense boundary in the App Router; without one this page cannot be
 * statically rendered at all.
 */
function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  // MoMo returns its `orderId`, which is the backend's own `transactionRef`.
  return <PaymentResultPanel transactionRef={searchParams.get('orderId')} />;
}

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
