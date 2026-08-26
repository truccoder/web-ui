'use client';

import * as React from 'react';
import { Download, ShoppingCart } from 'lucide-react';
import { Button } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useBook, useCreatePayment, useDownloadBook } from '../hooks';

/**
 * The single control that is either "Read" or "Buy", depending on what the backend says the caller
 * may do with this book.
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
  const { data: book, isPending: isLoadingBook, isError: bookFailed } = useBook(bookId, !isFree);
  const {
    mutate: createPayment,
    isPending: isCreatingPayment,
    error: paymentError,
  } = useCreatePayment();
  const { mutate: downloadBook, isPending: isDownloading } = useDownloadBook();

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

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        icon={<ShoppingCart className="h-3.5 w-3.5" />}
        loading={isCreatingPayment}
        onClick={() =>
          createPayment(bookId, {
            onSuccess: (intent) => {
              // `paymentUrl` is read out of MoMo's response map and is genuinely nullable. The
              // legacy version assigned it unconditionally, which navigated the browser to the
              // string "null" when MoMo answered without it. Staying put is the honest failure.
              if (intent.paymentUrl) window.location.href = intent.paymentUrl;
            },
          })
        }
      >
        {t('post.book.buy')}
      </Button>

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
          difference between a wait and a broken button.

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
