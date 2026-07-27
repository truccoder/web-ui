'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Star, Eye, MessageSquare, Loader2, ShoppingCart, Download } from 'lucide-react';
import { Button } from '@/shared/components';
import { useT } from '@/lib/i18n';
import {
  useBook,
  useBookPreviewUrl,
  useBookReviews,
  useCreateReview,
  useDownloadBook,
} from '@/lib/hooks/use-books';
import { useCreatePayment } from '@/lib/hooks/use-payments';
import { getErrorMessage } from '@/lib/api/error';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import type { FeedBookSummary } from '@/lib/types';

/**
 * Buy / preview / review controls for a book attached to a post — a BRIDGE, exactly like
 * `create-event-form.tsx`, and kept for the same reason.
 *
 * P2.4'd replaced the legacy `post-card.tsx` with `features/posts`' `PostCard` + `BookBody`.
 * `BookBody` deliberately ships no buy or read button: `BookController` and
 * `PaymentController` live in the backend package `com.socialapp.bookstore`, and
 * `features/posts` calling into them would breach the module boundary (CLAUDE.md §4). It
 * exposes an `actions` slot for the owning domain to fill instead.
 *
 * That domain is `bookstore`, which has not been migrated yet (P2.10). Deleting the legacy
 * `book-post-summary.tsx` outright would therefore have removed the only purchase, download,
 * preview and review surface in the whole app — a regression, not a cleanup (Guardrail C).
 * So this file is what is left of that component after its presentational half (cover,
 * title, rating, price, format) moved to `BookBody`: the interactive half only, dropped into
 * the slot built for it.
 *
 * AT P2.10 this file is deleted and `features/bookstore` supplies the slot instead. Its
 * internals are consciously still legacy — shadcn-era markup, `@/lib/hooks` — because
 * rebuilding them against `shared/components` is that checkpoint's work, not this one's. The
 * buttons alone use `shared/components` since they sit inside the new card and a shadcn
 * button next to a hand-written one reads as a rendering bug.
 */

// react-pdf touches browser-only APIs (Worker, canvas, DOMMatrix) that don't exist during SSR.
const BookReaderDialog = dynamic(
  () => import('./book-reader-dialog').then((m) => m.BookReaderDialog),
  { ssr: false }
);

interface StarRatingProps {
  rating: number;
  size?: number;
}

function StarRating({ rating, size = 13 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        // Clips the filled star to the fractional part it earns (0-100%), so a 3.5 rating
        // renders as 3 full stars + 1 half-filled star + 1 empty star, not just rounded off.
        const fillPercent = Math.round(Math.max(0, Math.min(1, rating - i)) * 100);
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-muted-foreground/30"
              style={{ width: size, height: size }}
            />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              <Star className="fill-current text-amber-500" style={{ width: size, height: size }} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="cursor-pointer"
        >
          <Star
            className={
              n <= display
                ? 'h-5 w-5 fill-current text-amber-500'
                : 'h-5 w-5 text-muted-foreground/30'
            }
          />
        </button>
      ))}
    </div>
  );
}

function ReviewsPanel({ bookId }: { bookId: number }) {
  const t = useT();
  const { data: reviews, isLoading, isError } = useBookReviews(bookId, true);
  const { mutate: createReview, isPending } = useCreateReview(bookId);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (rating < 1) return;
    createReview(
      { rating, feedback: feedback.trim() || undefined },
      { onSuccess: () => setFeedback('') }
    );
  };

  return (
    <div className="mt-2 pt-2 border-t space-y-2">
      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-xs text-destructive">{t('post.book.reviewsError')}</p>
      ) : !reviews || reviews.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('post.book.noReviews')}</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="flex items-start gap-2 text-xs">
              <div
                className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-medium ${getNeutralAvatarColor(String(review.userId))}`}
              >
                {review.userId}
              </div>
              <div className="min-w-0">
                <StarRating rating={review.rating} size={11} />
                {review.feedback && (
                  <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {review.feedback}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <StarPicker value={rating} onChange={setRating} />
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t('post.book.feedbackPlaceholder')}
          className="flex-1 bg-muted rounded-full px-3 py-1 text-xs placeholder:text-muted-foreground focus:outline-none"
        />
        <Button
          size="sm"
          disabled={isPending || rating < 1}
          loading={isPending}
          onClick={handleSubmit}
        >
          {t('post.book.submitReview')}
        </Button>
      </div>
    </div>
  );
}

function PurchaseAction({ book }: { book: FeedBookSummary }) {
  const t = useT();
  const { data: bookDetail, isLoading: isLoadingDetail } = useBook(book.bookId, !book.isFree);
  const { mutate: createPayment, isPending: isCreatingPayment } = useCreatePayment();
  const { mutate: downloadBook, isPending: isDownloading } = useDownloadBook(book.bookId);

  // Free books, and paid books already bought, are the same control: download.
  if (book.isFree || bookDetail?.purchased) {
    return (
      <Button
        size="sm"
        variant="secondary"
        icon={<Download className="h-3.5 w-3.5" />}
        loading={isDownloading}
        onClick={() => downloadBook()}
      >
        {t('post.book.download')}
      </Button>
    );
  }

  // Purchase state is unknown until the detail call lands; offering "Buy" before then would
  // let an owner start paying twice.
  if (isLoadingDetail) {
    return <Button size="sm" variant="secondary" loading disabled />;
  }

  return (
    <Button
      size="sm"
      icon={<ShoppingCart className="h-3.5 w-3.5" />}
      loading={isCreatingPayment}
      onClick={() =>
        createPayment(book.bookId, {
          onSuccess: (data) => {
            window.location.href = data.paymentUrl;
          },
        })
      }
    >
      {t('post.book.buy')}
    </Button>
  );
}

export interface BookPostActionsProps {
  book: FeedBookSummary;
}

export function BookPostActions({ book }: BookPostActionsProps) {
  const t = useT();
  const isPdf = book.fileFormat === 'PDF';
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const {
    data: previewUrl,
    isLoading: previewLoading,
    isError: previewFailed,
    error: previewError,
  } = useBookPreviewUrl(book.bookId, previewOpen && !isPdf);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {isPdf ? (
          // PDFs render in-app; EPUBs have no in-app reader, so their preview is a link to
          // the presigned URL fetched below.
          <BookReaderDialog
            bookId={book.bookId}
            title={book.title}
            trigger={
              <Button size="sm" variant="secondary" icon={<Eye className="h-3.5 w-3.5" />}>
                {t('post.book.preview')}
              </Button>
            }
          />
        ) : (
          <Button
            size="sm"
            variant="secondary"
            icon={<Eye className="h-3.5 w-3.5" />}
            aria-expanded={previewOpen}
            onClick={() => setPreviewOpen((open) => !open)}
          >
            {previewOpen ? t('post.book.hidePreview') : t('post.book.preview')}
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          aria-expanded={reviewsOpen}
          onClick={() => setReviewsOpen((open) => !open)}
        >
          {reviewsOpen ? t('post.book.hideReviews') : t('post.book.reviews')}
        </Button>

        <PurchaseAction book={book} />
      </div>

      {previewOpen && !isPdf && (
        <div className="mt-3 pt-3 border-t">
          {previewLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : previewFailed ? (
            <p className="text-xs text-destructive">
              {getErrorMessage(previewError, t('post.book.previewUrlError'))}
            </p>
          ) : previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {t('post.book.openPreview')}
            </a>
          ) : null}
        </div>
      )}

      {reviewsOpen && <ReviewsPanel bookId={book.bookId} />}
    </div>
  );
}
