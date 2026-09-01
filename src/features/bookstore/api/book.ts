import api from '@/core/api/axios';
import type {
  Book,
  BookPage,
  BookReview,
  CreateReviewRequest,
  LearningCategory,
  PresignedUrl,
  RatingBreakdown,
} from '../types/book';

/**
 * `BookController` (`com.socialapp.bookstore`) — 10 endpoints, 10 functions. Bare responses, no
 * envelope, consistent with every other controller in this backend.
 *
 * THIS HEADER USED TO SAY "THERE IS NO LIST BOOKS ENDPOINT", and it was true until 2026-08-09.
 * `GET /books` exists now, cursor-paged and filterable by topic — see `getLibrary`. A second gap
 * closed 01/09/2026 (B37, `docs/backend-plan.md`): `GET /books/purchased` lists the CALLER'S own
 * purchases — see `getPurchasedBooks`. What has still never existed is a SEARCH over books; the
 * ways to reach one book remain the catalogue, the purchased list, `getBooksByAuthor`, and the
 * summary embedded in a feed or search post.
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
  /**
   * GET /v1/api/books — the whole catalogue, newest first. The `Thư viện` destination.
   *
   * NEW ON 2026-08-09, AND IT REMOVES A CEILING THIS FEATURE WAS BUILT AROUND. Until it shipped
   * there was no way to list books at all: the only routes to one were `GET /books/author/{id}`
   * and a post that happened to embed it, which is why the domain had a "my books" surface long
   * before it had a shop.
   *
   * Cursor-paginated like `/posts/public`, not page-paginated like `/feed` — pass back the
   * `nextCursor` you were given, and send none at all for the first page.
   *
   * `category` NARROWS THE CATALOGUE TO ONE TOPIC, and it is filtered inside the paging query
   * rather than after it (BE `15090af`). That matters to the caller: a topic with books but none
   * on the first page would otherwise come back empty, and scrolling would not save it — every
   * page would be empty the same way.
   *
   * OMIT IT ENTIRELY FOR "EVERY TOPIC". Not an empty string: anything outside `LearningCategory`
   * fails Spring's binding with a **400**, which is deliberate on the backend's part — a filter
   * that silently returned the whole catalogue when its value was wrong would look exactly like a
   * filter that is broken. `axios` drops `undefined` params, so passing `undefined` is the same as
   * omitting it.
   *
   * A CURSOR BELONGS TO THE LIST IT WAS ISSUED FOR. The ordering is id-descending either way, so
   * reusing one across a topic change does not error — it just resumes from a position in a
   * different list. The state layer keys each topic separately, which is what stops that happening.
   */
  getLibrary: (cursor?: number, limit = 12, category?: LearningCategory) =>
    api.get<BookPage>('/v1/api/books', { params: { cursor, limit, category } }).then((r) => r.data),

  /**
   * GET /v1/api/books/purchased — every book the CALLER has bought, newest first. B37, shipped
   * 01/09/2026.
   *
   * Cursor-paginated like `getLibrary`, and no `category` param — the endpoint does not accept
   * one (measured against the regenerated `schema.gen.ts`).
   *
   * Same `Book` DTO, so both traps on the type still apply: read `downloadUrl != null` for access,
   * and do not use this endpoint's mere presence in a page as a stand-in for `purchased` — that
   * field's `!isFree` quirk is a property of the DTO, not of which list served it.
   */
  getPurchasedBooks: (cursor?: number, limit = 12) =>
    api.get<BookPage>('/v1/api/books/purchased', { params: { cursor, limit } }).then((r) => r.data),

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
