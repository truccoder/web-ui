'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { postsApi } from '../api/post';
import type { CreateBookRequest, CreatePostRequest, UpdatePostRequest } from '../types/post';
import { postKeys } from './keys';

/**
 * Posts state layer, cycle 1 (PostController). Every endpoint here is a write that returns
 * **void** — there is no created/updated post to fold into a cache, and no `GET /posts` to
 * refetch a single one (see the ledger's posts notes). So these hooks invalidate what this
 * domain owns and nothing else.
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
export function useCreatePost(options?: PostMutationOptions<CreatePostRequest>) {
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

/** POST /v1/api/posts/books — post + attached book in one multipart call. */
export function useCreateBookPost(options?: PostMutationOptions<CreateBookPostVariables>) {
  return useMutation({
    mutationFn: ({ metadata, bookFile, coverFile }: CreateBookPostVariables) =>
      postsApi.createBookPost(metadata, bookFile, coverFile),
    ...options,
  });
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
 * PATCH /v1/api/posts/{postId}/qna/accept-answer/{commentId}.
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
