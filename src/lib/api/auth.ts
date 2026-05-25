import api from './axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  LogoutRequest,
} from '@/lib/types';
import { findMockUser } from '@/lib/mock/users';

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
        });
      }
      return Promise.reject(new Error('Invalid email or password'));
    }
    return api.post<LoginResponse>('/v1/api/auth/login', data);
  },

  register: (data: RegisterRequest): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>('/v1/api/auth/register', data);
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
};
