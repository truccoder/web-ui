import { AxiosError } from 'axios';

/**
 * The `banDetails` object a `403` carries when the account is under an automatic ban
 * (`ErrorResponseDto.banDetails` / `BanDetailsDto`). Every field is nullable on the wire.
 */
export interface BanDetails {
  bannedUntil?: string;
  reason?: string;
  violationType?: string;
}

/** Shape of the backend's `ErrorResponseDto` — the body of any non-2xx response. */
interface BackendError {
  message?: string;
  details?: unknown;
  banDetails?: BanDetails;
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

/**
 * The HTTP status a rejected request came back with, or `undefined` if it never got a response.
 *
 * IT EXISTS SO A CALLER CAN TRANSLATE. `getErrorMessage` returns the backend's own `message`,
 * which is written in English by a Spring exception handler and is shown to a Vietnamese reader
 * exactly as it was written — "Failed to generate download URL" on `/library` being the case that
 * prompted this. A surface that knows which status means what can put its own copy in front of the
 * one class of failure it understands, and still fall back to `getErrorMessage` for the rest.
 *
 * Deliberately NOT a "translate the message" helper: matching on message TEXT would break the day
 * the backend rephrases a sentence, and silently. A status is a contract.
 */
export function getErrorStatus(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined;
}

/**
 * Pull the backend's per-field validation messages out of a rejected request.
 *
 * WHY THIS IS SEPARATE FROM `getErrorMessage`. A bean-validation failure comes back as a **422**
 * whose `message` is the useless generic "Invalid request parameters or payload", while the part
 * worth showing sits in `details` as readable strings:
 *
 *     ["Property rating: must be less than or equal to 5"]
 *
 * A malformed body is a **400** with `details: null` and can never name a field. So an empty result
 * here is itself the signal that the error cannot be attributed to one input, and the caller should
 * fall back to `getErrorMessage`.
 *
 * Domain-agnostic — the split is a property of this backend's exception handler, not of any one
 * controller. Measured across `bookstore` (422) and `search` (422); `trending` answers 400 for the
 * same class of violation, which is exactly why callers must not assume.
 */
export function getErrorDetails(error: unknown): string[] {
  if (error instanceof AxiosError && error.response?.data) {
    const { details } = error.response.data as BackendError;
    if (Array.isArray(details)) return details.filter((d): d is string => typeof d === 'string');
  }
  return [];
}

/**
 * Pull `banDetails` out of a rejected request — present only on the `403` that a banned account
 * gets from `/auth/login` (and from any write once a ban lands mid-session).
 *
 * Returns `undefined` when the error is anything else, so a caller can branch as
 * `getErrorStatus(e) === 403 && getBanDetails(e)`. Matched on the field's presence, never on
 * message text — same contract rule as `getErrorStatus`.
 */
export function getBanDetails(error: unknown): BanDetails | undefined {
  if (error instanceof AxiosError && error.response?.data) {
    const { banDetails } = error.response.data as BackendError;
    if (banDetails && typeof banDetails === 'object') return banDetails;
  }
  return undefined;
}
