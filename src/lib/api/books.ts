import api from './axios';
import type {
  BookResponse,
  BookReview,
  CreateReviewRequest,
  PresignedUrlResponse,
} from '@/lib/types';

export const booksApi = {
  getBook: (bookId: number) => api.get<BookResponse>(`/v1/api/books/${bookId}`),

  getPreviewUrl: (bookId: number) =>
    api.get<PresignedUrlResponse>(`/v1/api/books/${bookId}/preview`),

  getDownloadUrl: (bookId: number) =>
    api.get<PresignedUrlResponse>(`/v1/api/books/${bookId}/download`),

  getReviews: (bookId: number) => api.get<BookReview[]>(`/v1/api/books/${bookId}/reviews`),

  createReview: (bookId: number, payload: CreateReviewRequest) =>
    api.post<BookReview>(`/v1/api/books/${bookId}/reviews`, payload),
};
