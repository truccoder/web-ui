import { QueryClient } from '@tanstack/react-query';
import { isAuthRequiredError } from '@/core/api/axios';

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
        /**
         * ONE RETRY, EXCEPT FOR THE ONE FAILURE THAT CANNOT COME GOOD.
         *
         * A guest reaches `/newsfeed` with a shell full of queries written for someone with an
         * identity — the profile, the pending friend requests, the ledger's reputation. The
         * transport declines those before they are sent (`AuthRequiredError`, see `core/api`), and
         * a retry re-asks a question whose answer is "there is still no session". It is not a
         * network blip; nothing changes between the two attempts.
         */
        retry: (failureCount, error) => !isAuthRequiredError(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
