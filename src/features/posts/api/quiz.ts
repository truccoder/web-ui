import api from '@/core/api/axios';
import type { QuizResult, SubmitQuizRequest } from '../types/quiz';

/** QuizController (`com.socialapp.posts`) — 1 endpoint. */
export const quizApi = {
  /**
   * POST /v1/api/posts/{postId}/quiz/submit — grade an attempt and persist the answers.
   *
   * The attempt is stored, but there is **no endpoint to read a previous attempt back**, so
   * the result is only available in this response.
   */
  submitQuiz: (postId: number, payload: SubmitQuizRequest) =>
    api.post<QuizResult>(`/v1/api/posts/${postId}/quiz/submit`, payload).then((r) => r.data),
};
