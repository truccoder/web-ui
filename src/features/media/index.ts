/**
 * `features/media` — mirrors the backend package `com.socialapp.media` (MediaController, 1
 * endpoint).
 *
 * A FEATURE FOR ONE ENDPOINT, AND THE 1:1 RULE IS WHY. `POST /v1/api/media` is its own backend
 * package, so it gets its own folder here rather than being tucked into `posts` (its first caller)
 * or `security` (its second). Both of those would have been wrong within a day: the composer
 * uploads a post's images through it and `/profile` uploads a cover through it, and whichever
 * domain had adopted it would then be imported by the other for a reason that has nothing to do
 * with its subject.
 *
 * IT OWNS NO SCREEN. There is no `components/` here on purpose — an upload has no surface of its
 * own, only a picker belonging to whatever is being uploaded FOR. The cover picker lives with the
 * profile hero; the composer's will live with the composer.
 */

export { mediaApi } from './api';

export { useUploadMedia } from './hooks';

export { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, MAX_MEDIA_FILES } from './lib/validation';

export type { MediaUploadResponse } from './types';
