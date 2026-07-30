'use client';

import { useMutation } from '@tanstack/react-query';
import { quizApi } from '../api/quiz';
import type { QuizResult, SubmitQuizRequest } from '../types/quiz';
import type { PostMutationOptions } from './use-post';

export interface SubmitQuizVariables {
  postId: number;
  payload: SubmitQuizRequest;
}

/**
 * POST /v1/api/posts/{postId}/quiz/submit.
 *
 * Nothing to invalidate: the backend stores the attempt but exposes **no endpoint to read
 * it back**, so the grade exists only in this mutation's `data`. That is also why the result
 * must stay mounted — navigating away loses it for good, and the UI (cycle 1's `c` step)
 * has to be built knowing that.
 */
export function useSubmitQuiz(options?: PostMutationOptions<SubmitQuizVariables, QuizResult>) {
  return useMutation({
    mutationFn: ({ postId, payload }: SubmitQuizVariables) => quizApi.submitQuiz(postId, payload),
    ...options,
  });
}
