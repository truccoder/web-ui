'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { friendshipApi } from '@/lib/api/friendship';
import { getErrorMessage } from '@/lib/api/error';

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => friendshipApi.getFriends().then((r) => r.data),
  });
}

export function useFriendSuggestions() {
  return useQuery({
    queryKey: ['friend-suggestions'],
    queryFn: () => friendshipApi.getSuggestions().then((r) => r.data),
  });
}

export function usePendingRequests() {
  return useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => friendshipApi.getPendingRequests().then((r) => r.data),
  });
}

export function useSentRequests() {
  return useQuery({
    queryKey: ['sent-requests'],
    queryFn: () => friendshipApi.getSentRequests().then((r) => r.data),
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: friendshipApi.sendRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sent-requests'] });
      qc.invalidateQueries({ queryKey: ['friend-suggestions'] });
      toast.success('Friend request sent');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to send friend request'));
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: friendshipApi.acceptRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-requests'] });
      qc.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend request accepted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to accept friend request'));
    },
  });
}

export function useRejectFriendRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: friendshipApi.rejectRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-requests'] });
      toast.success('Friend request rejected');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to reject friend request'));
    },
  });
}

export function useCancelFriendRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: friendshipApi.cancelRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sent-requests'] });
      toast.success('Friend request cancelled');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to cancel friend request'));
    },
  });
}
