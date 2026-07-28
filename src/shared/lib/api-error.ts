import { AxiosError } from 'axios';

/** Shape of the backend's `ErrorResponseDto` — the body of any non-2xx response. */
interface BackendError {
  message?: string;
}

/**
 * Pull a human-readable message out of whatever a rejected request threw.
 *
 * Domain-agnostic, so it lives in shared/ and every feature uses it instead of
 * reaching into `lib/`. Duplicated from the legacy `lib/api/error.ts`, which dies
 * with `src/lib/`.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as BackendError;
    if (data.message) return data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
