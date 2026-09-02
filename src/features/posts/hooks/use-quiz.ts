'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { quizApi } from '../api/quiz';
import { postKeys } from './keys';
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

/**
 * GET /v1/api/posts/{postId}/quiz/answers — the authored quiz with its answer key.
 *
 * `enabled` is the caller's "this post has a quiz and I am editing it" signal. `retry: false`
 * because a **403** (viewer is not the author) is a permanent answer, not a blip — the edit form
 * falls back to asking the author to re-mark the answers when this fails.
 */
export function useAuthorQuiz(postId: number, enabled: boolean) {
  return useQuery({
    queryKey: postKeys.authorQuiz(postId),
    queryFn: () => quizApi.getAuthorQuiz(postId),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
