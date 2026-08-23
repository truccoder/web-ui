'use client';

import Link from 'next/link';
import { useT } from '@/core/i18n';
import { formatPriceParts, useIntlLocale } from '@/shared/lib/format';
import type { SearchBook } from '../types/search';

/**
 * One book that matched the query.
 *
 * BOOKS COULD NOT BE FOUND BEFORE B3. `SearchResponse` had two branches, so a book only ever
 * reached this screen as the post it was attached to — and a title with no post behind it was
 * unfindable, on a page the product describes as searching posts, people *and* books.
 *
 * THE COVER IS SMALL HERE, unlike on the shelf. `/library` makes the cover the card because
 * browsing is looking; a search result is a row you are scanning against a term you already
 * typed, so the title leads and the cover is identification, not subject.
 *
 * NO RATING, NO DESCRIPTION. `BookDto` carries both, and neither helps decide whether this is
 * the book you meant — the title and the price do. The reader is one click from the full page.
 */
export interface BookResultCardProps {
  book: SearchBook;
}

export function BookResultCard({ book }: BookResultCardProps) {
  const t = useT();
  const localeTag = useIntlLocale();

  const price =
    book.isFree || book.price == null
      ? { amount: t('post.book.free'), symbol: '' }
      : formatPriceParts(book.price, 'VND', localeTag);

  const body = (
    <div className="flex items-center gap-[var(--nx-space-element)]">
      {/* Plain <img>: MinIO host, presigned URL. A missing cover falls back to the initial rather
          than a broken-image glyph, the same way the shelf does. */}
      {book.coverImageUrl?.trim() ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImageUrl}
          alt=""
          className="aspect-[2/3] w-10 shrink-0 rounded-nx-xs object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid aspect-[2/3] w-10 shrink-0 place-items-center rounded-nx-xs bg-nx-surface-sunken text-nx-body-sm font-semibold text-nx-text-faint"
        >
          {book.title?.trim()?.charAt(0)?.toUpperCase() || '?'}
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-[var(--nx-space-pair)]">
        <span className="truncate text-nx-ui text-nx-text-primary">{book.title}</span>
        <span className="flex items-baseline gap-[var(--nx-space-pair)]">
          <span className="font-mono text-nx-caption tabular-nums text-nx-text-muted">
            {price.amount}
          </span>
          {price.symbol && (
            <span className="text-nx-caption text-nx-text-muted">{price.symbol}</span>
          )}
        </span>
      </span>
    </div>
  );

  return book.id != null ? (
    <Link
      href={`/books/${book.id}`}
      className="block rounded-nx-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
