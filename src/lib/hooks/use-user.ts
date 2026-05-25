'use client';

import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userApi } from '@/lib/api/user';
import { getErrorMessage } from '@/lib/api/error';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { setCredentials } from '@/lib/store/auth-slice';
import { extractProfileFromToken } from '@/lib/jwt';
import type { ChangePasswordRequest, Profile } from '@/lib/types';

export function useProfile(): { data: Profile | null; isLoading: boolean } {
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const profile = useMemo(() => {
    if (!accessToken) return null;
    return extractProfileFromToken(accessToken);
  }, [accessToken]);

  return { data: profile, isLoading: false };
}

export function useUpdateProfile() {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  return useMutation({
    mutationFn: (data: { fullName?: string; profilePictureUrl?: string }) =>
      userApi.updateProfile({ ...data, refreshToken: refreshToken ?? '' }),
    onSuccess: ({ data }) => {
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    },
  });
}

export function useUploadProfilePicture() {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  return useMutation({
    mutationFn: (file: File) => userApi.uploadProfilePicture(file, refreshToken ?? ''),
    onSuccess: ({ data }) => {
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
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
    mutationFn: (data: ChangePasswordRequest) => userApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    },
  });
}
