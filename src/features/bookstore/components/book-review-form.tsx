'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { Button, Textarea } from '@/shared/components';
import { getErrorDetails, getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useCreateReview } from '../hooks';

/**
 * Leave or change a review.
 *
 * ONE FORM COVERS BOTH CASES because the endpoint upserts: posting again returns the same review id
 * with the same `createdAt` and the new rating (measured). There is no "you have already reviewed
 * this" error to guard, no separate edit endpoint, and no need for this component to know which
 * case it is in. The submit label says "send", not "add".
 *
 * IT DOES NOT PRE-FILL AN EXISTING REVIEW. `GET /reviews` returns every review with only a
 * `userId`, and the frontend has no reliable "which of these is mine" — `/profile/me` would give
 * the id, but that is a security-domain call this component has no business making, and getting it
 * wrong would show someone else's words in your own box. Submitting still overwrites correctly;
 * only the pre-fill is missing. Revisit when the backend exposes "my review for this book".
 */
export interface BookReviewFormProps {
  bookId: number;
  /** Called after a review is accepted, so the surrounding surface can react. */
  onSubmitted?: () => void;
}

export function BookReviewForm({ bookId, onSubmitted }: BookReviewFormProps) {
  const t = useT();
  const [rating, setRating] = React.useState(0);
  const [hovered, setHovered] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');
  const { mutate, isPending, error, isError } = useCreateReview(bookId);

  // A 422 carries readable per-field messages in `details`; a 400 (malformed body) carries none and
  // can only be reported generically. Showing `message` for a 422 would print the backend's generic
  // "Invalid request parameters or payload" instead of "rating: must be between 1 and 5".
  const details = isError ? getErrorDetails(error) : [];
  const errorText = isError
    ? details.length > 0
      ? details.join(' · ')
      : getErrorMessage(error, t('post.book.reviewsError'))
    : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // The backend rejects anything outside 1..5 with a 422; the button is disabled below so the
    // empty state never gets that far. This guard is for the Enter key inside the textarea.
    if (rating < 1) return;
    mutate(
      { rating, feedback: feedback.trim() || undefined },
      {
        onSuccess: () => {
          setFeedback('');
          onSubmitted?.();
        },
      }
    );
  };

  const shown = hovered || rating;

  return (
    <form onSubmit={submit} className="space-y-2">
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label={t('post.book.ratingLabel')}
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            className="cursor-pointer rounded-nx-xs p-0.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nx-focus-ring"
          >
            {/* Ink rather than amber, for the reason recorded on `StarRating` — Law 01 keeps amber
                scarce so reputation stays legible. */}
            <Star
              className={
                n <= shown
                  ? 'h-5 w-5 fill-current text-nx-text-primary'
                  : 'h-5 w-5 text-nx-text-faint'
              }
            />
          </button>
        ))}
      </div>

      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder={t('post.book.feedbackPlaceholder')}
        error={errorText}
        rows={2}
        autoResize
      />

      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={isPending} disabled={isPending || rating < 1}>
          {t('post.book.submitReview')}
        </Button>
      </div>
    </form>
  );
}
