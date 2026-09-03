'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Download, ShoppingCart } from 'lucide-react';
import { Button, ButtonLink } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { extractOrderId, rememberPendingPayment } from '../lib/pending-payment';
import { useBook, useCreatePayment, useDownloadBook, usePendingPayment } from '../hooks';

/**
 * The single control that is either "Read" or "Buy", depending on what the backend says the caller
 * may do with this book — plus the way back to a payment that was started and not finished.
 *
 * THE PREDICATE IS `downloadUrl != null`, NOT `purchased`. The backend fills exactly one of
 * `downloadUrl` / `previewUrl` after evaluating (free ∨ purchased ∨ is-author), and it hardcodes
 * `purchased: false` for free books — measured, including for a free book's own author. Reading
 * `purchased` here would hide the Read button on every free book in the app. The full derivation is
 * on the `Book` type; it is restated at the one place that acts on it.
 *
 * WHY IT FETCHES THE BOOK AT ALL. The feed's embedded book summary carries `isFree` but not the
 * caller's access, so a paid book cannot be told apart from a paid book already bought without
 * asking. The fetch is skipped for free books, where the summary alone is conclusive.
 */
export interface BookPurchaseButtonProps {
  bookId: number;
  /** From the feed's book summary — lets the free case skip the detail fetch entirely. */
  isFree: boolean;
  /** Called with the presigned URL once a download has been granted. */
  onDownloadReady: (url: string) => void;
}

export function BookPurchaseButton({ bookId, isFree, onDownloadReady }: BookPurchaseButtonProps) {
  const t = useT();
  const router = useRouter();
  const { data: book, isPending: isLoadingBook, isError: bookFailed } = useBook(bookId, !isFree);
  const {
    mutate: createPayment,
    isPending: isCreatingPayment,
    error: paymentError,
  } = useCreatePayment();
  const { mutate: downloadBook, isPending: isDownloading } = useDownloadBook();

  // What this browser remembers about an unfinished payment for THIS book. The backend has no
  // endpoint that lists a buyer's orders, so without this note a payment the reader walked away
  // from is unreachable — see `lib/pending-payment.ts` for the whole argument.
  const pending = usePendingPayment(bookId);

  // A free book is readable by definition; for anything else the backend's own answer decides.
  const canRead = isFree || book?.downloadUrl != null;

  if (canRead) {
    return (
      <Button
        size="sm"
        variant="secondary"
        icon={<Download className="h-3.5 w-3.5" />}
        loading={isDownloading}
        onClick={() => downloadBook(bookId, { onSuccess: onDownloadReady })}
      >
        {t('post.book.download')}
      </Button>
    );
  }

  // A FAILED LOOKUP MUST NOT FALL THROUGH TO "BUY". Caught by verification: when the detail call
  // errors, this component previously offered to sell a book it could not read — for a 404 that is
  // a payment for something that does not exist, and for the 503 this endpoint returns when a
  // book's storage object cannot be presigned (findings §3) it is a payment for a file nobody can
  // deliver. An error means access is UNKNOWN, which is not the same as "not purchased".
  if (bookFailed) {
    return (
      <Button size="sm" variant="secondary" disabled>
        {t('post.book.unavailable')}
      </Button>
    );
  }

  // Access is unknown until the detail call lands. Offering "Buy" before then would invite an owner
  // to start paying for a book they already have.
  if (isLoadingBook) {
    return <Button size="sm" variant="secondary" loading disabled />;
  }

  /**
   * A REMEMBERED PAYMENT NEVER REMOVES "BUY" WHEN ITS AGE IS A GUESS. Two kinds of note reach here
   * and they carry different certainty:
   *
   *   - one this app wrote when it created the payment — the ref, MoMo's page, and the exact
   *     moment. It is safe to lead with it and stand down the Buy button, because the backend
   *     would refuse a second attempt for the same fifteen minutes anyway.
   *   - one recovered from the backend's "already in progress (orderId=…)" rejection. That
   *     rejection does not say when the attempt started, so the note's clock starts late by an
   *     unknown amount — up to the full window. Hiding Buy behind it could keep the only way to
   *     buy the book off screen for as much as half an hour after the order really died.
   *
   * So the recovered case shows both, and lets the backend be the one that says no.
   */
  const statusHref = pending
    ? `/payment/pending?orderId=${encodeURIComponent(pending.transactionRef)}`
    : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {pending && statusHref && (
          <ButtonLink
            href={statusHref}
            size="sm"
            variant="secondary"
            icon={<Clock />}
            className="h-3.5 w-3.5"
          >
            {pending.recovered ? t('post.book.checkPayment') : t('post.book.resumePayment')}
          </ButtonLink>
        )}

        {(!pending || pending.recovered) && (
          <Button
            size="sm"
            icon={<ShoppingCart className="h-3.5 w-3.5" />}
            loading={isCreatingPayment}
            onClick={() =>
              createPayment(bookId, {
                onSuccess: (intent) => {
                  // WRITTEN BEFORE ANYTHING NAVIGATES, and that order is the point. Everything
                  // after this line either leaves the page or opens another one; a ref that is not
                  // on disk by then is a ref the app can never ask about again.
                  rememberPendingPayment({
                    bookId,
                    transactionRef: intent.transactionRef,
                    paymentUrl: intent.paymentUrl ?? null,
                    startedAt: Date.now(),
                    recovered: false,
                  });

                  // MOMO GOES IN ITS OWN TAB, AND THIS TAB STAYS IN THE APP. Handing the whole tab
                  // to MoMo — what this did before — makes the app blind for the entire payment:
                  // MoMo's page only sends the browser back once the order SETTLES, and the flow
                  // it now uses is a QR code that is paid on a phone, so on a desktop the tab that
                  // opened it can sit there for ever with nothing to show. The waiting screen this
                  // pushes to polls the ref instead and resolves on its own, whichever device the
                  // money actually leaves from.
                  //
                  // `window.open` from a settled promise is outside the browser's transient
                  // activation window and may be blocked — this is the same trap `BookActions`
                  // documents for presigned links. It is best-effort ON PURPOSE: the waiting
                  // screen carries an "open MoMo" anchor built from the same `paymentUrl`, so a
                  // blocked popup costs one click and never strands the buyer.
                  //
                  // `paymentUrl` is read out of MoMo's response map and is genuinely nullable. The
                  // legacy version assigned it unconditionally, which navigated the browser to the
                  // string "null" when MoMo answered without it.
                  if (intent.paymentUrl) {
                    window.open(intent.paymentUrl, '_blank', 'noopener,noreferrer');
                  }

                  router.push(
                    `/payment/pending?orderId=${encodeURIComponent(intent.transactionRef)}`
                  );
                },
                onError: (error) => {
                  // THE REJECTION THAT NAMES AN ORDER IS A SECOND CHANCE AT THE REF. A pending
                  // attempt this browser has forgotten — paid on a phone, or started before a
                  // cache clear — comes back only in the text of this 400. Lifting the id out of
                  // it turns the message from a dead end into a link; the message itself is still
                  // shown below, unedited.
                  const recoveredRef = extractOrderId(getErrorMessage(error));
                  if (recoveredRef) {
                    rememberPendingPayment({
                      bookId,
                      transactionRef: recoveredRef,
                      paymentUrl: null,
                      startedAt: Date.now(),
                      recovered: true,
                    });
                  }
                },
              })
            }
          >
            {t('post.book.buy')}
          </Button>
        )}
      </div>

      {/* A REJECTED PURCHASE USED TO PRODUCE NOTHING AT ALL. `createPayment` was called with an
          `onSuccess` and no `onError`, so every 400 this endpoint returns ended as an unread
          error on the mutation: the spinner stopped, the button sat there, and the reader had no
          way to know the click had been answered.

          The case that surfaced it is the one a reader is most likely to hit. A payment attempt
          that was started and not finished holds the book's single purchase row PENDING, and the
          backend refuses a second attempt for as long as that ref might still be payable —
          `MomoService.PENDING_PAYMENT_STALE_MINUTES`, 15 minutes. So after any abandoned checkout,
          pressing Buy again on the SAME book does nothing for a quarter of an hour. The message
          explains exactly that, names the orderId and says to try again shortly; showing it is the
          difference between a wait and a broken button — and `onError` above now turns the orderId
          it names into the button beside it.

          The backend's own sentence, not a mapping from the status: 400 here also covers "this
          book is free" and "cannot purchase your own book", so status alone cannot pick the copy,
          and matching on message text breaks the day the backend rephrases it (see
          `shared/lib/api-error`). */}
      {paymentError && (
        <p role="status" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(paymentError)}
        </p>
      )}
    </div>
  );
}
