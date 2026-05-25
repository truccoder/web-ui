'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { socialApi } from '@/lib/api/social';
import { getErrorMessage } from '@/lib/api/error';

export function useFollowing(offset = 0, pageSize = 20) {
  return useQuery({
    queryKey: ['following', offset, pageSize],
    queryFn: () => socialApi.getFollowing(offset, pageSize).then((r) => r.data),
  });
}

export function useFollowers(offset = 0, pageSize = 20) {
  return useQuery({
    queryKey: ['followers', offset, pageSize],
    queryFn: () => socialApi.getFollowers(offset, pageSize).then((r) => r.data),
  });
}

export function useFollow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: socialApi.follow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['following'] });
      toast.success('Followed successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to follow user'));
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: socialApi.unfollow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['following'] });
      toast.success('Unfollowed');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to unfollow user'));
    },
  });
}

export function useBlock() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: socialApi.block,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked'] });
      toast.success('User blocked');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to block user'));
    },
  });
}

export function useUnblock() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: socialApi.unblock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked'] });
      toast.success('User unblocked');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to unblock user'));
    },
  });
}
