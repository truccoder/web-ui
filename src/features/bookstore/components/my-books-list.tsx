'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Dialog, EmptyState } from '@/shared/components';
import { getErrorMessage, getErrorStatus } from '@/shared/lib/api-error';
import { useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { Book } from '../types/book';
import { useBooksByAuthor, useDeleteBook } from '../hooks';
import { BookCell, BookRowSkeleton } from './book-library';

/**
 * Every book one author has published, with the only destructive control the domain has.
 *
 * WHY THIS EXISTS AT ALL. `GET /books/author/{id}` and `DELETE /books/{id}` were the last two
 * bookstore endpoints with no consuming surface — the domain closed at P2.10d reading 9/11. They
 * were never blocked on anything: both work against the running backend. The gap was that no page
 * had a reason to list books *by author* until `/profile` absorbed `/dashboard` at P5.2 and became
 * the one page that is unambiguously about the signed-in account.
 *
 * IT IS NOT A STORE FRONT, BY CHOICE RATHER THAN BY CEILING. This was written when `GET /books`
 * did not exist and the only ways to reach a book were this endpoint or a post embedding one. The
 * backend has since added `GET /books` (`getLibrary`) — so a catalogue is now possible, it is just
 * not this component's job. This lists *your* books and offers the one destructive control an
 * author has; a library browser is a separate surface against a separate endpoint.
 *
 * NO PAGINATION, because the endpoint has none: it returns every book by the author in one array,
 * newest first. Adding `Pagination` here would be a client-side illusion over a complete list —
 * the list scrolls instead, and if an author ever has enough books for that to hurt, the fix is a
 * backend page parameter, not a slice on this side.
 *
 * AN UNKNOWN AUTHOR IS `200 []`, NOT `404` (measured, findings §1). So an empty result cannot be
 * read as "no such user" and the empty state must say "no books" rather than anything about the
 * account — which is also all it could honestly say on a page that only ever shows your own id.
 *
 * WHAT IT DOES NOT BRANCH ON. Nothing here reads `purchased`: on your own free book the backend
 * reports `purchased: false` (trap 1 on the `Book` type), so any control gated on it would vanish
 * from exactly the books you own. Access is read off `downloadUrl != null` wherever it matters.
 * This surface needs neither — an author can always delete, and reading is offered by the feed
 * card that already owns that job.
 */
export interface MyBooksListProps {
  /**
   * Whose books. `undefined` while the profile query is in flight, which keeps the request idle
   * rather than firing it for an id nobody has yet — same contract as `GithubStatsCard`.
   */
  authorId?: number;
  /**
   * Somebody else's shelf — drops the per-row delete and changes the empty state.
   *
   * `DELETE /books/{id}` is author-only server-side, so a viewer pressing it would get a 403; a
   * button that always 403s is a lie in the UI, the same rule `PostMenu` states for edit/delete.
   * The empty copy moves too: the owner's version tells you how to publish a book, which is not
   * something the reader can do on another person's behalf.
   *
   * @default false
   */
  readOnly?: boolean;
}

export function MyBooksList({ authorId, readOnly = false }: MyBooksListProps) {
  const t = useT();
  const localeTag = useIntlLocale();

  const {
    data: books,
    isPending,
    isError,
    error,
  } = useBooksByAuthor(authorId ?? Number.NaN, authorId != null);

  // The book awaiting confirmation, held whole rather than by id: the dialog names the title, and
  // reading it back out of the list would break the instant the delete succeeds and the row goes.
  const [pendingDelete, setPendingDelete] = React.useState<Book | null>(null);
  const remove = useDeleteBook();

  // `isPending` is also true while the query sits idle waiting for `authorId`, so both read as
  // loading — which is what they are from the page's point of view. Same cover-shaped skeleton as
  // `BookLibrary`/`PurchasedBooksList`: this shelf loads into the same grid now.
  if (authorId == null || isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <BookRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    // Same storage failure, same translation — `GET /books/author/{id}` presigns per book too, so
    // this tab goes down with the catalogue. See `BookLibrary` for the full note.
    const message =
      getErrorStatus(error) === 503
        ? t('library.storageError')
        : getErrorMessage(error, t('profile.books.loadError'));

    return <p className="text-nx-caption text-nx-status-danger-fg">{message}</p>;
  }

  if (books.length === 0) {
    return (
      <EmptyState
        compact
        title={t('profile.books.emptyTitle')}
        description={readOnly ? t('profile.books.emptyDescOther') : t('profile.books.emptyDesc')}
      />
    );
  }

  const confirmDelete = () => {
    if (!pendingDelete?.id) return;
    remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  return (
    <>
      {/* SAME GRID, SAME CARD AS `BookLibrary` AND `PurchasedBooksList` — `BookCell` is imported
          rather than re-implemented, so a shelf of your own books renders identically to the
          catalogue and the purchased shelf beside it, down to the hover veil and the price row.
          This used to be its own row layout (a `Card` per book, cover left, facts and a labelled
          delete button right); the owner's request was to fold it into the one shelf design the
          other two tabs already use rather than carry a second card for the same `Book` shape. */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[var(--nx-space-element)]">
        {books.map((book) => (
          <li key={book.id} className="group/mine relative">
            <BookCell book={book} localeTag={localeTag} />

            {/* THE DELETE CONTROL IS A SIBLING OF THE CELL'S LINK, NOT A CHILD OF IT — `BookCell`'s
                own header is explicit that the whole cell became one anchor once its buttons left,
                and a `<button>` nested inside that `<a>` would be unnested by the browser, the same
                ambiguity that argument was written to avoid. Floating it in the corner instead
                keeps one click target per intent: the cover for reading, this chip for deleting.

                THE DARK CHIP MATCHES THE VEIL'S OWN COLOUR, not `IconButton`'s ghost/outline
                treatment — those assume a card surface underneath, and this sits on a photograph
                that can be any colour. `rgba(16,24,32,…)` is the same ink `BookCell`'s gradient
                already uses, so the two floating layers read as one system instead of two.

                REVEALED THE SAME WAY THE TITLE VEIL IS: hidden until hover or keyboard focus, and
                pinned open under `(hover: none)` for a touch screen that cannot hover to find it. */}
            {!readOnly && (
              <button
                type="button"
                title={t('profile.books.delete')}
                aria-label={t('profile.books.deleteAria', { title: book.title ?? '' })}
                onClick={() => {
                  // Clear any error from a previous attempt so the dialog does not open already
                  // showing a failure that belonged to a different book.
                  remove.reset();
                  setPendingDelete(book);
                }}
                className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-nx-full bg-[rgba(16,24,32,0.72)] text-white opacity-0 transition-opacity duration-[var(--nx-duration-fast)] ease-nx-out hover:bg-[rgba(16,24,32,0.9)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring group-hover/mine:opacity-100 group-focus-within/mine:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      <Dialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title={t('profile.books.deleteTitle')}
        description={t('profile.books.deleteDesc', { title: pendingDelete?.title ?? '' })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('profile.books.deleteCancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>
              {t('profile.books.deleteConfirm')}
            </Button>
          </>
        }
      >
        {/* A 403 here means the backend disagrees that this is your book — worth showing verbatim
            rather than flattening to "something went wrong", because it is the one failure that
            tells the user something true about their account. */}
        {remove.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(remove.error, t('profile.books.deleteError'))}
          </p>
        )}
      </Dialog>
    </>
  );
}
