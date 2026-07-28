'use client';

import { Image as ImageIcon, Link2 } from 'lucide-react';
import { Input, Textarea } from '@/shared/components';
import { useT } from '@/lib/i18n';
import type { LinkDetails } from '../types/post';

/**
 * `LINK` payload — `linkDetails: { url, title, description, thumbnailUrl }`.
 *
 * ALL FOUR FIELDS ARE TYPED BY HAND, deliberately. There is **no unfurl/preview endpoint** on
 * the backend: nothing fetches the target page to fill in its title, description or image, and
 * `LinkDetails` is stored exactly as posted. A composer that showed a "fetching preview…"
 * spinner would be theatre. Title and description are therefore optional author-written fields,
 * not metadata we pretend to have discovered.
 *
 * `thumbnailUrl` is a URL for the same reason as `ArticleDetails.coverImage`: no general-purpose
 * upload endpoint exists (only the book file/cover and the profile picture accept multipart).
 *
 * Backend validation for this kind: none. The `http(s)` check is a frontend guard so the reader
 * side is not handed a `javascript:` or relative href to render as an anchor.
 */
export interface LinkFieldsProps {
  value: LinkDetails;
  onChange: (value: LinkDetails) => void;
}

/** Accepts only absolute http/https URLs. Exported so the composer can gate submit on it. */
export function isValidLinkUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function LinkFields({ value, onChange }: LinkFieldsProps) {
  const t = useT();
  const url = value.url ?? '';
  // Only complain once there is something to complain about — an untouched field is not an error.
  const urlError =
    url.length > 0 && !isValidLinkUrl(url) ? t('createPost.link.urlInvalid') : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Input
        mono
        type="url"
        inputMode="url"
        prefix={<Link2 />}
        label={t('createPost.link.url')}
        error={urlError}
        value={url}
        onChange={(event) => onChange({ ...value, url: event.target.value })}
        placeholder="https://"
      />

      <Input
        label={t('createPost.link.title')}
        hint={t('createPost.link.titleHint')}
        value={value.title ?? ''}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />

      <Textarea
        rows={2}
        label={t('createPost.link.description')}
        value={value.description ?? ''}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />

      <Input
        mono
        type="url"
        inputMode="url"
        prefix={<ImageIcon />}
        label={t('createPost.link.thumbnailUrl')}
        hint={t('createPost.link.thumbnailUrlHint')}
        value={value.thumbnailUrl ?? ''}
        onChange={(event) => onChange({ ...value, thumbnailUrl: event.target.value })}
        placeholder="https://"
      />
    </div>
  );
}
