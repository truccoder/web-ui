'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, userApi, getErrorMessage } from '@/lib/api';
import { setCredentials, clearAuth } from '@/lib/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import type { RegisterRequest } from '@/lib/types';

export function useLogin() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ data }) => {
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      document.cookie = 'session=true; path=/';
      toast.success('Logged in successfully');
      router.push('/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Invalid email or password'));
    },
  });
}

interface RegisterPayload {
  request: RegisterRequest;
  profilePicture: File | null;
}

export function useRegister() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ request, profilePicture }: RegisterPayload) => {
      await authApi.register(request);

      const { data: loginData } = await authApi.login({
        email: request.email,
        password: request.password,
      });

      if (profilePicture) {
        const { data: uploadData } = await userApi.uploadProfilePicture(
          profilePicture,
          loginData.refreshToken
        );
        return uploadData;
      }

      return loginData;
    },
    onSuccess: (data) => {
      dispatch(
        setCredentials({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      document.cookie = 'session=true; path=/';
      toast.success('Account created successfully!');
      router.push('/dashboard');
    },
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
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  return useMutation({
    mutationFn: () => authApi.logout({ refreshToken: refreshToken ?? '' }),
    onSettled: () => {
      dispatch(clearAuth());
      document.cookie = 'session=; path=/; max-age=0';
      router.push('/login');
    },
  });
}
