'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/core/i18n';
import { StarRating } from '@/features/bookstore';
import { formatPriceParts, useIntlLocale } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { SearchBook } from '../types/search';

/**
 * One book that matched the query — THE COVER IS THE CARD, exactly as `/library` draws it.
 *
 * This used to be a small thumbnail pinned left of a title row inside a bordered list. The owner's
 * note was "làm theo dạng card list như trang chính thư viện": a search hit for a book is the same
 * object the shelf shows, so it gets the same cell. Modelled on `BookLibrary`'s `BookCell` — cover
 * at the paperback 2/3 ratio, the facts on a veil that appears on hover/focus, the title permanent
 * underneath — with the two fields the search payload does not carry dropped: `BookDto` has no
 * `reviewCount` and no `purchased`, so there is no "· 27" after the rating and no owned badge.
 *
 * Rendered inside the grid `SearchResults` lays out for the books section and the books tab.
 */
export interface BookResultCardProps {
  book: SearchBook;
}

export function BookResultCard({ book }: BookResultCardProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(book.coverImageUrl?.trim()) && !coverFailed;

  const price =
    book.isFree || book.price == null
      ? { amount: t('post.book.free'), symbol: '' }
      : formatPriceParts(book.price, 'VND', localeTag);

  const cover = showCover ? (
    // Plain <img>: MinIO host, presigned URL that expires — `next/image` would cache a dead URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.coverImageUrl ?? undefined}
      alt=""
      className="size-full object-cover"
      onError={() => setCoverFailed(true)}
    />
  ) : (
    <div className="grid size-full place-items-center bg-nx-surface-sunken" aria-hidden>
      <span className="text-nx-display font-semibold text-nx-text-faint">
        {book.title?.trim()?.charAt(0)?.toUpperCase() || '?'}
      </span>
    </div>
  );

  const cell = (
    <>
      <div className="aspect-[2/3] w-full overflow-hidden rounded-nx-md bg-nx-surface-sunken">
        {cover}
      </div>

      <div
        className={cn(
          'absolute inset-x-0 top-0 aspect-[2/3] flex flex-col justify-end gap-[var(--nx-space-tight)]',
          'rounded-nx-md p-[var(--nx-space-element)]',
          'bg-gradient-to-t from-[rgba(16,24,32,0.97)] from-30% via-[rgba(16,24,32,0.82)] via-60% to-transparent',
          'opacity-0 transition-opacity duration-[var(--nx-duration-fast)] ease-nx-out',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          '[@media(hover:none)]:opacity-100'
        )}
      >
        {book.avgRating != null && (
          <span className="flex flex-col gap-[var(--nx-space-pair)]">
            <StarRating
              rating={book.avgRating}
              size={12}
              filledClassName="text-nx-brand-ink-text"
              emptyClassName="text-nx-brand-ink-muted"
            />
            <span className="font-mono text-nx-micro tabular-nums text-nx-brand-ink-muted">
              {book.avgRating.toFixed(1)}
            </span>
          </span>
        )}

        <span className="flex items-baseline gap-[var(--nx-space-pair)]">
          <span className="font-mono text-nx-body font-semibold tabular-nums text-nx-brand-ink-text">
            {price.amount}
          </span>
          {price.symbol && (
            <span className="text-nx-body-sm text-nx-brand-ink-text">{price.symbol}</span>
          )}
        </span>
      </div>

      <p className="mt-[var(--nx-space-tight)] line-clamp-2 text-nx-body-sm font-medium text-nx-text-primary">
        {book.title}
      </p>
    </>
  );

  return book.id != null ? (
    <Link
      href={`/books/${book.id}`}
      aria-label={book.title ?? undefined}
      className="group relative block rounded-nx-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
    >
      {cell}
    </Link>
  ) : (
    <div className="group relative block">{cell}</div>
  );
}
