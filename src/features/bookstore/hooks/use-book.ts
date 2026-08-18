'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookApi } from '../api';
import type { CreateReviewRequest } from '../types/book';
import { bookstoreKeys } from './keys';

/**
 * Bookstore state layer. Hooks return the feature's own DTOs directly — no mapping to a UI shape —
 * and stay free of toasts and navigation; the screens own feedback. Server state lives in React
 * Query, never Redux. Same shape as `friendships` and `posts`.
 *
 * The one rule specific to this domain: `GET /books/{id}/download` writes to the database, so it
 * is a MUTATION here even though it is a GET on the wire. See `useDownloadBook`.
 */

/**
 * One book, with the caller's access already resolved into `downloadUrl` / `previewUrl`.
 *
 * Consumers decide "full text or sample" from `downloadUrl != null`, never from `purchased` — the
 * backend hardcodes `purchased: false` for free books, including for their own author. The full
 * reasoning is on the `Book` type; it is repeated at every layer because getting it wrong produces
 * a UI that looks fine and hides the Read button on every free book.
 */
export function useBook(bookId: number, enabled = true) {
  return useQuery({
    queryKey: bookstoreKeys.detail(bookId),
    queryFn: () => bookApi.getBook(bookId),
    enabled: enabled && Number.isFinite(bookId),
  });
}

/**
 * Every book by one author, newest first. Not paginated by the backend.
 *
 * An unknown author is a 200 with `[]`, not a 404, so an empty result cannot be read as "no such
 * user" — the empty state has to say "no books".
 */
export function useBooksByAuthor(authorId: number, enabled = true) {
  return useQuery({
    queryKey: bookstoreKeys.byAuthor(authorId),
    queryFn: () => bookApi.getBooksByAuthor(authorId),
    enabled: enabled && Number.isFinite(authorId),
  });
}

/**
 * GET /v1/api/books — the catalogue, cursor-paged. Backs the `Thư viện` screen.
 *
 * `initialPageParam` is `undefined`, not 0: no cursor means "from the newest", while `cursor=0`
 * would ask for books after id 0 — the oldest page. Same contract as the public feed.
 *
 * NOT INVALIDATED BY `useDeleteBook`, deliberately: that mutation sweeps `byAuthorRoot` because it
 * knows a book left some author's list, but the catalogue is a separate branch and a deleted book
 * disappearing from it costs one refetch on the next visit. Sweeping both from a delete would tie
 * the shop's cache to a management action taken on a different screen.
 */
export function useLibrary(enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: bookstoreKeys.library,
    queryFn: ({ pageParam }) => bookApi.getLibrary(pageParam, 12),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
  });
}

/**
 * Presigned URL for the sample.
 *
 * A PLAIN QUERY, UNLIKE `useDownloadBook` — `/preview` neither counts nor gates, so refetching it
 * costs nothing but a signature. `enabled` is required rather than defaulted because the caller is
 * a reader panel that should not presign anything until it is actually opened.
 *
 * `staleTime` is one hour: the URL the backend signs is valid for 24, so an hour keeps the cached
 * value comfortably inside its own lifetime while avoiding a round trip every time the panel
 * remounts. A tab left open past 24 hours will hold a dead URL — the reader surface handles that
 * as a load error at P2.10c-1 rather than the cache trying to predict it.
 */
export function useBookPreviewUrl(bookId: number, enabled: boolean) {
  return useQuery({
    queryKey: bookstoreKeys.previewUrl(bookId),
    queryFn: () => bookApi.getPreviewUrl(bookId).then((r) => r.url),
    enabled: enabled && Number.isFinite(bookId),
    staleTime: 60 * 60_000,
  });
}

/**
 * Fetch a fresh download URL for the full file.
 *
 * A MUTATION BECAUSE THE ENDPOINT WRITES. `BookService.getFullDownloadUrl` increments
 * `downloadCount` and saves before returning; two calls moved a probe book from 0 to 2 (measured).
 * As a query it would inflate that counter on remount, on reconnect, on any invalidation touching
 * its key, and through the shared client's `retry: 1`. None of those are things anyone would
 * choose, and the number is visible to users — so the write is only ever made on purpose.
 *
 * IT DOES NOT OPEN THE URL. The legacy hook called `window.open` inside `onSuccess`; that is
 * navigation, which belongs to the screen (and a popup opened from a promise callback is at the
 * mercy of the browser's transient-activation window). The hook returns the URL and P2.10c-1
 * decides how to hand it to the user.
 *
 * On success the book detail is invalidated so the freshly incremented `downloadCount` is what the
 * UI shows next.
 *
 * A 403 here means the book is paid and the caller has not bought it — the same decision the book
 * DTO already expressed by leaving `downloadUrl` null, surfacing again at the moment of use.
 */
export function useDownloadBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) => bookApi.getDownloadUrl(bookId).then((r) => r.url),
    onSuccess: (_url, bookId) => {
      queryClient.invalidateQueries({ queryKey: bookstoreKeys.detail(bookId) });
    },
  });
}

/** Every review on a book. 404 when the book itself does not exist. */
export function useBookReviews(bookId: number, enabled = true) {
  return useQuery({
    queryKey: bookstoreKeys.reviews(bookId),
    queryFn: () => bookApi.getReviews(bookId),
    enabled: enabled && Number.isFinite(bookId),
  });
}

/**
 * Star histogram. A book with no reviews returns all six counters as `0`, so `totalRatings === 0`
 * is the empty-state test rather than a missing body.
 */
export function useRatingBreakdown(bookId: number, enabled = true) {
  return useQuery({
    queryKey: bookstoreKeys.breakdown(bookId),
    queryFn: () => bookApi.getRatingBreakdown(bookId),
    enabled: enabled && Number.isFinite(bookId),
  });
}

/**
 * Leave or change a review.
 *
 * ONE HOOK COVERS BOTH because the endpoint upserts: posting twice returns the same review id with
 * the same `createdAt` and the new rating (measured). So there is no "already reviewed" error to
 * handle, no separate edit mutation to write, and the form at P2.10c-2 does not need to know which
 * case it is in.
 *
 * Invalidates the whole `book(bookId)` prefix rather than the review list alone — the new rating
 * also moves `avgRating` and `reviewCount` on the book detail and every bucket of the breakdown.
 * Invalidating only the list would leave a stale average sitting directly above a fresh review.
 *
 * NO OPTIMISTIC UPDATE. The server recomputes the average, and guessing it here means either
 * showing a number that will change under the user or reimplementing the aggregate — the same
 * reasoning that kept reactions optimistic only on `myReaction` in `posts`.
 *
 * DELIBERATELY DOES NOT TOUCH THE FEED. A book summary is embedded in newsfeed and search
 * payloads, so a new rating leaves those stale until they refetch on their own. Reaching into
 * another feature's query keys from here would be exactly the cross-domain coupling CLAUDE.md §4
 * forbids; the settled convention from `posts` is that the composing page passes invalidation in.
 */
export function useCreateReview(bookId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewRequest) => bookApi.createReview(bookId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookstoreKeys.book(bookId) });
    },
  });
}

/**
 * Delete a book. Author-only; 403 otherwise.
 *
 * Removes the book's cached branch outright instead of invalidating it — refetching a deleted id
 * would only produce a 404 and an error state for something the user just chose to destroy. The
 * author lists are invalidated by prefix because this book may appear in more than one of them and
 * the mutation is not told whose list to fix.
 */
export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: number) => bookApi.deleteBook(bookId),
    onSuccess: (_void, bookId) => {
      queryClient.removeQueries({ queryKey: bookstoreKeys.book(bookId) });
      queryClient.invalidateQueries({ queryKey: bookstoreKeys.byAuthorRoot });
    },
  });
}
