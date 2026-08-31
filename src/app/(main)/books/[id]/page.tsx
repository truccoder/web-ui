'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Badge, Card, EmptyState, Skeleton } from '@/shared/components';
import {
  BookActions,
  BookRatingSummary,
  BookReviewForm,
  BookReviewList,
  StarRating,
  useBook,
  useRatingBreakdown,
} from '@/features/bookstore';
import { formatCurrency, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';

/**
 * `/books/{id}` — one book, on its own page.
 *
 * THE ADDRESS EVERY BOOK CONTROL WAS MISSING. `GET /books/{bookId}` had a frontend caller
 * (`useBook`) and no route to call it from, so a book was reachable only as a cell in the
 * catalogue grid or as an attachment inside a post. Three surfaces were paying for that: a
 * `BOOK_REVIEW` / `BOOK_PURCHASED` notification could not open the book it named, the search
 * type-ahead sent a book row to `/library` and made the reader find it again by eye, and a book
 * result in `/search` was not a link at all. The endpoint was never the gap; the destination was.
 *
 * REVIEWS LIVE HERE, WHICH IS THE HOME `BookActions` SAID THEY NEEDED. That component's note has
 * read "reviews are not wired into this slot… a review form inside every book card in the feed is
 * a different design decision" since P2.10c-2. It is still right — the feed and the catalogue are
 * places you are scanning — and this is the surface where you have stopped on one book, so the
 * histogram, the form and the list finally have somewhere honest to go.
 *
 * THE PAGE IS NOT A SECOND CATALOGUE CARD. The grid clamps the title at two lines and drops
 * `description` entirely, because at 330px it cannot be bounded usefully. Here the measure is the
 * whole canvas and stopping is the point, so the description runs in full and the fields the card
 * had no room for — page count, file size, download count — are stated rather than implied.
 *
 * `BookActions` IS REUSED, NOT REBUILT. It owns the `react-pdf` dynamic import that the production
 * build fails without, and the rule that access is read off `downloadUrl != null` and never off
 * `purchased` (trap 1 on the `Book` type). A second copy of either would drift.
 *
 * 404 AND 503 ARE DIFFERENT FAILURES AND ONLY ONE IS THE BOOK'S FAULT. `GET /books/{id}` presigns
 * storage URLs while serving, so a book whose object is missing answers 503 on an id that exists
 * (findings §3). Both land in the same error branch here because the page cannot render either
 * way, but the copy says "not available" rather than "does not exist" for exactly that reason.
 */
export default function BookDetailPage() {
  const t = useT();
  const localeTag = useIntlLocale();
  const params = useParams<{ id: string }>();

  const raw = Number(params?.id);
  const bookId = Number.isInteger(raw) && raw > 0 ? raw : undefined;

  const { data: book, isPending, isError } = useBook(bookId ?? 0, bookId !== undefined);

  /**
   * READ HERE ONLY TO DECIDE WHETHER THE HISTOGRAM BELONGS ON THE PAGE AT ALL.
   *
   * `BookRatingSummary` and `BookReviewList` each own an empty state, which is right for
   * components that are dropped in separately — and side by side on one card it printed
   * "no reviews yet" twice, once as a line and once as a full empty state. Measured on book 12.
   * The list's is the better of the two (it is the block a reader is looking at when they want
   * reviews), so the summary is the one that stands down.
   *
   * This costs no extra request: same query key as the one the summary itself uses, so React
   * Query serves both from one fetch.
   */
  const { data: breakdown } = useRatingBreakdown(bookId ?? 0, bookId !== undefined);
  const hasRatings = (breakdown?.totalRatings ?? 0) > 0;

  // The cover is presigned at read time, but a URL can still expire in a tab left open, so the
  // placeholder is a state rather than a fallback that only exists in theory.
  const [coverFailed, setCoverFailed] = useState(false);

  const back = (
    <Link
      href="/library"
      className="inline-flex w-fit items-center gap-2 text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('bookDetail.back')}
    </Link>
  );

  if (bookId === undefined || isError || (!isPending && !book)) {
    return (
      <div className="flex flex-col gap-[var(--nx-space-section)]">
        {back}
        <EmptyState
          title={t('bookDetail.notFoundTitle')}
          description={t('bookDetail.notFoundDesc')}
        />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-[var(--nx-space-section)]">
        {back}
        <Card>
          <Skeleton lines={5} />
        </Card>
      </div>
    );
  }

  const showCover = Boolean(book.coverImageUrl?.trim()) && !coverFailed;
  const price =
    book.isFree || book.price == null
      ? t('post.book.free')
      : formatCurrency(book.price, book.currency?.trim() || 'VND', localeTag);

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {back}

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImageUrl ?? undefined}
            alt=""
            className="h-[220px] w-[160px] shrink-0 self-center rounded-nx-sm object-cover sm:self-start"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          /* Same placeholder rule as the catalogue: the title's first letter, so "no cover" does
             not read as "broken image". `aria-hidden` because the title is right beside it. */
          <div
            className="flex h-[220px] w-[160px] shrink-0 items-center justify-center self-center rounded-nx-sm bg-nx-surface-sunken sm:self-start"
            aria-hidden
          >
            <span className="text-[52px] font-semibold text-nx-text-faint">
              {book.title?.trim()?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-[var(--nx-space-tight)]">
          <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
            {book.title || t('bookDetail.untitled')}
          </h1>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-nx-body-sm tabular-nums font-medium text-nx-text-primary">
              {price}
            </span>
            {book.fileFormat && (
              <Badge mono variant="neutral">
                {book.fileFormat}
              </Badge>
            )}
            {/* Only once rated — `avgRating` is 0 on an unrated book, and a row of empty stars
                reads as "rated badly" rather than "not rated". */}
            {book.reviewCount && book.avgRating ? (
              <StarRating rating={book.avgRating} size={13} />
            ) : null}
          </div>

          {book.description && (
            <p className="mt-1 whitespace-pre-wrap text-nx-body-sm text-nx-text-secondary">
              {book.description}
            </p>
          )}

          {/**
           * THE THREE FACTS THE CATALOGUE CARD HAD NO ROOM FOR.
           *
           * Each guards on its own presence rather than on one shared flag: `totalPages` is null
           * for an EPUB the backend could not page, `fileSizeBytes` is always set, and
           * `downloadCount` is 0 rather than null on a book nobody has taken. Better no number
           * than a wrong number, field by field.
           */}
          <dl className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-nx-caption text-nx-text-muted">
            {book.totalPages != null && (
              <div className="inline-flex items-center gap-2">
                <FileText className="size-3.5" aria-hidden />
                <dt className="sr-only">{t('bookDetail.pages')}</dt>
                <dd className="font-mono tabular-nums">
                  {t('bookDetail.pageCount', { count: book.totalPages })}
                </dd>
              </div>
            )}
            {book.fileSizeBytes != null && (
              <div className="inline-flex items-center gap-2">
                <dt className="sr-only">{t('bookDetail.size')}</dt>
                <dd className="font-mono tabular-nums">
                  {/* MiB, not MB: the value is a byte count and the app is talking about a file,
                      where the binary unit is what a file manager will agree with. */}
                  {(book.fileSizeBytes / 1024 / 1024).toLocaleString(localeTag, {
                    maximumFractionDigits: 1,
                  })}{' '}
                  MB
                </dd>
              </div>
            )}
            {book.downloadCount != null && (
              <div className="inline-flex items-center gap-2">
                <Download className="size-3.5" aria-hidden />
                <dt className="sr-only">{t('bookDetail.downloads')}</dt>
                <dd className="font-mono tabular-nums">
                  {book.downloadCount.toLocaleString(localeTag)}
                </dd>
              </div>
            )}
          </dl>

          {book.id != null && (
            <div className="mt-3">
              <BookActions
                bookId={book.id}
                title={book.title ?? ''}
                fileFormat={book.fileFormat}
                isFree={Boolean(book.isFree)}
              />
            </div>
          )}
        </div>
      </Card>

      {book.id != null && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-nx-heading font-semibold text-nx-text-primary">
            {t('bookDetail.reviewsTitle')}
          </h2>

          {hasRatings && <BookRatingSummary bookId={book.id} />}

          {/**
           * THE FORM IS OPEN TO EVERYONE, because the backend is. `createOrUpdateReview` checks
           * nothing but that the book exists — no purchase gate, no author exclusion — and it
           * UPSERTS, so a second submission edits the first rather than adding one. Hiding the
           * form behind a purchase here would be the frontend inventing a rule the product does
           * not have, which is the same mistake `MessageUserButton` refused to make.
           */}
          <BookReviewForm bookId={book.id} />

          <BookReviewList bookId={book.id} />
        </Card>
      )}
    </div>
  );
}
