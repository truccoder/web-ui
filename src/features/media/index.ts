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
 * IT OWNS ONE COMPONENT NOW, AND THE RULE ABOVE IS WHY IT TOOK THIS LONG. The pickers stayed with
 * their callers for as long as they genuinely differed. They stopped: four call sites — the
 * composer's image grid, the profile cover, the skill-proof field, the project banner — had all
 * re-implemented the same file-input reset, the same pre-flight checks against the same constants,
 * and the same upload-then-`onChange` dance. `MediaUploader` is that shared plumbing; the atlas's
 * Plate 23 names the consolidation. It still owns no *second step* — `onChange` returns URLs and
 * the caller attaches them.
 */

export { mediaApi } from './api';

export { useUploadMedia } from './hooks';

export { MediaUploader, type MediaUploaderProps } from './components/media-uploader';

/** The client-side crop helper, for callers that upload through their own endpoint (avatar). */
export { cropImageFile, type PixelCrop } from './lib/crop-image';
export { ImageCropDialog, type ImageCropDialogProps } from './components/image-crop-dialog';

export { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, MAX_MEDIA_FILES } from './lib/validation';

export type { MediaUploadResponse } from './types';
