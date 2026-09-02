'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../api';
import { bookstoreKeys } from './keys';

/**
 * Payment state layer — both hooks are mutations, and neither navigates.
 *
 * `createPayment` returns a MoMo URL the user has to be sent to, and `syncPaymentStatus` runs on
 * the way back. Sending the browser anywhere is the screen's job (P2.10c-1 for the buy button,
 * P2.10d for `/payment/success`), so these hooks stop at returning the data.
 */

/**
 * Open a MoMo payment for one book.
 *
 * GATE THE BUTTON ON `!isFree && !purchased` BEFORE CALLING. A free book is a **400** here ("This
 * book is free, no payment required", measured) — that check exists to protect the backend, not to
 * be the way the UI discovers what to render.
 *
 * Keep `transactionRef` from the result before redirecting: it is the only handle on the payment
 * afterwards, and `useSyncPaymentStatus` needs it to confirm anything.
 */
export function useCreatePayment() {
  return useMutation({
    mutationFn: (bookId: number) => paymentApi.createPayment(bookId),
  });
}

/**
 * Re-check one payment against MoMo and apply the result.
 *
 * THIS IS NOT A READ, DESPITE READING LIKE A STATUS CHECK. `MomoService.syncPaymentStatus` calls
 * MoMo and then runs `applyResult`, which completes the purchase, records the gateway transaction
 * number and paid-at timestamp, and notifies the author. It is how a payment actually finishes
 * when the server-to-server webhook has not landed yet — which is the normal case, because the
 * webhook races the browser redirect back to `/payment/success`.
 *
 * POLLING IT IS SAFE, AND THAT IS A DELIBERATE BACKEND GUARANTEE rather than an assumption:
 * `applyResult` returns early on an already-`COMPLETED` purchase without re-writing fields or
 * re-notifying, with a comment saying so. So `/payment/success` may call this on a bounded
 * interval until `paid` turns true.
 *
 * It is still a mutation rather than a `useQuery` with `refetchInterval`, because that would hand
 * the timing of a payment-completing write to React Query's refetch policy — mount, reconnect and
 * retry included. Firing it is a decision the screen makes each time; the retry loop lives at
 * P2.10d where the timeout and the give-up state are visible next to the UI that explains them.
 *
 * A 404 means this ref is not one of ours. It does not distinguish a fabricated ref from a
 * mistyped one, so it cannot be reported as "payment failed".
 *
 * On a confirmed payment the book's cached branch is invalidated: the purchase flips `purchased`
 * and moves the backend from filling `previewUrl` to filling `downloadUrl`, which is what turns
 * the sample into the real thing.
 */
export function useSyncPaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionRef: string) => paymentApi.syncPaymentStatus(transactionRef),
    onSuccess: (status) => {
      if (status.paid) {
        // The book id is not in the response — only the transaction ref is — so the whole
        // bookstore namespace is invalidated rather than one book. This runs at most once per
        // completed payment, on a screen that shows nothing else.
        queryClient.invalidateQueries({ queryKey: bookstoreKeys.all });
      }
    },
  });
}

/**
 * Settle a purchase without MoMo, for a demo (B27). No `onSuccess` invalidation of its own: the
 * caller (`PaymentResultPanel`) is already mid-`sync`-poll while this is offered, and that poll's
 * own `onSuccess` is what invalidates the bookstore namespace once it next sees `paid: true`.
 *
 * A 404 IS THE EXPECTED SHAPE OF "not available here" — the backend endpoint only exists under
 * its `dev` Spring profile — not a bug to surface. The caller decides what a failure means.
 */
export function useDevSettlePayment() {
  return useMutation({
    mutationFn: (transactionRef: string) => paymentApi.devSettlePayment(transactionRef),
  });
}
