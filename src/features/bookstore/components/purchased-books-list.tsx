'use client';

import { EmptyState } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage, getErrorStatus } from '@/shared/lib/api-error';
import { useIntlLocale } from '@/shared/lib/format';
import { useInfiniteScroll } from '@/shared/lib/use-infinite-scroll';
import { useT } from '@/core/i18n';
import { usePurchasedBooks } from '../hooks';
import { BookCell, BookRowSkeleton } from './book-library';

/**
 * `Sách đã mua` — every book the signed-in reader has bought. B37.
 *
 * COULD NOT EXIST BEFORE 01/09/2026: `BookController` had no endpoint keyed on the buyer until
 * `GET /books/purchased` shipped (see `bookApi.getPurchasedBooks` and `docs/backend-plan.md`).
 * Filtering the catalogue client-side was never an option — `Book.purchased` is hardcoded false
 * for every free book (trap 1 on the `Book` type), so a client-side filter would silently drop
 * free books the reader owns.
 *
 * SAME GRID, SAME CARD AS `BookLibrary` — `BookCell` is imported rather than re-implemented, so a
 * purchased book and a catalogue book render identically down to the hover veil and the price row.
 * `BookLibrary` still decides `owned` badges the same way (`!isFree && purchased`); this list does
 * not need its own copy of that rule.
 *
 * NO CATEGORY FILTER, unlike `BookLibrary`: `/books/purchased` takes only `cursor`/`limit`
 * (confirmed against the regenerated `schema.gen.ts` — no `category` parameter exists on this
 * path). A reader's own purchases are one shelf, not one per topic.
 */
export interface PurchasedBooksListProps {
  className?: string;
}

export function PurchasedBooksList({ className }: PurchasedBooksListProps) {
  const t = useT();
  const localeTag = useIntlLocale();

  const purchased = usePurchasedBooks();
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = purchased;

  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // Same 503 treatment as `BookLibrary`: building the DTO presigns one URL per book, so one broken
  // storage object takes down the whole page, catalogue or purchased alike.
  const errorMessage = purchased.isError
    ? getErrorStatus(purchased.error) === 503
      ? t('library.storageError')
      : getErrorMessage(purchased.error, t('library.purchasedLoadError'))
    : null;

  const books = purchased.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className={cn('flex flex-col gap-[var(--nx-space-group)]', className)}>
      {purchased.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookRowSkeleton key={i} />
          ))}
        </div>
      ) : errorMessage !== null ? (
        <p className="text-nx-caption text-nx-status-danger-fg">{errorMessage}</p>
      ) : books.length === 0 ? (
        <EmptyState
          title={t('library.purchasedEmptyTitle')}
          description={t('library.purchasedEmptyDesc')}
        />
      ) : (
        <div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
            {books.map((book) => (
              <li key={book.id}>
                <BookCell book={book} localeTag={localeTag} />
              </li>
            ))}
          </ul>

          <div ref={sentinelRef} />

          {isFetchingNextPage && (
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
              <BookRowSkeleton />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
