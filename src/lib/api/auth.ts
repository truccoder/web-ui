import api from '@/core/api/axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { LogoutRequest } from '@/lib/types';

// Only logout remains here. Login/register moved to features/security (P2.1a/P2.1d);
// recovery + magic-link moved in P2.1'a–d. This last stub backs the app shell's logout
// button (admin/main layouts) and dies when the shell migrates in Phase 3.4.

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
  logout: (data: LogoutRequest): Promise<AxiosResponse<void>> => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>('/v1/api/auth/logout', data);
  },
};
