'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentResultPanel } from '@/features/bookstore';

/**
 * `/payment/pending` — where the app waits while the buyer pays. Owned entirely by `bookstore`.
 *
 * A SECOND ROUTE RATHER THAN A FLAG ON `/payment/success`, because the two are entered by
 * different parties and mean different things. `/payment/success` is MoMo's `redirect-url`
 * (`MomoProperties`), reached only after an order SETTLES, so arriving there is itself evidence.
 * This one is reached by pressing Buy, before any money has moved, and its whole content is a
 * question that has not been answered yet. Sharing a URL between "we think you paid" and "we are
 * waiting for you to pay" would put a query parameter in charge of which sentence is true.
 *
 * It is also the fallback that makes the QR flow survivable at all: MoMo now uses `captureWallet`,
 * which is paid on a phone, so the desktop tab that opened MoMo may never be redirected anywhere.
 * This page polls the ref instead of waiting to be told.
 *
 * The route keeps only what a route can know: the query string. The poll, the countdown and the
 * four states it can end in live in `PaymentResultPanel`.
 *
 * `useSearchParams` forces a Suspense boundary in the App Router; without one this page cannot be
 * statically rendered at all.
 */
function PaymentPendingContent() {
  const searchParams = useSearchParams();

  // Same parameter name as MoMo's redirect carries, so one link shape works from either direction.
  return <PaymentResultPanel transactionRef={searchParams.get('orderId')} mode="await" />;
}

export default function PaymentPendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <PaymentPendingContent />
      </Suspense>
    </div>
  );
}
