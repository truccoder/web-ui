'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, useIntlLocale } from '@/shared/lib/format';

/**
 * Read side of a `BOOK` post — fills `PostCard`'s `body` slot.
 *
 * PRESENTATION ONLY: NO PREVIEW, BUY OR DOWNLOAD BUTTON HERE. Those need
 * `GET /v1/api/books/{bookId}/preview` and `/download`, which belong to
 * `BookController` — the **bookstore** package, a different domain that has not been
 * migrated yet (P2.10). `features/posts` calling them would reach across a boundary
 * CLAUDE.md §4 forbids. The `actions` slot exists so bookstore can hand its own controls in
 * later without this file changing.
 *
 * The feed's own DTO explains why those URLs are absent: `FeedBookSummaryDto` deliberately
 * omits `downloadUrl`/`previewUrl` because they are presigned MinIO links valid 24h, far
 * shorter than the 7-day feed cache, and scoped to the viewer's purchase status. They must
 * be fetched fresh, per viewer, right before use.
 *
 * BACKEND BUG, worked around not fixed: `coverImageUrl` has exactly the same problem and
 * was missed. `BookStorageService.uploadCover` returns a presigned URL with
 * `URL_EXPIRY_HOURS = 24` and that string is **persisted into `t_books` and echoed by the
 * feed forever** — so every book cover stops loading a day after upload. Nothing the
 * frontend can repair; the `onError` fallback below at least degrades to a clean placeholder
 * instead of a broken-image glyph. The real fix is backend-side: store the object key and
 * presign at read time, as the download path already does.
 */
export interface BookBodySummary {
  bookId?: number;
  title?: string;
  description?: string;
  coverImageUrl?: string;
  fileFormat?: string;
  fileSizeBytes?: number;
  totalPages?: number;
  price?: number;
  currency?: string;
  isFree?: boolean;
  avgRating?: number;
  reviewCount?: number;
}

export interface BookBodyProps {
  book: BookBodySummary;
  /** Buy / read / preview controls, supplied by `features/bookstore` once it exists. */
  actions?: ReactNode;
  className?: string;
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function BookBody({ book, actions, className }: BookBodyProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const [coverFailed, setCoverFailed] = useState(false);

  const { title, description, coverImageUrl, fileFormat, fileSizeBytes, totalPages } = book;
  const { price, currency, isFree, avgRating, reviewCount } = book;

  if (!title?.trim()) return null;

  const showCover = Boolean(coverImageUrl?.trim()) && !coverFailed;
  // `isFree` is authoritative: `buildAndSaveBook` forces `price = 0` when it is set, so a
  // stale non-zero price must never win over the flag.
  const priceLabel =
    isFree || !price
      ? t('post.book.free')
      : formatCurrency(price, currency?.trim() || 'VND', localeTag);

  return (
    <div className={cn('flex gap-3 rounded-nx-sm border border-nx-border-default p-3', className)}>
      {showCover ? (
        // Presigned, expiring, third-party-hosted URL — see the note above.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImageUrl}
          alt=""
          onError={() => setCoverFailed(true)}
          className="h-28 w-20 shrink-0 rounded-nx-xs border border-nx-border-subtle object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="h-28 w-20 shrink-0 rounded-nx-xs border border-nx-border-subtle bg-nx-surface-sunken"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-nx-ui font-semibold text-nx-text-primary">{title}</p>

        {description?.trim() && (
          <p className="line-clamp-2 text-nx-body-sm text-nx-text-secondary">{description}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {fileFormat && (
            <Badge mono variant="neutral">
              {fileFormat}
            </Badge>
          )}
          <Badge variant={isFree || !price ? 'success' : 'accent'}>{priceLabel}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-3 font-mono text-nx-micro text-nx-text-muted">
          {/* `totalPages` counts pages for PDF and chapters for EPUB — the backend's
              `generatePreview` uses one field for both units. Labelled generically for
              that reason. */}
          {totalPages ? <span>{t('post.body.bookUnits', { count: totalPages })}</span> : null}
          {fileSizeBytes ? <span>{formatSize(fileSizeBytes)}</span> : null}
          {/* Only shown once someone has actually rated it: `avgRating` on a book with no
              reviews is 0, and "0.0 ★" reads as a bad book rather than an unrated one. */}
          {reviewCount && avgRating ? (
            <span>
              {avgRating.toFixed(1)} ★ · {t('post.book.reviewCount', { count: reviewCount })}
            </span>
          ) : null}
        </div>

        {actions}
      </div>
    </div>
  );
}
