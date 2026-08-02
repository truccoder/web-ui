import api from '@/core/api/axios';
import type {
  Book,
  BookReview,
  CreateReviewRequest,
  PresignedUrl,
  RatingBreakdown,
} from '../types/book';

/**
 * `BookController` (`com.socialapp.bookstore`) — 8 endpoints, 8 functions. Bare responses, no
 * envelope, consistent with every other controller in this backend.
 *
 * THERE IS NO "LIST BOOKS" ENDPOINT. No `GET /books`, no search, no pagination anywhere in this
 * controller. The only ways to reach a book are `getBooksByAuthor` and the book summary embedded
 * in a feed/search post. Same family of limitation as `posts` having no `GET /posts` — design to
 * it rather than around it.
 */
export const bookApi = {
  /**
   * GET /v1/api/books/{bookId} — one book, with the caller's access already resolved into it.
   *
   * READ `downloadUrl != null` TO DECIDE FULL-TEXT VS SAMPLE, NOT `purchased`. The backend fills
   * exactly one of `downloadUrl`/`previewUrl` after evaluating (free ∨ purchased ∨ is-author), and
   * `purchased` is hardcoded false for free books. Both traps are spelled out on the `Book` type.
   *
   * 404 when the id does not exist. A NON-NUMERIC id is a **400** ("Invalid value 'abc' for
   * parameter 'bookId'"), not a 404 — path-variable binding fails before the service is reached.
   *
   * CAN RETURN **503** ON A PERFECTLY VALID BOOK. Building this DTO always presigns one URL, and
   * `BookStorageService` wraps any presign failure in a `StorageException` → 503 "Failed to
   * generate download URL". A missing MinIO bucket or a missing object therefore takes down the
   * whole response — including the title and price the caller may be the only thing wanting.
   * Measured on a fresh environment where MinIO had no buckets at all. Treat 503 here as "this
   * one book's storage is broken", not as "the server is down", and never render it as an empty
   * state.
   */
  getBook: (bookId: number) => api.get<Book>(`/v1/api/books/${bookId}`).then((r) => r.data),

  /**
   * GET /v1/api/books/author/{authorId} — every book by one author, newest first.
   *
   * NOT PAGINATED — the backend returns the entire list. Fine at current data volumes; it is a
   * ceiling to remember rather than one to work around here.
   *
   * AN UNKNOWN AUTHOR IS `[]` WITH A 200, NOT A 404 (measured on id 999999) — the query simply
   * matches nothing, and no user lookup happens. So an empty result cannot distinguish "this
   * person has written no books" from "this person does not exist", and the UI should say the
   * former.
   *
   * Inherits the 503 hazard of `getBook`, amplified: the DTO is built per book, so ONE book with
   * broken storage fails the entire list.
   */
  getBooksByAuthor: (authorId: number) =>
    api.get<Book[]>(`/v1/api/books/author/${authorId}`).then((r) => r.data),

  /**
   * GET /v1/api/books/{bookId}/download — a fresh 24-hour presigned URL for the full file.
   *
   * THIS GET WRITES TO THE DATABASE. `BookService.getFullDownloadUrl` increments
   * `downloadCount` and saves the row before returning. Measured: two calls moved a book from
   * `downloadCount: 0` to `2`.
   *
   * CONSEQUENCE FOR THE STATE LAYER — it must be a mutation, never a query. A `useQuery` inflates
   * a counter the user can see, on paths nobody writes deliberately: refetch on mount once stale,
   * refetch on reconnect, refetch on any `invalidateQueries` touching its key, and `retry: 1` from
   * the shared client re-issuing a request the backend may already have counted before failing.
   * (Window-focus refetching specifically would NOT do it — `makeQueryClient` sets
   * `refetchOnWindowFocus: false` app-wide — but every other trigger is live.) The legacy hook
   * happened to be a mutation for an unrelated reason ("one-shot action"); the real reason is this
   * one.
   *
   * 403 "You must purchase this book before downloading" when the book is paid and the caller is
   * neither the author nor a completed purchaser. That check is the authoritative one — the
   * absence of `downloadUrl` on the book DTO is the same decision surfaced earlier.
   */
  getDownloadUrl: (bookId: number) =>
    api.get<PresignedUrl>(`/v1/api/books/${bookId}/download`).then((r) => r.data),

  /**
   * GET /v1/api/books/{bookId}/preview — presigned URL for the sample.
   *
   * NO SIDE EFFECT and NO ACCESS CHECK: unlike `/download` this neither counts nor gates, so it is
   * a normal query. Falls back to the full file's key when a book has no separate preview object
   * (`previewKeyOrFallback`), which is why a book with `previewPages: 0` still yields a URL.
   */
  getPreviewUrl: (bookId: number) =>
    api.get<PresignedUrl>(`/v1/api/books/${bookId}/preview`).then((r) => r.data),

  /**
   * DELETE /v1/api/books/{bookId} — author-only. Returns `void`.
   *
   * 403 "Only the author can delete this book" otherwise. Deletes the database row only; the
   * MinIO objects are left behind, same class of orphan as `be-requests.md` B11.
   */
  deleteBook: (bookId: number) => api.delete<void>(`/v1/api/books/${bookId}`).then(() => undefined),

  /**
   * POST /v1/api/books/{bookId}/reviews — leave or change a review.
   *
   * IT IS AN UPSERT DESPITE THE NAME. The controller calls `createOrUpdateReview`: posting twice
   * returns the SAME review id with the SAME `createdAt` and the new rating (measured), and the
   * list stays at one entry. So "already reviewed" is not an error state to guard, there is no
   * separate edit endpoint to find, and re-posting is how editing works.
   *
   * Reviewing YOUR OWN book is allowed — the backend does not check authorship (measured: 200).
   *
   * VALIDATION ERRORS COME BACK AS **422**, not 400: `rating` outside 1..5 or missing yields
   * `details: ["Property rating: must be less than or equal to 5"]` and friends — a readable
   * per-field array worth surfacing next to the input. A wrong-typed `rating` is a **400**
   * "Malformed request body" with `details: null` and can never name a field. The line is
   * bean-validation vs deserialization. Note this domain sits with `search` (422) rather than
   * `trending` (400) for the same class of violation, which is exactly why it was measured instead
   * of assumed.
   */
  createReview: (bookId: number, payload: CreateReviewRequest) =>
    api.post<BookReview>(`/v1/api/books/${bookId}/reviews`, payload).then((r) => r.data),

  /**
   * GET /v1/api/books/{bookId}/reviews — every review, unpaginated.
   *
   * 404 when the book does not exist (the service resolves the book before the reviews), so this
   * is one of the few list endpoints here that distinguishes "no such book" from "no reviews".
   *
   * Each entry carries `userId` and nothing else identifying — see `BookReview` for why names
   * cannot be shown.
   */
  getReviews: (bookId: number) =>
    api.get<BookReview[]>(`/v1/api/books/${bookId}/reviews`).then((r) => r.data),

  /**
   * GET /v1/api/books/{bookId}/reviews/breakdown — the 1..5 star histogram.
   *
   * A book with no reviews returns all six counters as `0` rather than an empty body (measured),
   * so `totalRatings === 0` is the empty-state test.
   */
  getRatingBreakdown: (bookId: number) =>
    api.get<RatingBreakdown>(`/v1/api/books/${bookId}/reviews/breakdown`).then((r) => r.data),
};
