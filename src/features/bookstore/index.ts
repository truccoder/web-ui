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
 * Bookstore currently reaches the feed through a temporary bridge at
 * `src/components/posts/book-post-actions.tsx`, which `/newsfeed` passes down as a render prop so
 * that `features/newsfeed` never imports it. That bridge is removed at P2.10d — after this feature
 * is built and build-verified, not before (Guardrail B).
 */

export { bookApi, paymentApi } from './api';

export {
  BookActions,
  type BookActionsProps,
  BookPurchaseButton,
  type BookPurchaseButtonProps,
  BookRatingSummary,
  type BookRatingSummaryProps,
  BookReaderDialog,
  type BookReaderDialogProps,
  BookReviewForm,
  type BookReviewFormProps,
  BookReviewList,
  type BookReviewListProps,
  StarRating,
  type StarRatingProps,
} from './components';

export {
  bookstoreKeys,
  useBook,
  useBooksByAuthor,
  useBookPreviewUrl,
  useBookReviews,
  useCreatePayment,
  useCreateReview,
  useDeleteBook,
  useDownloadBook,
  useRatingBreakdown,
  useSyncPaymentStatus,
} from './hooks';

export type {
  Book,
  BookFileFormat,
  BookReview,
  CreateReviewRequest,
  PaymentIntent,
  PaymentStatus,
  PresignedUrl,
  RatingBreakdown,
} from './types';
