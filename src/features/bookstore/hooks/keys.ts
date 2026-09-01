/**
 * Query keys for `features/bookstore`, all under one namespace.
 *
 * `detail`, `reviews` and `breakdown` deliberately share the `['bookstore', 'book', id]` prefix so
 * that ONE prefix invalidation after a review refreshes all three. That grouping is not cosmetic:
 * posting a review changes the review list, the star histogram AND the book's own `avgRating` /
 * `reviewCount` (measured — a single review moved `avgRating` from 0 to 5), so anything that keeps
 * them in separate branches will leave a stale average on screen next to a fresh list.
 *
 * `byAuthor` sits outside that prefix because it is keyed by author, not by book. It has to be
 * invalidated explicitly when a book is deleted.
 */
export const bookstoreKeys = {
  /**
   * The catalogue. Its own branch: nothing a single book's write touches can reorder it.
   *
   * KEYED BY TOPIC, AND THAT IS WHAT MAKES CHANGING THE FILTER SAFE. `GET /books` is cursor-paged,
   * so an infinite query holds a chain of pages that only means anything for the list it was
   * fetched from; a shared key would have appended `?category=BACKEND` pages onto the pages of a
   * previous, unfiltered scroll and cached the result as one list. Each topic gets its own chain,
   * each starts from no cursor, and switching back to one already read is instant.
   *
   * `undefined` — "every topic" — is a member of this namespace like any other, not a special
   * case: `['bookstore', 'library', undefined]` is a stable, distinct key.
   */
  library: (category?: string) => ['bookstore', 'library', category] as const,

  /**
   * The caller's own purchases (B37). A separate branch from `library`, not a filtered view of
   * it: the two are different cursor chains against different endpoints, same reasoning as
   * `library` being keyed per topic.
   */
  purchased: ['bookstore', 'purchased'] as const,

  all: ['bookstore'] as const,

  /** Everything about one book — the prefix to invalidate after a review. */
  book: (bookId: number) => ['bookstore', 'book', bookId] as const,

  detail: (bookId: number) => ['bookstore', 'book', bookId, 'detail'] as const,
  reviews: (bookId: number) => ['bookstore', 'book', bookId, 'reviews'] as const,
  breakdown: (bookId: number) => ['bookstore', 'book', bookId, 'breakdown'] as const,

  /**
   * The sample URL is under the book prefix too, but it is the one member that a review does not
   * affect. It is cheap to re-presign, so it rides along rather than earning an exception.
   */
  previewUrl: (bookId: number) => ['bookstore', 'book', bookId, 'preview-url'] as const,

  byAuthor: (authorId: number) => ['bookstore', 'by-author', authorId] as const,
  byAuthorRoot: ['bookstore', 'by-author'] as const,
};
