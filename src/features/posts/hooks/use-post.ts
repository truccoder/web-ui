'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { postsApi } from '../api/post';
import type {
  CreateBookRequest,
  CreatePostRequest,
  CreatePostResponse,
  UpdatePostRequest,
} from '../types/post';
import { postKeys } from './keys';

/**
 * Posts state layer, cycle 1 (PostController). The two creates answer `{ postId,
 * moderationStatus }` and every other endpoint here returns **void** — there is still no
 * updated post to fold into a cache. So these hooks invalidate what this domain owns and
 * nothing else, and hand the create response straight back to the caller: it is what tells the
 * composer where to navigate and whether moderation has already cleared the post.
 *
 * CROSS-DOMAIN REFRESH IS THE CALLER'S JOB, deliberately. The read side of a post is the
 * **feed** (`newsfeed`) and **search** — other domains, with their own query keys. Reaching
 * into those keys from here would hardcode another feature's cache layout and fail the
 * extraction test (CLAUDE.md §4). Instead every mutation takes the standard React Query
 * options, so the composing side does:
 *
 * ```ts
 * const qc = useQueryClient();
 * const create = useCreatePost({
 *   onSuccess: () => qc.invalidateQueries({ queryKey: newsfeedKeys.feed() }),
 * });
 * ```
 *
 * The dependency then points newsfeed → posts, which is the direction that already exists
 * (newsfeed renders the composer), rather than posts → newsfeed.
 *
 * Hooks stay free of toasts and navigation; the screens own feedback.
 */

/** Caller-supplied mutation options. `mutationFn` is ours; everything else is passthrough. */
export type PostMutationOptions<TVariables, TData = void> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>;

/** POST /v1/api/posts — any type except `BOOK` (the API rejects it; use `useCreateBookPost`). */
export function useCreatePost(
  options?: PostMutationOptions<CreatePostRequest, CreatePostResponse>
) {
  return useMutation({
    mutationFn: (payload: CreatePostRequest) => postsApi.createPost(payload),
    ...options,
  });
}

/** Variables for the multipart book-post call. */
export interface CreateBookPostVariables {
  metadata: CreatePostRequest & { bookDetails: CreateBookRequest };
  bookFile: File;
  coverFile?: File;
}

/**
 * POST /v1/api/posts/books — post + attached book in one multipart call.
 *
 * Exposes `progress` (0–100) for the book file upload — resets on each attempt, holds after.
 */
export function useCreateBookPost(
  options?: PostMutationOptions<CreateBookPostVariables, CreatePostResponse>
) {
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: ({ metadata, bookFile, coverFile }: CreateBookPostVariables) => {
      setProgress(0);
      return postsApi.createBookPost(metadata, bookFile, coverFile, setProgress);
    },
    ...options,
  });
  return { ...mutation, progress };
}

export interface UpdatePostVariables {
  postId: number;
  payload: UpdatePostRequest;
}

/** PUT /v1/api/posts/{postId} — author-only edit. */
export function useUpdatePost(options?: PostMutationOptions<UpdatePostVariables>) {
  return useMutation({
    mutationFn: ({ postId, payload }: UpdatePostVariables) => postsApi.updatePost(postId, payload),
    ...options,
  });
}

/** DELETE /v1/api/posts/{postId} — author-only. */
export function useDeletePost(options?: PostMutationOptions<number>) {
  return useMutation({
    mutationFn: (postId: number) => postsApi.deletePost(postId),
    ...options,
  });
}

export interface AcceptAnswerVariables {
  postId: number;
  commentId: number;
}

/**
 * POST /v1/api/posts/{postId}/qna/accept-answer/{commentId}.
 *
 * The one cycle-1 write with an in-domain read to refresh: accepting flips the thread's
 * accepted answer, so the post's comment query is invalidated. That query lands in cycle 2;
 * the key is already reserved in `postKeys`.
 */
export function useAcceptAnswer(options?: PostMutationOptions<AcceptAnswerVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, commentId }: AcceptAnswerVariables) =>
      postsApi.acceptAnswer(postId, commentId),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/**
 * DELETE /v1/api/posts/{postId}/qna/accept-answer — give the pick back.
 *
 * Takes the post id alone: a post has at most one accepted answer, so there is nothing to
 * disambiguate. Invalidates the same comment query as `useAcceptAnswer` — the thread renders
 * the accepted marker, so it has to be re-read either way.
 *
 * The caller still needs its own `onSuccess` on top, because `qnaDetails.acceptedAnswerId`
 * lives in the *feed* payload, and this domain's hooks never invalidate another domain's
 * cache (CLAUDE.md §4).
 */
export function useUnacceptAnswer(options?: PostMutationOptions<number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => postsApi.unacceptAnswer(postId),
    ...options,
    onSuccess: (data, postId, ...rest) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(postId) });
      options?.onSuccess?.(data, postId, ...rest);
    },
  });
}
