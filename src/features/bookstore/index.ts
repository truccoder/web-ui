/**
 * `features/bookstore` — mirrors the backend package `com.socialapp.bookstore`
 * (BookController: 8 endpoints + PaymentController: 3 = 11).
 *
 * `PaymentController` serves `/v1/api/payments`, which reads like a domain of its own, but feature
 * boundaries mirror BE package boundaries 1:1 (CLAUDE.md §4) and it lives in `bookstore`. That is
 * also honest to the product: a book is the only payable thing in it.
 *
 * `POST /v1/api/posts/books` — the endpoint that CREATES a book — is not here. It hangs off
 * `PostController` and belongs to `features/posts`, which already covers it. So this feature is
 * everything about a book EXCEPT bringing one into existence.
 *
 * Two measured invariants that every consumer depends on, stated in full on the `Book` type:
 * read `downloadUrl != null` (not `purchased`) to decide full text vs sample, and expect a 503 on
 * a valid book whose storage object is missing.
 *
 * `BookReaderDialog` IS NOT EXPORTED HERE, on purpose. `react-pdf` evaluates `DOMMatrix` at module
 * scope, so it must stay behind the `next/dynamic({ ssr: false })` boundary inside `BookActions`;
 * re-exporting it puts that static path into every server bundle that imports this barrel and
 * breaks the production build. Nothing outside the feature needs it.
 */

export { bookApi, paymentApi } from './api';

export {
  BookActions,
  type BookActionsProps,
  BookLibrary,
  type BookLibraryProps,
  BookPurchaseButton,
  type BookPurchaseButtonProps,
  BookRatingSummary,
  type BookRatingSummaryProps,
  BookReviewForm,
  type BookReviewFormProps,
  BookReviewList,
  type BookReviewListProps,
  MyBooksList,
  type MyBooksListProps,
  PaymentResultPanel,
  type PaymentResultMode,
  type PaymentResultPanelProps,
  StarRating,
  type StarRatingProps,
} from './components';

export {
  bookstoreKeys,
  useBook,
  useLibrary,
  useBooksByAuthor,
  useBookPreviewUrl,
  useBookReviews,
  useCreatePayment,
  useCreateReview,
  useDeleteBook,
  useDevSettlePayment,
  useDownloadBook,
  usePendingPayment,
  usePendingPayments,
  usePendingPaymentByRef,
  useRatingBreakdown,
  useSyncPaymentStatus,
} from './hooks';

/**
 * The browser's own note of a payment it started, exported because the ref is the ONLY handle on
 * an unfinished purchase and the backend has no endpoint that lists one. Consumers outside this
 * feature should reach for the hooks above rather than these; the functions are here so a surface
 * that has to write or drop an entry (a logout teardown, say) can do it through the barrel instead
 * of reaching into the folder.
 */
export {
  extractOrderId,
  forgetPendingPayment,
  isPendingPaymentFresh,
  pendingPaymentExpiresAt,
  rememberPendingPayment,
  PENDING_PAYMENT_TTL_MS,
  type PendingPayment,
} from './lib/pending-payment';

export type {
  Book,
  BookPage,
  BookFileFormat,
  BookReview,
  CreateReviewRequest,
  PaymentIntent,
  PaymentStatus,
  PresignedUrl,
  RatingBreakdown,
} from './types';
