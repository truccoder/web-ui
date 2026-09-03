import api from '@/core/api/axios';
import type { LinkPreview } from '../types/link-preview';

/**
 * `LinkPreviewController` (`com.socialapp.posts`) — 1 endpoint, 1 function. Bare response, no
 * wrapper.
 *
 * ITS OWN FEATURE RATHER THAN A FUNCTION IN `features/posts`, because the mirror is by backend
 * package but the endpoint is a self-contained tool (paste a URL, get metadata) with its own
 * rate limit and its own SSRF failure mode — the composer is only its first caller.
 *
 * POST WITH A BODY, NOT A QUERY PARAM: the backend takes `{ url }` in the body deliberately so
 * the target URL never lands in an access log. Rate-limited server-side at 20 req/min/user, and
 * the SSRF guard rejects private-network / localhost / metadata hosts with a readable 4xx.
 */
export const linkPreviewApi = {
  /** POST /v1/api/link-preview — unfurl one URL. All response fields may be null. */
  fetch: (url: string) =>
    api.post<LinkPreview>('/v1/api/link-preview', { url }).then((r) => r.data),
};
