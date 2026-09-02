'use client';

import { Link2, Sparkles } from 'lucide-react';
import { Button, Input, Textarea } from '@/shared/components';
import { ImageUrlField } from '@/features/media';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useLinkPreview } from '@/features/link-preview';
import type { LinkDetails } from '../types/post';

/**
 * `LINK` payload — `linkDetails: { url, title, description, thumbnailUrl }`.
 *
 * `POST /v1/api/link-preview` (`features/link-preview`) unfurls the URL into title / description /
 * thumbnail. It is best-effort: the SSRF guard refuses private hosts and many pages carry no
 * OpenGraph tags at all, so all three can come back empty — the fields stay author-editable and a
 * failed preview never blocks the post. Only fields the author has not already filled are
 * overwritten by a preview.
 *
 * `thumbnailUrl` is stored exactly as posted — a URL string. It can now be filled two ways: an
 * unfurl or a pasted link, as before, or an upload from the device via `POST /v1/api/media`
 * (`ImageUrlField`), which stores the URL that endpoint returns.
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

  const preview = useLinkPreview({
    onSuccess: (data) => {
      onChange({
        ...value,
        // Fill blanks only — never clobber what the author already typed or edited.
        title: (value.title ?? '').trim() ? value.title : (data.title ?? value.title),
        description: (value.description ?? '').trim()
          ? value.description
          : (data.description ?? value.description),
        thumbnailUrl: (value.thumbnailUrl ?? '').trim()
          ? value.thumbnailUrl
          : (data.thumbnailUrl ?? value.thumbnailUrl),
      });
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
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
          wrapperClassName="flex-1"
        />
        <Button
          type="button"
          size="md"
          variant="secondary"
          icon={<Sparkles />}
          loading={preview.isPending}
          disabled={!isValidLinkUrl(url)}
          onClick={() => preview.mutate(url)}
        >
          {t('createPost.link.fetchPreview')}
        </Button>
      </div>

      {/* Best-effort: a failed unfurl is a hint to type the fields, not a blocker. */}
      {preview.isError && (
        <p role="status" className="text-nx-micro text-nx-text-secondary">
          {getErrorMessage(preview.error, t('createPost.link.previewFailed'))}
        </p>
      )}

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

      <ImageUrlField
        label={t('createPost.link.thumbnailUrl')}
        hint={t('createPost.link.thumbnailUrlHint')}
        value={value.thumbnailUrl ?? ''}
        onChange={(thumbnailUrl) => onChange({ ...value, thumbnailUrl })}
      />
    </div>
  );
}
