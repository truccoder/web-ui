'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/lib/api/posts';
import { newsfeedApi } from '@/lib/api/newsfeed';
import { getErrorMessage } from '@/lib/api/error';
import type {
  CreatePostRequest,
  UpdatePostRequest,
  PostLocation,
  CreateBookRequest,
  CreateCommentRequest,
  ReactionType,
} from '@/lib/types';

const PAGE_SIZE = 10;

export function useNewsfeed() {
  return useInfiniteQuery({
    queryKey: ['newsfeed'],
    queryFn: ({ pageParam = 1 }) =>
      newsfeedApi.getFeed(pageParam as number, PAGE_SIZE).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

export interface CreatePostInput {
  content: string;
  location?: PostLocation;
  images?: string[];
  taggedUserIds?: number[];
  postType?: CreatePostRequest['postType'];
  eventDetails?: CreatePostRequest['eventDetails'];
  visibility?: CreatePostRequest['visibility'];
}

function toCreatePostRequest(input: CreatePostInput): CreatePostRequest {
  const loc = input.location;
  return {
    content: input.content,
    googlePlaceId: loc?.googlePlaceId,
    locationType: loc?.locationType,
    locationDetails:
      loc?.locationDetails ??
      (loc
        ? {
            display_name: loc.displayName,
            latitude: loc.latitude,
            longitude: loc.longitude,
            city: loc.city,
            country: loc.country,
          }
        : undefined),
    images: input.images,
    taggedUserIds: input.taggedUserIds,
    postType: input.postType,
    eventDetails: input.eventDetails,
    visibility: input.visibility,
  };
}

export function useCreatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) =>
      postsApi.createPost(toCreatePostRequest(input)).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsfeed'] });
      toast.success('Post submitted! It will appear in the feed once it passes review.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create post'));
    },
  });
}

export interface CreateBookPostInput {
  content: string;
  location?: PostLocation;
  taggedUserIds?: number[];
  visibility?: CreatePostRequest['visibility'];
  bookDetails: CreateBookRequest;
  bookFile: File;
  coverFile?: File;
}

export function useCreateBookPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBookPostInput) => {
      const metadata = toCreatePostRequest({
        content: input.content,
        location: input.location,
        taggedUserIds: input.taggedUserIds,
        visibility: input.visibility,
        postType: 'BOOK',
      });
      metadata.bookDetails = input.bookDetails;
      return postsApi.createBookPost(metadata, input.bookFile, input.coverFile).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsfeed'] });
      toast.success('Book submitted! It will appear in the feed once it passes review.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create book post'));
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, payload }: { postId: number; payload: UpdatePostRequest }) =>
      postsApi.updatePost(postId, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsfeed'] });
      toast.success('Post updated. It has been pulled from feeds until it passes re-review.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update post'));
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => postsApi.deletePost(postId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['newsfeed'] });
      toast.success('Post deleted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to delete post'));
    },
  });
}

// Backend has no GET for the current user's existing reaction, so callers can't know the
// true prior state on load — this only supports toggling from whatever the UI last showed.
export function useUpsertReaction(postId: number) {
  return useMutation({
    mutationFn: (reactionType: ReactionType) =>
      postsApi.upsertReaction(postId, { reactionType }).then((r) => r.data),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to react to post'));
    },
  });
}

export function useRemoveReaction(postId: number) {
  return useMutation({
    mutationFn: () => postsApi.removeReaction(postId).then((r) => r.data),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to remove reaction'));
    },
  });
}

// Backend has no GET for listing a post's comments, so a posted comment can only be shown
// optimistically for the rest of this session — see SessionComment.
export function useCreateComment(postId: number) {
  return useMutation({
    mutationFn: (payload: CreateCommentRequest) =>
      postsApi.createComment(postId, payload).then((r) => r.data),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to post comment'));
    },
  });
}
