'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { moderationApi } from '@/lib/api/moderation';
import { getErrorMessage } from '@/lib/api/error';
import type { AdminReviewRequest, ModerationSearchParams } from '@/lib/types';

const POSTS_KEY = ['admin', 'moderation', 'posts'];
const LOGS_KEY = ['admin', 'moderation', 'logs'];
const BANNED_KEY = ['admin', 'moderation', 'banned-users'];

export function useModerationPosts(params: ModerationSearchParams) {
  return useQuery({
    queryKey: [...POSTS_KEY, params],
    queryFn: () => moderationApi.searchPosts(params).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useModerationLogs(params: ModerationSearchParams) {
  return useQuery({
    queryKey: [...LOGS_KEY, params],
    queryFn: () => moderationApi.searchLogs(params).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useBannedUsers(page = 1, size = 10) {
  return useQuery({
    queryKey: [...BANNED_KEY, page, size],
    queryFn: () => moderationApi.getBannedUsers(page, size).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useReviewPost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, payload }: { postId: number; payload: AdminReviewRequest }) =>
      moderationApi.reviewPost(postId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POSTS_KEY });
      toast.success('Review submitted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to submit review'));
    },
  });
}
