'use client';

import { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { Button, Input } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { MediaUploader } from './media-uploader';

/**
 * One image slot that can be FILLED TWO WAYS — paste a link, or upload a file from the device.
 *
 * WHY IT LIVES HERE. Every image the product collects used to be one or the other: the composer's
 * grid and the profile cover were upload-only (a bespoke picker each), while an article's cover and
 * a link post's thumbnail were URL-only, with a hint that apologised for the missing upload. The
 * apology stopped being true when `POST /v1/api/media` shipped (B16) — there is now an endpoint any
 * caller can post a loose image to — so the standing rule became "a field that takes an image URL
 * also takes an upload". This is that pairing, factored out so the rule is enforced in one place
 * rather than re-typed at each call site. It sits in `features/media` for the same reason
 * `MediaUploader` does: `src/shared/*` may not reach into a feature to import `useUploadMedia`.
 *
 * ONE SLOT SHOWS ONE CONTROL AT A TIME. Empty: the URL field and the upload button, side by side.
 * A pasted link that loads: the field stays (a URL is worth editing), the upload button drops away.
 * An uploaded file: the preview stands in for the field entirely — a media URL is not something a
 * person edits by hand — with the upload button gone too. Remove the image, or a pasted link that
 * fails to load, and both controls come back.
 *
 * THE CALLER STILL OWNS THE SECOND STEP. `onChange` hands back a URL string; attaching it to a
 * post, a profile or a project is the caller's mutation — see `useUploadMedia`'s note.
 */
export interface ImageUrlFieldProps {
  label: string;
  /** Helper text under the URL field. */
  hint?: string;
  /** Error message — replaces the hint and reddens the field. */
  error?: string;
  /** The current image URL, or `''` when unset. */
  value: string;
  onChange: (value: string) => void;
  /** True while the surrounding form is submitting — picking then would be a race. */
  disabled?: boolean;
  /** MIME allow-list forwarded to the uploader. @default ACCEPTED_MEDIA_TYPES */
  accept?: string[];
  className?: string;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ImageUrlField({
  label,
  hint,
  error,
  value,
  onChange,
  disabled,
  accept,
  className,
}: ImageUrlFieldProps) {
  const t = useT();
  // Both are keyed by the URL they describe, so a value that changes from the outside (a link
  // unfurl filling a thumbnail, say) resets them with no effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const trimmed = value.trim();
  const showPreview = isAbsoluteHttpUrl(trimmed) && failedUrl !== trimmed;
  const fromUpload = showPreview && uploadedUrl === trimmed;

  const clear = () => {
    setFailedUrl(null);
    setUploadedUrl(null);
    onChange('');
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {fromUpload ? (
        // The URL field is gone, so its label and hint need a home of their own.
        (label || hint || error) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className="text-nx-body-sm font-medium text-nx-text-primary">{label}</span>
            )}
            {error ? (
              <p className="text-nx-caption text-nx-status-danger-fg">{error}</p>
            ) : (
              hint && <p className="text-nx-caption text-nx-text-muted">{hint}</p>
            )}
          </div>
        )
      ) : (
        <Input
          mono
          type="url"
          inputMode="url"
          prefix={<ImageIcon />}
          label={label}
          hint={hint}
          error={error}
          value={value}
          onChange={(event) => {
            // Typing turns this back into a pasted-link value, never an uploaded one.
            setUploadedUrl(null);
            onChange(event.target.value);
          }}
          placeholder="https://"
          disabled={disabled}
        />
      )}

      {showPreview && (
        <div className="flex items-start gap-2">
          {/* Arbitrary object-storage / third-party host — `next/image` would need every domain
              declared up front and 500 on the first that is not. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trimmed}
            alt=""
            onError={() => setFailedUrl(trimmed)}
            className="h-28 w-full max-w-xs rounded-nx-xs border border-nx-border-subtle object-cover"
          />
          <Button
            size="sm"
            variant="ghost"
            type="button"
            icon={<X />}
            disabled={disabled}
            aria-label={t('mediaUploader.remove')}
            onClick={clear}
          />
        </div>
      )}

      {!showPreview && (
        <MediaUploader
          mode="single"
          accept={accept}
          disabled={disabled}
          label={t('mediaUploader.uploadFromDevice')}
          // Kept value-less on purpose: the preview above is the single source of truth, and the
          // uploader's only job is to hand a freshly uploaded URL back through `onChange`.
          value={[]}
          onChange={(urls) => {
            if (!urls[0]) return;
            setFailedUrl(null);
            setUploadedUrl(urls[0]);
            onChange(urls[0]);
          }}
        />
      )}
    </div>
  );
}
