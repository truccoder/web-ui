import axios from 'axios';

const AUTH_STORAGE_KEY = 'auth_tokens';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export function getTokens() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export function clearTokens() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// Backend rotates refresh tokens on every /refresh call (the old one is deleted immediately),
// so a refresh token is single-use. If two requests 401 at the same time (e.g. the sidebar's
// pending-friend-requests call and a page's own query), each firing its own /refresh would let
// the first win and the second get rejected on the now-deleted token, forcing a spurious logout.
// Sharing one in-flight promise across concurrent 401s avoids that race.
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

function refreshTokens(refreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${process.env.NEXT_PUBLIC_API_URL}/v1/api/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        setTokens(data.accessToken, data.refreshToken);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = getTokens();

      if (tokens?.refreshToken) {
        try {
          const data = await refreshTokens(tokens.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          clearTokens();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
