import api from '@/core/api/axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  LogoutRequest,
  VerifyEmailRequest,
  MagicLinkRequest,
  MagicLinkLoginRequest,
} from '@/lib/types';
import { MOCK_USERS } from '@/lib/mock/users';

// Login + register have moved to features/security (P2.1a/P2.1d). What remains here is
// the recovery + magic-link + logout surface, migrated in later security cycles.

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

function mockResponse<T>(data: T): Promise<AxiosResponse<T>> {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  });
}

export const authApi = {
  forgotPassword: (data: ForgotPasswordRequest): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>('/v1/api/auth/forgot-password', data);
  },

  resetPassword: (data: ResetPasswordRequest): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>('/v1/api/auth/reset-password', data);
  },

  logout: (data: LogoutRequest): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>('/v1/api/auth/logout', data);
  },

  verifyEmail: (data: VerifyEmailRequest): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>('/v1/api/auth/verify-email', data);
  },

  requestMagicLink: (data: MagicLinkRequest): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>('/v1/api/auth/magic-link', data);
  },

  loginWithMagicLink: (data: MagicLinkLoginRequest): Promise<AxiosResponse<LoginResponse>> => {
    if (USE_MOCK) {
      const user = MOCK_USERS[0];
      return mockResponse<LoginResponse>({
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      });
    }
    return api.post<LoginResponse>('/v1/api/auth/magic-link/login', data);
  },
};
