import { QueryClient } from '@tanstack/react-query';

/**
 * Factory, not a module-level singleton: on the server a shared client would leak one
 * user's cached data into another request. Each browser session builds its own via
 * `useState` in the provider; server-side callers build a throwaway one per request.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
