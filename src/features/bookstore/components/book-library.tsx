'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatCurrency, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import type { Book } from '../types/book';
import { useLibrary } from '../hooks';
import { StarRating } from './star-rating';

/**
 * The catalogue — every book in the product, newest first.
 *
 * THE SCREEN THIS FEATURE COULD NOT HAVE UNTIL 2026-08-09. `GET /books` did not exist, so for the
 * whole of Phase 2 the only routes to a book were its author's list or a post that embedded it,
 * and the ledger recorded "no `GET /books`" as a ceiling in the same family as "no public profile".
 * `getLibrary` removed it.
 *
 * A TWO-UP GRID, AND THAT REVERSES R4-2's "rows, not a grid".
 *
 * R4-2 argued the decision needs title, price, rating and controls on one line of sight, and that a
 * grid optimises for browsing by picture. Opening the rendered kit settled it the other way: the
 * cards are 330 wide, two to the 672 measure, and every one of those four facts is still on the
 * card — a grid cell is not a cover, it is a narrower row. What the row layout actually bought was
 * a 672-wide band per book, most of it empty, so four books filled a screen that now holds eight.
 *
 * `auto-fit minmax(260px, 1fr)` rather than a fixed two columns: at the 672 measure it resolves to
 * exactly the kit's 330 + 12 + 330, and it folds to one column on a narrow canvas without a
 * breakpoint deciding when.
 *
 * THE CELL CARRIES NO CONTROLS, AND THAT IS WHAT UNCRAMPED IT. The owner reported the two-up grid
 * as *rất chật*; the measured cause was not the column count, which matches the kit exactly, but
 * what we were putting in the column. Ours packed a cover, a two-line title, a price row and
 * `BookActions` — two 32-tall buttons — into 222px of text column. The kit's own cell at the same
 * 330 × 222 holds four readouts and **no button at all**: title · author · stars + `4.3 · 27` ·
 * price + a status pill.
 *
 * That is P3's clause (c) as R9 corrected it, applied honestly: *a row you act on is a unit of
 * work, but a route is not a commit.* Buying and reading are commits, and they belong on the
 * book's own page, which exists (`/books/{id}`) and already reuses `BookActions` — so nothing was
 * lost, it moved one click away and one screen wider. The grid goes back to being a thing you
 * scan.
 *
 * THE WHOLE CELL IS THE LINK NOW, which only became safe once the buttons left: a `<button>`
 * inside an `<a>` is unnested by browsers, and a purchase sharing a click target with a navigation
 * is the kind of ambiguity that gets someone charged. With no control inside, the card is one
 * target for one intent.
 *
 * THE AUTHOR LINE IS ABSENT AND CANNOT BE ADDED HERE. The kit's second row is `Phạm Anh Khoa`;
 * `BookResponseDto` carries `authorId` and no name, and there is no batch user lookup to resolve
 * one per cell without N requests per page. Raised as a backend request — an `authorName` on the
 * DTO closes it with one row of JSX.
 *
 * INFINITE SCROLL, because the endpoint is cursor-paged and reports only `hasMore` — there is no
 * total to render a pager from. Same shape as the feed and the friends list.
 */
export interface BookLibraryProps {
  className?: string;
}

function BookRowSkeleton() {
  return (
    <Card padding={12} className="flex items-start gap-3">
      <Skeleton width={48} height={64} />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton width={200} height={14} />
        <Skeleton width={120} height={12} />
      </div>
    </Card>
  );
}

export function BookLibrary({ className }: BookLibraryProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const library = useLibrary();
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = library;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (library.isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (library.isError) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(library.error, t('library.loadError'))}
      </p>
    );
  }

  const books = library.data?.pages.flatMap((page) => page.items) ?? [];

  if (books.length === 0) {
    return <EmptyState title={t('library.emptyTitle')} description={t('library.emptyDesc')} />;
  }

  return (
    <div className={className}>
      {/* 12 between cells — the kit's own grid gap, measured on its library screen. */}
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        {books.map((book) => (
          <li key={book.id}>
            <BookRow book={book} localeTag={localeTag} />
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          <BookRowSkeleton />
        </div>
      )}
    </div>
  );
}

function BookRow({ book, localeTag }: { book: Book; localeTag: string }) {
  const t = useT();
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(book.coverImageUrl?.trim()) && !coverFailed;

  const price =
    book.isFree || book.price == null
      ? t('post.book.free')
      : formatCurrency(book.price, book.currency?.trim() || 'VND', localeTag);

  /**
   * A FILLED CARD — reverting a `bare` I should never have shipped.
   *
   * The kit's README (round 5.1) says the book grid is one of four sets whose members become
   * `Card variant="bare"`: no fill, no border, hover only, because a filled member inside a
   * 12px-gap set is a padding-beats-gap inversion. I applied it. Measured afterwards, the kit's
   * own book cell is `330 wide · background rgb(255,255,255) · padding 16px 20px · radius 8` —
   * a plain filled card, in a grid with exactly the 12px gap the passage calls an inversion.
   *
   * So the kit ships the thing its README says it removed. That is now the FIFTH place where
   * this README's prose and its render disagree (datum 28 vs 20, field 360 vs 320, the brand
   * slot, the 24 padding, this) — and the rule stands: the render is the specimen, the prose is
   * a draft note.
   */
  const body = (
    <Card interactive={book.id != null} className="flex h-full items-start gap-3">
      {/* Presigned at read time now, but a URL can still expire in a long-lived tab — the
          placeholder beats a broken-image glyph. Plain <img>: the host is MinIO, which
          next/image would need configured as a remote pattern for no benefit at this size. */}
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImageUrl ?? undefined}
          alt=""
          className="h-[74px] w-[54px] shrink-0 rounded-nx-sm object-cover"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        /* A COVER PLACEHOLDER THAT SAYS "no cover", NOT "broken". It used to be an empty grey
           rectangle, which reads as a failed image — the reader cannot tell a book with no cover
           from one whose cover would not load. The title's first letter is the cheapest signal
           that something is deliberately standing in for the artwork, and it doubles as a weak
           identifier when scanning a list. `aria-hidden` because the title is right beside it;
           announcing the letter would read the same word twice. */
        <div
          className="flex h-[74px] w-[54px] shrink-0 items-center justify-center rounded-nx-sm bg-nx-surface-sunken"
          aria-hidden
        >
          <span className="text-nx-title font-semibold text-nx-text-faint">
            {book.title?.trim()?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
      )}

      {/* `gap-2` is the kit's 8 between the four readouts — the sub-scale's `tight`, because a
          title and the facts about it are one reading, not four blocks. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
        {/* TWO LINES MAX. At 222px of text column a long title runs to four lines and pushes the
            price off the bottom of a card whose neighbour has none of that — the grid's cells
            would end at different places for a reason nobody can see. The kit clamps at two and
            so does this. `description` was dropped in the same move: it is the one field that
            cannot be bounded usefully at this width, and the decision (what · how much · how
            good) never needed it. */}
        <p className="line-clamp-2 text-nx-heading font-semibold text-nx-text-primary">
          {book.title}
        </p>

        {/* Only once rated: `avgRating` on an unrated book is 0, and a row of empty stars reads
            as "rated badly" rather than "not rated". The kit pairs the stars with `4.3 · 27` —
            the stars carry the shape, the numbers carry the precision and the sample size. */}
        {book.reviewCount && book.avgRating ? (
          <span className="flex items-center gap-2">
            <StarRating rating={book.avgRating} size={14} />
            <span className="font-mono text-nx-micro tabular-nums text-nx-text-muted">
              {book.avgRating.toFixed(1)} · {book.reviewCount}
            </span>
          </span>
        ) : null}

        {/* `mt-auto` pins the price row to the card's bottom edge, so a one-line title and a
            two-line title still end on the same baseline across the row. */}
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className="font-mono text-nx-caption tabular-nums text-nx-text-primary">
            {price}
          </span>
          {/**
           * THE PILL IS GATED ON `isFree` FIRST, and the order is the whole point — trap 1 on the
           * `Book` type is that the backend computes `purchased` as `!isFree && …`, so a free
           * book reports `purchased: false` even to its own author. Testing `purchased` first
           * would silently label every free book as not-yet-owned.
           */}
          {book.isFree ? (
            <Badge variant="neutral">{t('post.book.free')}</Badge>
          ) : book.purchased ? (
            <Badge variant="success">{t('library.owned')}</Badge>
          ) : null}
        </div>
      </div>
    </Card>
  );

  // The route is the cell's only interaction, so it takes the whole cell rather than the title
  // alone. `h-full` on the anchor keeps the card stretching to the grid row's height.
  return book.id != null ? (
    <Link
      href={`/books/${book.id}`}
      className="block h-full rounded-nx-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
