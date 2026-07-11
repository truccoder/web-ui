import api from './axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  LogoutRequest,
  VerifyEmailRequest,
  MagicLinkRequest,
  MagicLinkLoginRequest,
} from '@/lib/types';
import { findMockUser, MOCK_USERS } from '@/lib/mock/users';

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
  login: (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> => {
    if (USE_MOCK) {
      const user = findMockUser(data.email, data.password);
      if (user) {
        return mockResponse<LoginResponse>({
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          tokenType: 'Bearer',
          expiresIn: 900,
        });
      }
      return Promise.reject(new Error('Invalid email or password'));
    }
    return api.post<LoginResponse>('/v1/api/auth/login', data);
  },

  register: (data: RegisterRequest, profilePicture?: File): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (profilePicture) formData.append('profilePicture', profilePicture);

    // Let axios/the browser set Content-Type for FormData bodies themselves — multipart
    // requests need a boundary parameter (e.g. "multipart/form-data; boundary=..."), which
    // only the browser can generate. Setting the header manually here overrides that and the
    // request goes out without a boundary, which the backend's multipart parser rejects.
    return api.post<void>('/v1/api/auth/register', formData);
  },

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
