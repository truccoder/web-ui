'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { booksApi } from '@/lib/api/books';
import { getErrorMessage } from '@/lib/api/error';
import type { CreateReviewRequest } from '@/lib/types';

// The single-book detail endpoint — unlike the newsfeed's FeedBookSummaryDto, this is
// viewer-scoped and includes `purchased`, so it's how the UI learns whether to show
// "Buy" or "Download" for a non-free book.
export function useBook(bookId: number, enabled = true) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: () => booksApi.getBook(bookId).then((r) => r.data),
    enabled,
  });
}

export function useBooksByAuthor(authorId: number, enabled = true) {
  return useQuery({
    queryKey: ['books', 'author', authorId],
    queryFn: () => booksApi.getBooksByAuthor(authorId).then((r) => r.data),
    enabled,
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (bookId: number) => booksApi.deleteBook(bookId).then((r) => r.data),
    onSuccess: (_data, bookId) => {
      qc.removeQueries({ queryKey: ['book', bookId] });
      qc.invalidateQueries({ queryKey: ['books', 'author'] });
      qc.invalidateQueries({ queryKey: ['newsfeed'] });
      toast.success('Book deleted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete book'));
    },
  });
}

// Presigned URLs are short-lived (per FeedBookSummaryDto's own doc comment) — enabled only on
// demand (e.g. clicking "Preview") and not held onto with a long staleTime, so re-opening the
// preview after a while fetches a fresh URL instead of reusing one that may have expired.
export function useBookPreviewUrl(bookId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['book', bookId, 'preview-url'],
    queryFn: () => booksApi.getPreviewUrl(bookId).then((r) => r.data.url),
    enabled,
    staleTime: 0,
  });
}

// One-shot action (not a persistent panel like preview) — fetch a fresh presigned URL and
// open it immediately, rather than holding it in query state.
export function useDownloadBook(bookId: number) {
  return useMutation({
    mutationFn: () => booksApi.getDownloadUrl(bookId).then((r) => r.data.url),
    onSuccess: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to get download link'));
    },
  });
}

export function useBookReviews(bookId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['book', bookId, 'reviews'],
    queryFn: () => booksApi.getReviews(bookId).then((r) => r.data),
    enabled,
  });
}

export function useRatingBreakdown(bookId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['book', bookId, 'rating-breakdown'],
    queryFn: () => booksApi.getRatingBreakdown(bookId).then((r) => r.data),
    enabled,
  });
}

export function useCreateReview(bookId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReviewRequest) =>
      booksApi.createReview(bookId, payload).then((r) => r.data),
    onSuccess: () => {
      // Invalidate the whole ['book', bookId] prefix: a new review changes the reviews
      // list, the rating breakdown, and the book detail's avgRating/reviewCount together.
      qc.invalidateQueries({ queryKey: ['book', bookId] });
      toast.success('Review submitted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to submit review'));
    },
  });
}
