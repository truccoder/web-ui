import { isAuthRequiredError } from '@/core/api/axios';
import { getBackendMessage, getBanDetails, getErrorDetails, getErrorStatus } from './api-error';

/**
 * The atlas's F4 sheet — "HTTP status → UI response" — as one function.
 *
 * WHY THIS IS A RESOLVER AND NOT A COMPONENT. Every list screen already branches on
 * `getErrorStatus` by hand: `newsfeed.tsx` has a retry `EmptyState`, `explain-post-action.tsx`
 * splits 428/429/503, `book-library.tsx` catches 503, the moderation tabs print
 * `getErrorMessage`. The mapping (which status gets which copy, whether a retry button helps) is a
 * property of *this backend's* exception handler, the same one `api-error.ts` already reads — so
 * it belongs beside those helpers as pure logic that a node test can cover, with `ApiErrorNotice`
 * a thin renderer on top.
 *
 * THE CONTRACT RULE HOLDS: every branch keys off the status or a field's presence, never the
 * message text (see `getErrorStatus`). The backend's own sentence is surfaced verbatim only where
 * it is the useful part — a ban reason, a 422's field list, an otherwise-unclassified 400.
 */
export type ApiErrorKind =
  | 'network'
  | 'auth'
  | 'banned'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'invalid'
  | 'profileRequired'
  | 'rateLimited'
  | 'unavailable'
  | 'generic';

export interface ApiErrorView {
  kind: ApiErrorKind;
  /** `block` → a centred EmptyState; `banner` → a compact inline danger strip. */
  tone: 'block' | 'banner';
  /** i18n key under `apiError.*`. */
  titleKey: string;
  /** i18n key under `apiError.*`. */
  descriptionKey?: string;
  /**
   * Verbatim backend text, already user-safe: a ban reason, or the message for an
   * unclassified failure. NOT an i18n key — shown as-is or not at all.
   */
  message?: string;
  /** 422 per-field messages, in send order. Empty for every other kind. */
  details: string[];
  /** Whether a "try again" affordance can plausibly help. */
  retryable: boolean;
  /** A route the reader should be sent to instead of retrying (428 → onboarding). */
  href?: string;
  /** i18n key for the `href` link label. */
  hrefLabelKey?: string;
}

const K = (name: string) => `apiError.${name}`;

export function resolveApiError(error: unknown): ApiErrorView {
  const base = { details: [] as string[] };

  // Never reached the server — no status to branch on. Its own copy; the axios "Network Error"
  // string is not for a reader.
  if (getErrorStatus(error) === undefined && !isAuthRequiredError(error)) {
    return {
      ...base,
      kind: 'network',
      tone: 'block',
      titleKey: K('network.title'),
      descriptionKey: K('network.description'),
      retryable: true,
    };
  }

  const status = getErrorStatus(error);

  if (isAuthRequiredError(error) || status === 401) {
    // The shell's AuthRequiredPrompt / SessionExpiredPrompt already own the sign-in flow — this is
    // just the panel that was waiting on the data saying why it is empty.
    return {
      ...base,
      kind: 'auth',
      tone: 'block',
      titleKey: K('auth.title'),
      descriptionKey: K('auth.description'),
      retryable: false,
    };
  }

  if (status === 403) {
    const ban = getBanDetails(error);
    if (ban) {
      // The shell's AccountBanBanner carries the countdown; here we only name it and its reason.
      return {
        ...base,
        kind: 'banned',
        tone: 'banner',
        titleKey: K('banned.title'),
        message: ban.reason,
        retryable: false,
      };
    }
    return {
      ...base,
      kind: 'forbidden',
      tone: 'block',
      titleKey: K('forbidden.title'),
      descriptionKey: K('forbidden.description'),
      retryable: false,
    };
  }

  if (status === 404) {
    // Missing and forbidden are one status by design — the copy must not distinguish them.
    return {
      ...base,
      kind: 'notFound',
      tone: 'block',
      titleKey: K('notFound.title'),
      descriptionKey: K('notFound.description'),
      retryable: false,
    };
  }

  if (status === 409) {
    return {
      ...base,
      kind: 'conflict',
      tone: 'block',
      titleKey: K('conflict.title'),
      descriptionKey: K('conflict.description'),
      retryable: true,
    };
  }

  if (status === 422) {
    const details = getErrorDetails(error);
    return {
      ...base,
      kind: 'invalid',
      tone: 'block',
      titleKey: K('invalid.title'),
      // A 422 with an empty `details` still happened — fall back to the backend's sentence.
      message: details.length > 0 ? undefined : getBackendMessage(error),
      details,
      retryable: true,
    };
  }

  if (status === 428) {
    return {
      ...base,
      kind: 'profileRequired',
      tone: 'block',
      titleKey: K('profileRequired.title'),
      descriptionKey: K('profileRequired.description'),
      href: '/onboarding/professional',
      hrefLabelKey: K('profileRequired.cta'),
      retryable: false,
    };
  }

  if (status === 429) {
    // Retrying a rate-limit immediately only deepens it — no retry button, matches
    // `explain-post-action.tsx`.
    return {
      ...base,
      kind: 'rateLimited',
      tone: 'block',
      titleKey: K('rateLimited.title'),
      descriptionKey: K('rateLimited.description'),
      retryable: false,
    };
  }

  if (status === 503) {
    return {
      ...base,
      kind: 'unavailable',
      tone: 'block',
      titleKey: K('unavailable.title'),
      descriptionKey: K('unavailable.description'),
      retryable: true,
    };
  }

  // 400 and anything unlisted: the backend's `message` is user-safe here (F4). Fall back to the
  // generic title when there is no server sentence — never to an axios internal string.
  return {
    ...base,
    kind: 'generic',
    tone: 'block',
    titleKey: K('generic.title'),
    message: getBackendMessage(error),
    retryable: true,
  };
}
