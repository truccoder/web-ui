import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/** `POST /v1/api/link-preview` body — just the URL to unfurl. */
export type LinkPreviewRequest = Schemas['LinkPreviewRequestDto'];

/**
 * What the backend scraped from the target page. EVERY FIELD IS NULLABLE — a page with no
 * OpenGraph tags, or one the SSRF guard refused, comes back with all four empty, which is a
 * valid answer and means "let the author type it in".
 *
 * `siteName` is here but the stored `LinkDetails` has no slot for it — the composer shows it
 * while choosing but only `title` / `description` / `thumbnailUrl` / `url` are persisted.
 */
export type LinkPreview = Schemas['LinkPreviewResponseDto'];
