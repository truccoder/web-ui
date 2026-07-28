'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { friendshipApi } from '@/lib/api/friendship';
import { getErrorMessage } from '@/lib/api/error';
import type {
  FriendProfileWire,
  FriendListResult,
  FriendSuggestion,
  PendingFriendRequest,
  UserSummary,
} from '@/lib/types';

// LEGACY, shrinking. `features/friendships` owns this domain now (P2.2). What survives
// here is only what consumers OUTSIDE friendships still call: dashboard (P3.3), chats +
// messenger sidebar (P2.7) and the app shell's request badge (P3.4). Those pages map the
// wire DTO onto `UserSummary` for Twilio identity, so repointing them at the feature
// barrel is their own migration, not friendships'. This file dies with the last of them.

// NOTE: this DTO has no email field, only userId/username/fullName/profilePictureUrl.
// Chat identity (see communication-provider.tsx) is keyed by email for the current user,
// so using String(userId) here means "start a chat with this friend" won't address their
// real Twilio identity until the backend adds email to this endpoint too.
function toUserSummary(profile: FriendProfileWire): UserSummary {
  return {
    id: String(profile.userId),
    fullname: profile.fullName,
    profilePictureUrl: profile.profilePictureUrl,
  };
}

export function useFriends(limit = 100) {
  return useQuery({
    queryKey: ['friends', limit],
    queryFn: (): Promise<FriendListResult> =>
      friendshipApi.getFriends(undefined, limit).then((r) => ({
        friends: r.data.friends.map(toUserSummary),
        nextCursor: r.data.nextCursor,
        hasMore: r.data.hasMore,
        totalCount: r.data.totalCount,
      })),
  });
}

export function useFriendSuggestions(limit = 10) {
  return useQuery({
    queryKey: ['friend-suggestions', limit],
    queryFn: (): Promise<FriendSuggestion[]> =>
      friendshipApi
        .getSuggestions(limit)
        .then((r) =>
          r.data.map((s) => ({ ...toUserSummary(s.profile), mutualFriends: s.mutualFriends }))
        ),
  });
}

// Wire ids are numeric; the UI-facing types keep string ids (same boundary-mapping
// pattern as toUserSummary above).
export function usePendingRequests() {
  return useQuery({
    queryKey: ['pending-requests'],
    queryFn: (): Promise<PendingFriendRequest[]> =>
      friendshipApi.getPendingRequests().then((r) =>
        r.data.map((req) => ({
          id: String(req.id),
          requesterId: String(req.requesterId),
          requesterFullName: req.requesterFullName ?? '',
          requesterProfilePictureUrl: req.requesterProfilePictureUrl ?? '',
          status: req.status,
          createdAt: req.createdAt,
        }))
      ),
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { addresseeId: string | number } | string | number) => {
      const id = typeof input === 'object' && 'addresseeId' in input ? input.addresseeId : input;
      return friendshipApi.sendRequest(id);
    },
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
