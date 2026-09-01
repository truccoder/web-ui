/**
 * `features/link-preview` — mirrors `LinkPreviewController` (`POST /v1/api/link-preview`, 1
 * endpoint).
 *
 * Unfurls a URL into `{ title, description, siteName, thumbnailUrl }`, all nullable. The only
 * consumer today is the post composer's `LINK` panel (`features/posts`), which uses it to
 * pre-fill the fields an author would otherwise type by hand — and still lets them edit or
 * ignore the result, because the backend often has nothing to return.
 */
export { linkPreviewApi } from './api';
export { useLinkPreview, linkPreviewKeys } from './hooks';
export type { LinkPreview, LinkPreviewRequest } from './types';
