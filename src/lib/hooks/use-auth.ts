'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, getErrorMessage } from '@/lib/api';
import { setTokens, clearTokens, getTokens } from '@/core/api/axios';
import { setCredentials, clearAuth } from '@/core/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { syncRoleFromProfile, clearRoleCookie } from '@/lib/hooks/use-admin-role';
import { PROFILE_QUERY_KEY } from '@/lib/hooks/use-user';
import type { RegisterRequest } from '@/lib/types';

export function useLogin() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ data }) => {
      setTokens(data.accessToken, data.refreshToken);
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      document.cookie = 'session=true; path=/';
      toast.success('Logged in successfully');
      const role = await syncRoleFromProfile(queryClient);
      router.push(role === 'ADMIN' ? '/admin/moderation' : '/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Invalid email or password'));
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (vars: { data: RegisterRequest; profilePicture?: File }) =>
      authApi.register(vars.data, vars.profilePicture),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Registration failed'));
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast.success('Password reset link sent to your email');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to send reset email'));
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Password has been reset. Please log in.');
      router.push('/login');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to reset password'));
    },
  });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  return useMutation({
    mutationFn: () =>
      authApi.logout({ refreshToken: refreshToken ?? getTokens()?.refreshToken ?? '' }),
    onSettled: () => {
      clearTokens();
      dispatch(clearAuth());
      document.cookie = 'session=; path=/; max-age=0';
      clearRoleCookie();
      queryClient.removeQueries({ queryKey: PROFILE_QUERY_KEY });
      router.push('/login');
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: authApi.verifyEmail,
  });
}

export function useRequestMagicLink() {
  return useMutation({
    mutationFn: authApi.requestMagicLink,
    onSuccess: () => {
      toast.success('Magic link sent to your email');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to send magic link'));
    },
  });
}

export function useMagicLinkLogin() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.loginWithMagicLink,
    onSuccess: async ({ data }) => {
      setTokens(data.accessToken, data.refreshToken);
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      document.cookie = 'session=true; path=/';
      toast.success('Logged in successfully');
      const role = await syncRoleFromProfile(queryClient);
      router.push(role === 'ADMIN' ? '/admin/moderation' : '/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'This magic link is invalid or has expired'));
    },
  });
}
