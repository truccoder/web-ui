/**
 * The limits `POST /v1/api/media` actually enforces, mirrored so a picker can refuse a file
 * before spending a round trip on it.
 *
 * THESE NUMBERS BELONG TO THIS FEATURE, not to whoever is uploading. `features/security` had its
 * own pair for the avatar endpoint (`MAX_PROFILE_PICTURE_BYTES`, `ACCEPTED_PICTURE_TYPES`) because
 * `PUT /profile/picture` has its own rules — 5MB, no GIF — and those are still that endpoint's.
 * Anything going through the media store answers to the ones here instead.
 */

/**
 * 20MB, from `spring.servlet.multipart.max-file-size`.
 *
 * `MediaService` deliberately does NOT check bytes itself — its comment says the ceiling is left
 * to the multipart settings so there is only one number to keep in step. That makes the config
 * value the real rule, and this the mirror of it.
 *
 * A REQUEST IS CAPPED LOWER THAN THE SUM OF ITS FILES: `max-request-size` is 25MB, so ten files of
 * 20MB is refused as a request even though each one passes. A caller sending batches should watch
 * the total; the cover picker sends exactly one file, so it cannot hit that.
 */
export const MAX_MEDIA_FILE_BYTES = 20 * 1024 * 1024;

/** `MediaService.ALLOWED_TYPES`. GIF is admitted here and not by the avatar endpoint. */
export const ACCEPTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** `MediaService.MAX_FILES` — a count limit, separate from the byte ceilings above. */
export const MAX_MEDIA_FILES = 10;
