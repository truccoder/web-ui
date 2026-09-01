import api from '@/core/api/axios';
import type { QuizDetails } from '../types/post';
import type { QuizResult, SubmitQuizRequest } from '../types/quiz';

/** QuizController (`com.socialapp.posts`) — 2 endpoints. */
export const quizApi = {
  /**
   * POST /v1/api/posts/{postId}/quiz/submit — grade an attempt and persist the answers.
   *
   * The attempt is stored, but there is **no endpoint to read a previous attempt back**, so
   * the result is only available in this response.
   */
  submitQuiz: (postId: number, payload: SubmitQuizRequest) =>
    api.post<QuizResult>(`/v1/api/posts/${postId}/quiz/submit`, payload).then((r) => r.data),

  /**
   * GET /v1/api/posts/{postId}/quiz/answers — the authored quiz, answer key included
   * (`getQuizForAuthor`).
   *
   * AUTHOR-ONLY: **403** for anyone else. Returns the full `QuizDetails` — every question with
   * its `correctOptionIndex` and `explanation` — unlike the `PublicQuizDetailsDto` the feed
   * payload carries. This is what lets the edit form rebuild the quiz without wiping the key on
   * save (the failure `post-editor.tsx` used to warn about).
   */
  getAuthorQuiz: (postId: number) =>
    api.get<QuizDetails>(`/v1/api/posts/${postId}/quiz/answers`).then((r) => r.data),
};
