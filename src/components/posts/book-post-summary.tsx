'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Star, Eye, MessageSquare, Loader2, ShoppingCart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
          className="h-7 px-3 text-xs shrink-0"
          disabled={isPending || rating < 1}
          onClick={handleSubmit}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            t('post.book.submitReview')
          )}
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

  if (book.isFree) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs gap-1"
        disabled={isDownloading}
        onClick={() => downloadBook()}
      >
        {isDownloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {t('post.book.download')}
      </Button>
    );
  }

  if (isLoadingDetail) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs gap-1"
        disabled
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }

  if (bookDetail?.purchased) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs gap-1"
        disabled={isDownloading}
        onClick={() => downloadBook()}
      >
        {isDownloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {t('post.book.download')}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      className="h-7 px-2.5 text-xs gap-1"
      disabled={isCreatingPayment}
      onClick={() =>
        createPayment(book.bookId, {
          onSuccess: (data) => {
            window.location.href = data.paymentUrl;
          },
        })
      }
    >
      {isCreatingPayment ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ShoppingCart className="h-3.5 w-3.5" />
      )}
      {t('post.book.buy')}
    </Button>
  );
}

interface BookPostSummaryProps {
  book: FeedBookSummary;
}

export function BookPostSummary({ book }: BookPostSummaryProps) {
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
    <div className="mt-3 rounded-lg border p-3">
      <div className="flex gap-3">
        {book.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImageUrl}
            alt=""
            className="h-20 w-14 rounded object-cover shrink-0 border"
          />
        ) : (
          <div className="h-20 w-14 rounded bg-muted flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{book.title}</p>
          {book.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{book.description}</p>
          )}

          <div className="flex items-center gap-1.5 mt-1">
            <StarRating rating={book.avgRating} />
            <span className="text-xs text-muted-foreground">
              {book.avgRating.toFixed(1)} ({t('post.book.reviewCount', { count: book.reviewCount })}
              )
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span>{book.fileFormat}</span>
            <span>·</span>
            <span>
              {book.isFree
                ? t('post.book.free')
                : `${book.price.toLocaleString('vi-VN')} ${book.currency}`}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {isPdf ? (
              <BookReaderDialog
                bookId={book.bookId}
                title={book.title}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t('post.book.preview')}
                  </Button>
                }
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => setPreviewOpen((v) => !v)}
              >
                <Eye className="h-3.5 w-3.5" />
                {previewOpen ? t('post.book.hidePreview') : t('post.book.preview')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => setReviewsOpen((v) => !v)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {reviewsOpen ? t('post.book.hideReviews') : t('post.book.reviews')}
            </Button>
            <PurchaseAction book={book} />
          </div>
        </div>
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
