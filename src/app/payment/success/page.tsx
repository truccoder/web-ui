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
 * ARRIVING HERE IS EVIDENCE, WHICH IS WHY THE WAIT IS SHORT. MoMo only sends the browser to its
 * `redirect-url` once an order settles, so the only thing still outstanding is the webhook — a
 * dozen seconds of polling either has it or does not. The other entrance, `/payment/pending`, is
 * the one the app itself pushes to right after opening MoMo, where nothing has been paid yet and
 * the wait is a person with a phone; it runs the same panel in `await` mode.
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
