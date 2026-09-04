'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Eye } from 'lucide-react';
import { Button, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useBookPreviewUrl } from '../hooks';
import { BookPurchaseButton } from './book-purchase-button';

/**
 * LOADED CLIENT-SIDE ONLY, AND NOT AS AN OPTIMISATION. `react-pdf` evaluates `DOMMatrix` at module
 * scope, which does not exist in Node — a static import here fails the production build outright
 * with "ReferenceError: DOMMatrix is not defined" while prerendering `/newsfeed` (caught by
 * `yarn build`; `yarn dev` and `tsc` both pass, so the type checker will not warn you).
 *
 * The legacy bridge had the same guard for the same reason. It was lost when this component was
 * rebuilt with a plain import and had to be put back — leaving the note here so the next person to
 * "tidy up the dynamic import" learns it from the comment rather than from a broken deploy.
 */
const BookReaderDialog = dynamic(
  () => import('./book-reader-dialog').then((m) => m.BookReaderDialog),
  { ssr: false }
);

/**
 * The interactive half of a book attached to a post — what fills the `actions` slot that
 * `features/posts`' `BookBody` deliberately leaves empty.
 *
 * WHY THE SLOT EXISTS. `BookController` and `PaymentController` live in the backend package
 * `com.socialapp.bookstore`, so `features/posts` calling them would breach the module boundary
 * (CLAUDE.md §4). `BookBody` renders the cover, title, rating, price and format and opens a slot;
 * this component is what the owning domain drops into it. It replaced the temporary bridge at
 * `src/components/posts/book-post-actions.tsx`, deleted at P2.10d once this was build-verified
 * (Guardrail B).
 *
 * REVIEWS ARE NOT WIRED INTO THIS SLOT. `BookRatingSummary` / `BookReviewList` / `BookReviewForm`
 * exist (P2.10c-2) and are exported, but the feed card shows only read and buy — a review form
 * inside every book card in the feed is a different design decision from the one the bridge made,
 * and belongs to the `/newsfeed` assembly at P3.1 rather than being smuggled in here.
 */
export interface BookActionsProps {
  bookId: number;
  title: string;
  /** `PDF` renders in-app; anything else falls back to a link to the presigned sample. */
  fileFormat: string | null;
  isFree: boolean;
}

export function BookActions({ bookId, title, fileFormat, isFree }: BookActionsProps) {
  const t = useT();
  const isPdf = fileFormat === 'PDF';
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Called unconditionally with a boolean `enabled` so the hook order never changes between
  // renders — the EPUB branch is expressed in the argument, not in whether the hook runs. Nothing
  // is presigned until the sample is actually asked for.
  const {
    data: previewUrl,
    isPending: previewPending,
    isError: previewFailed,
  } = useBookPreviewUrl(bookId, previewOpen && !isPdf);

  // A presigned URL is a plain link, so the browser opens it from a real anchor click. Calling
  // `window.open` from a promise callback depends on the browser's transient-activation window
  // still being alive; an anchor the user clicks directly never is.
  const openInNewTab = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Eye className="h-3.5 w-3.5" />}
          aria-expanded={!isPdf ? previewOpen : undefined}
          onClick={() => setPreviewOpen((open) => !open)}
        >
          {!isPdf && previewOpen ? t('post.book.hidePreview') : t('post.book.preview')}
        </Button>

        <BookPurchaseButton bookId={bookId} isFree={isFree} onDownloadReady={openInNewTab} />
      </div>

      {/* EPUB has no in-app renderer. Rather than open a dialog that can only say so, the sample is
          offered as a link the reader clicks — which is also what keeps the new tab out of the
          popup blocker's reach. */}
      {previewOpen && !isPdf && (
        <div className="mt-3 border-t border-nx-border-subtle pt-3">
          {previewPending ? (
            <Skeleton width={180} />
          ) : previewFailed ? (
            // 503 here means this book's storage object could not be signed, not that the server is
            // down and not that the book has no sample. Saying "no preview available" would report
            // a different fact than the one that happened.
            <p className="text-nx-caption text-nx-status-danger-fg">
              {t('post.book.previewUrlError')}
            </p>
          ) : previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nx-caption text-nx-text-link hover:text-nx-text-link-hover"
            >
              {t('post.book.openPreview')}
            </a>
          ) : null}
        </div>
      )}

      {/* Mounted only while open so the PDF worker and the presign are paid for on demand. */}
      {isPdf && previewOpen && (
        <BookReaderDialog
          bookId={bookId}
          title={title}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
