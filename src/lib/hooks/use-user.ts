'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { profileApi, getErrorMessage } from '@/lib/api';
import { useAppSelector } from '@/core/store/hooks';
import type { ChangePasswordRequest, Profile, UserResponse } from '@/lib/types';

export const PROFILE_QUERY_KEY = ['profile', 'me'];

export function toProfile(data: UserResponse): Profile {
  return {
    id: data.email,
    userId: data.id,
    fullname: data.fullName,
    email: data.email,
    username: data.username,
    profilePictureUrl: data.profilePictureUrl,
    emailVerified: data.emailVerified,
    role: data.role,
    createdAt: data.createdAt,
  };
}

export function useProfile() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileApi.getProfile().then((r) => toProfile(r.data)),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { fullname: string }) =>
      profileApi.updateProfile({ fullName: data.fullname }),
    onSuccess: ({ data }) => {
      qc.setQueryData(PROFILE_QUERY_KEY, toProfile(data));
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    },
  });
}

export function useUploadProfilePicture() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => profileApi.uploadProfilePicture(file),
    onSuccess: ({ data }) => {
      qc.setQueryData<Profile | undefined>(PROFILE_QUERY_KEY, (old) =>
        old ? { ...old, profilePictureUrl: data.profilePictureUrl } : old
      );
      toast.success('Profile picture updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to upload profile picture'));
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    },
  });
}
