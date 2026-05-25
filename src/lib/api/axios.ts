import axios from 'axios';

const AUTH_STORAGE_KEY = 'auth_tokens';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function getTokens() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }));
}

function clearTokens() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = getTokens();

      if (tokens?.refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/v1/api/auth/refresh`,
            { refreshToken: tokens.refreshToken }
          );
          setTokens(data.accessToken, tokens.refreshToken);
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
