'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/lib/api/posts';
import { newsfeedApi } from '@/lib/api/newsfeed';
import { getErrorMessage } from '@/lib/api/error';
import type { CreatePostRequest, UpdatePostRequest, PostLocation } from '@/lib/types';

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
  postType?: 'REGULAR' | 'EVENT';
  eventDetails?: CreatePostRequest['eventDetails'];
  visibility?: CreatePostRequest['visibility'];
}

function toCreatePostRequest(input: CreatePostInput): CreatePostRequest {
  const loc = input.location;
  return {
    content: input.content,
    googlePlaceId: loc?.googlePlaceId,
    locationType: loc?.locationType,
    locationDetails: loc?.locationDetails ?? (loc ? {
      displayName: loc.displayName,
      latitude: loc.latitude,
      longitude: loc.longitude,
      city: loc.city,
      country: loc.country,
    } : undefined),
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
      toast.success('Post created successfully!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create post'));
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
      toast.success('Post updated successfully!');
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
