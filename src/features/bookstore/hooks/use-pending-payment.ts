'use client';

import * as React from 'react';
import {
  getPendingPayments,
  getPendingPaymentsServerSnapshot,
  isPendingPaymentFresh,
  subscribePendingPayments,
  type PendingPayment,
} from '../lib/pending-payment';

/**
 * React's view of the payments this browser remembers.
 *
 * `useSyncExternalStore` RATHER THAN `useState` + an effect, because the store has three writers
 * that are not this component: the Buy button, the waiting screen that settles a payment, and
 * ANOTHER TAB — the buy flow opens MoMo in its own tab on purpose, so the tab that completes a
 * payment is routinely not the tab showing the book. A `useState` snapshot taken on mount would
 * leave a stale "Resume payment" button standing on the feed behind a payment that has finished.
 *
 * It also gets the server render right for free: `getServerSnapshot` returns the empty list, so
 * the server HTML and the first client render agree and nothing hydrates twice.
 */
export function usePendingPayments(): PendingPayment[] {
  return React.useSyncExternalStore(
    subscribePendingPayments,
    getPendingPayments,
    getPendingPaymentsServerSnapshot
  );
}

/**
 * The unfinished payment for one book, or `null`.
 *
 * FRESHNESS IS DECIDED AT READ TIME, NOT BY PRUNING. Expiry is a function of the clock, and a
 * component may not write to the store while rendering; entries are dropped for real on the next
 * write (`rememberPendingPayment`). An expired entry therefore still exists — it just stops being
 * offered, which is all the difference the reader can see.
 *
 * The freshness cutoff is evaluated once per render rather than on a timer: nothing on screen has
 * to flip the instant the window closes, and the waiting screen — the one surface where the
 * remaining time is the point — runs its own countdown.
 */
export function usePendingPayment(bookId: number): PendingPayment | null {
  const pending = usePendingPayments();
  return React.useMemo(
    () => pending.find((entry) => entry.bookId === bookId && isPendingPaymentFresh(entry)) ?? null,
    [pending, bookId]
  );
}

/**
 * The remembered entry for one ref, fresh or not.
 *
 * NO FRESHNESS FILTER HERE, deliberately. This is what the waiting screen uses to find the MoMo
 * link and the countdown for the ref in its URL, and a screen that is *about* an expired order
 * still needs to be able to say so — filtering the entry out would leave it unable to explain why
 * it has nothing to offer.
 */
export function usePendingPaymentByRef(transactionRef: string | null): PendingPayment | null {
  const pending = usePendingPayments();
  return React.useMemo(
    () =>
      transactionRef == null
        ? null
        : (pending.find((entry) => entry.transactionRef === transactionRef) ?? null),
    [pending, transactionRef]
  );
}
