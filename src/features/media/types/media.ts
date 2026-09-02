import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * `POST /v1/api/media` — the URLs the uploaded files ended up at, in the order they were sent.
 *
 * `urls` IS TIGHTENED TO REQUIRED. Response DTOs carry no validation annotations, so every
 * generated field is optional; `MediaUploadResponseDto` is a record with one component and the
 * controller only ever builds it from a completed upload, so on a 2xx the array is there. A
 * failure is an error status, not a body with the field missing.
 *
 * IT IS AN OBJECT WRAPPING A LIST rather than a bare array, and the backend's own note says why:
 * the caller pastes these straight into `CreatePostRequest.images`, and an object leaves room to
 * report per-file detail later without changing the response's shape.
 */
export type MediaUploadResponse = Required<Schemas['MediaUploadResponseDto']>;
