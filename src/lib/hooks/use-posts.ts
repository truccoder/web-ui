'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postsApi } from '@/lib/api/posts';
import { getErrorMessage } from '@/lib/api/error';
import type { CreatePostPayload } from '@/lib/types';

const PAGE_SIZE = 10;

export function useNewsfeed() {
  return useInfiniteQuery({
    queryKey: ['newsfeed'],
    queryFn: ({ pageParam = 0 }) =>
      postsApi.getNewsfeed(pageParam as number, PAGE_SIZE).then((r) => r.data),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.pageSize;
      return nextOffset < lastPage.totalElements ? nextOffset : undefined;
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostPayload) => postsApi.createPost(payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['newsfeed'] });
      toast.success(data.message ?? 'Đăng bài thành công!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Không thể đăng bài viết'));
    },
  });
}
