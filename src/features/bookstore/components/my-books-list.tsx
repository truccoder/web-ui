'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Badge, Button, Card, Dialog, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatCurrency, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { Book } from '../types/book';
import { useBooksByAuthor, useDeleteBook } from '../hooks';
import { StarRating } from './star-rating';

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
}

export function MyBooksList({ authorId }: MyBooksListProps) {
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
  // loading — which is what they are from the page's point of view.
  if (authorId == null || isPending) {
    return (
      <div className="space-y-3">
        <Skeleton lines={2} />
        <Skeleton lines={2} />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('profile.books.loadError'))}
      </p>
    );
  }

  if (books.length === 0) {
    return (
      <EmptyState
        compact
        title={t('profile.books.emptyTitle')}
        description={t('profile.books.emptyDesc')}
      />
    );
  }

  const confirmDelete = () => {
    if (!pendingDelete?.id) return;
    remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  return (
    <>
      <ul className="flex flex-col gap-3">
        {books.map((book) => (
          <li key={book.id}>
            <BookRow
              book={book}
              localeTag={localeTag}
              onDelete={() => {
                // Clear any error from a previous attempt so the dialog does not open already
                // showing a failure that belonged to a different book.
                remove.reset();
                setPendingDelete(book);
              }}
            />
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

function BookRow({
  book,
  localeTag,
  onDelete,
}: {
  book: Book;
  localeTag: string;
  onDelete: () => void;
}) {
  const t = useT();
  const [coverFailed, setCoverFailed] = React.useState(false);
  const showCover = Boolean(book.coverImageUrl?.trim()) && !coverFailed;

  const price =
    book.isFree || book.price == null
      ? t('post.book.free')
      : formatCurrency(book.price, book.currency?.trim() || 'VND', localeTag);

  return (
    <Card padding={12} className="flex items-start gap-3">
      {/* The cover is presigned at read time now (B4 fixed), but a URL can still expire in a
          long-lived tab or point at a missing object, so the fallback stays — a clean placeholder
          beats a broken-image glyph. Plain <img>: the host is MinIO, which next/image would need
          configured as a remote pattern for no benefit at this size. */}
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImageUrl ?? undefined}
          alt=""
          className="h-16 w-12 shrink-0 rounded-nx-sm object-cover"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <div className="h-16 w-12 shrink-0 rounded-nx-sm bg-nx-surface-sunken" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-nx-body font-medium text-nx-text-primary">{book.title}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-nx-caption text-nx-text-secondary">{price}</span>
          {book.fileFormat && (
            <Badge mono variant="neutral">
              {book.fileFormat}
            </Badge>
          )}
          {/* Only once someone has actually rated it: `avgRating` on an unrated book is 0, and a
              row of empty stars reads as "rated badly" rather than "not rated". */}
          {book.reviewCount && book.avgRating ? (
            <StarRating rating={book.avgRating} size={11} />
          ) : null}
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        icon={<Trash2 className="size-3.5" />}
        onClick={onDelete}
        aria-label={t('profile.books.deleteAria', { title: book.title ?? '' })}
      >
        {t('profile.books.delete')}
      </Button>
    </Card>
  );
}
