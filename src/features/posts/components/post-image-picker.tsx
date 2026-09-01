'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import {
  ACCEPTED_MEDIA_TYPES,
  MAX_MEDIA_FILE_BYTES,
  MAX_MEDIA_FILES,
  useUploadMedia,
} from '@/features/media';
import { Button, ProgressBar } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';

/**
 * Picking the pictures that go on a post.
 *
 * THE HALF OF `images` THAT NEVER EXISTED. `CreatePostRequestDto.images` and
 * `UpdatePostRequestDto.images` have accepted a `string[]` of URLs for as long as this project has
 * had a composer, `FeedPostDataDto` echoes it back, and `feed-post.tsx` has always mapped it
 * through the editor so an edit does not destroy it — but nothing in the product could ever put a
 * URL in there. The only three multipart routes were register, book upload and avatar, none of
 * which take a loose image. Filed as B16; the backend answered with `POST /v1/api/media`.
 *
 * WHY THIS LIVES WITH THE COMPOSER RATHER THAN IN `features/media`. That feature's own barrel says
 * it: "an upload has no surface of its own, only a picker belonging to whatever is being uploaded
 * FOR". The cover picker sits with the profile hero for the same reason. What is shared is the
 * client and the limits, not the shape of the control.
 *
 * TWO STEPS, AND THE ORDER MATTERS. Upload first, then hold the returned URLs in composer state
 * and send them with the post. If the post is never submitted, those objects are orphans in a
 * bucket — the same trade `ProfileCoverControl` documents, and the same reason it is the right
 * one: the alternative is not "send the files with the post" (there is no endpoint that takes
 * them), it is blocking the composer on an upload that cannot be undone anyway.
 *
 * GIF IS ALLOWED HERE AND NOT ON A COVER, and the asymmetry is deliberate on both sides.
 * `MediaService.ALLOWED_TYPES` admits it, and `ProfileCoverControl`'s note explains its own
 * refusal: a cover sits under the reader's name for as long as they are on the page, which puts it
 * on the avatar's side of that line. An animated image inside a post is ordinary.
 */
export interface PostImagePickerProps {
  /** URLs already attached. Owned by the composer; this control never holds the list itself. */
  value: string[];
  onChange: (images: string[]) => void;
  /** True while the post itself is in flight — picking during a submit would be a race. */
  disabled?: boolean;
  className?: string;
}

/**
 * `spring.servlet.multipart.max-request-size`, a SEPARATE ceiling from the per-file one.
 *
 * NOT IMPORTED, BECAUSE `features/media` DOES NOT EXPORT IT. Its `validation.ts` names the number
 * in prose — "`max-request-size` is 25MB, so ten files of 20MB is refused as a request even though
 * each one passes" — and exports only the per-file and per-count limits, because the cover picker
 * sends exactly one file and cannot reach this one. The composer can: ten photographs off a modern
 * phone clear 25MB without any single one approaching 20. Mirrored here rather than added to that
 * module, so this file does not widen a shared surface for its own case.
 */
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;

export function PostImagePicker({ value, onChange, disabled, className }: PostImagePickerProps) {
  const t = useT();
  const upload = useUploadMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_MEDIA_FILES - value.length;
  const busy = upload.isPending;
  const canAdd = !disabled && !busy && remaining > 0;

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Cleared here rather than in a callback: picking the SAME file again fires no change event
    // otherwise, so a failed upload could not be retried with the same picture.
    if (inputRef.current) inputRef.current.value = '';
    if (files.length === 0) return;

    // EVERY RULE IS CHECKED BEFORE ANYTHING IS SENT, and every one of them is a rule the server
    // also enforces — this is a way to fail in a sentence instead of in a round trip, never a
    // second source of truth. `MediaService` validates the whole batch before writing any file, so
    // a rejected request leaves no half-written upload on that side either.
    if (files.length > remaining) {
      setError(t('createPost.images.tooMany', { count: MAX_MEDIA_FILES }));
      return;
    }
    if (files.some((file) => !ACCEPTED_MEDIA_TYPES.includes(file.type))) {
      setError(t('createPost.images.invalidFormat'));
      return;
    }
    if (files.some((file) => file.size > MAX_MEDIA_FILE_BYTES)) {
      setError(t('createPost.images.fileTooLarge'));
      return;
    }
    // The one limit that belongs to the REQUEST rather than to any file in it — see the constant.
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_REQUEST_BYTES) {
      setError(t('createPost.images.batchTooLarge'));
      return;
    }

    setError(null);
    upload.mutate(files, {
      onSuccess: (result) => {
        const urls = (result.urls ?? []).filter(Boolean);
        // A 2xx with nothing in it should not happen — the service validates before writing — but
        // appending `undefined` would put a broken entry into the post's `images`.
        if (urls.length === 0) {
          setError(t('createPost.images.uploadFailed'));
          return;
        }
        onChange([...value, ...urls]);
      },
      onError: () => setError(t('createPost.images.uploadFailed')),
    });
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((url) => (
            <li key={url} className="relative">
              {/* Arbitrary host, same reasoning as `PostImages`: `next/image` would need every
                  domain declared and would 500 on the first one that is not. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="size-20 rounded-nx-xs border border-nx-border-subtle object-cover"
              />
              {/* THE REMOVE BUTTON ONLY DROPS THE URL FROM THE DRAFT. It does not delete the
                  object — there is no delete route on the media store, and inventing one out of a
                  DELETE to the URL would be a request to MinIO from the browser. So an unposted
                  picture is an orphan either way; see the module note. */}
              <button
                type="button"
                onClick={() => onChange(value.filter((entry) => entry !== url))}
                disabled={disabled || busy}
                aria-label={t('createPost.images.remove')}
                title={t('createPost.images.remove')}
                className={cn(
                  'absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-nx-full',
                  'border border-nx-border-default bg-nx-surface-raised text-nx-text-secondary',
                  'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                  'hover:text-nx-text-primary',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                  'disabled:pointer-events-none disabled:opacity-50'
                )}
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MEDIA_TYPES.join(',')}
          onChange={pick}
          className="hidden"
        />
        <Button
          size="sm"
          variant="ghost"
          type="button"
          icon={busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          onClick={() => inputRef.current?.click()}
          disabled={!canAdd}
        >
          {t('createPost.images.add')}
        </Button>

        {/* The count is the only place the ceiling is stated at rest, and it appears once there is
            something to count — an empty composer should not open by naming a limit nobody has
            asked about yet. */}
        {value.length > 0 && (
          <span className="font-mono text-nx-micro text-nx-text-muted">
            {value.length}/{MAX_MEDIA_FILES}
          </span>
        )}
      </div>

      {busy && (
        <ProgressBar
          value={upload.progress}
          label={t('createPost.images.add')}
          className="max-w-xs"
        />
      )}

      {error && <p className="text-nx-micro text-nx-status-danger-fg">{error}</p>}
    </div>
  );
}
