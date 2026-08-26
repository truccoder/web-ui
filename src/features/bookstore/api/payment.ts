import api from '@/core/api/axios';
import type { PaymentIntent, PaymentStatus } from '../types/book';

/**
 * `PaymentController` (`/v1/api/payments`) — 3 endpoints, **2 functions**. See `handleMomoWebhook`
 * below for the third.
 *
 * The controller lives in the `com.socialapp.bookstore` package even though its path suggests a
 * domain of its own, so it mirrors into this feature (CLAUDE.md §4). Buying is only ever buying a
 * book here; there is no other payable thing in the product.
 */
export const paymentApi = {
  /**
   * POST /v1/api/payments/books/{bookId} — open a MoMo payment for one book.
   *
   * **400 "This book is free, no payment required"** when the book is free (measured). So the Buy
   * button must be gated on `!isFree && !purchased` before it is ever shown — this endpoint is not
   * a place to discover the answer.
   *
   * Returns MoMo's `paymentUrl` (where to send the user) and `qrCode`, both read out of MoMo's
   * response map and therefore genuinely nullable, plus `transactionRef` — the backend's own order
   * id, always present. Keep `transactionRef`: it is the only handle on the payment afterwards,
   * and `syncPaymentStatus` needs it.
   */
  createPayment: (bookId: number) =>
    api.post<PaymentIntent>(`/v1/api/payments/books/${bookId}`).then((r) => r.data),

  /**
   * POST /v1/api/payments/{transactionRef}/sync — re-check one payment against MoMo.
   *
   * WHY THIS EXISTS AT ALL: MoMo confirms payments to the backend over a server-to-server webhook,
   * which races the browser redirect back to `/payment/success`. The user can easily arrive before
   * the webhook lands. This endpoint asks MoMo directly instead of trusting either the redirect's
   * query string or the webhook's timing, and `{ paid }` is the authoritative answer.
   *
   * 404 "Purchase not found: {ref}" for an unknown ref (measured) — which is also what a
   * fabricated ref returns, so the 404 is not proof of anything except that this ref is not ours.
   */
  syncPaymentStatus: (transactionRef: string) =>
    api
      .post<PaymentStatus>(`/v1/api/payments/${encodeURIComponent(transactionRef)}/sync`)
      .then((r) => r.data),

  /*
   * POST /v1/api/payments/momo/webhook — DELIBERATELY NOT IMPLEMENTED.
   *
   * MoMo calls it server-to-server to report a status change; nothing in a browser has a legitimate
   * reason to. A client-side function for it could only ever be used to forge a payment
   * confirmation, so the omission is the correct implementation rather than a gap.
   *
   * This is one of the two endpoints behind the ledger's note that the real target is 99 endpoints,
   * not 101 (the other being `GET /events/google/callback`, which Google redirects to directly).
   * Recorded here so the Phase 4.7 coverage sweep reads it as intentional and does not "fix" it.
   */

  /**
   * POST /v1/api/payments/{transactionRef}/dev-settle — settle a purchase without MoMo, for a
   * demo (BE `211f073`, B27). **Only exists when the backend runs the `dev` Spring profile** —
   * `DevPaymentController` is `@Profile("dev")`, so calling this against any other environment
   * 404s. Neither MoMo flow can be finished by one person at a desk on the sandbox: `captureWallet`
   * needs a phone to scan the QR, and `payWithATM` — the card screen, easy to fill in by hand —
   * parks forever at result code 7002. This is the one way to reach `COMPLETED` without either.
   *
   * Answers the SAME shape `/sync` does (`PaymentStatusResponse`), on purpose — see the backend's
   * own javadoc — so a caller reuses whatever already handles a poll result instead of learning a
   * second response shape for a development-only route.
   *
   * NOT GATED HERE ON WHETHER `dev` IS ACTIVE — this side cannot know that without asking, and
   * asking is calling it. The caller (`payment-result-panel.tsx`) decides whether to offer the
   * button at all, and treats a 404 here as "this backend is not running `dev`", not as a bug.
   */
  devSettlePayment: (transactionRef: string) =>
    api
      .post<PaymentStatus>(`/v1/api/payments/${encodeURIComponent(transactionRef)}/dev-settle`)
      .then((r) => r.data),
};
