'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button, ProgressBar } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useUploadMedia } from '../hooks';
import { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, MAX_MEDIA_FILES } from '../lib/validation';
import { ImageCropDialog } from './image-crop-dialog';

/**
 * The picker that four call sites had four copies of.
 *
 * WHY THIS BREAKS `features/media`'s "no components" RULE, AND WHY IT IS STILL RIGHT. That barrel
 * argued an upload "has no surface of its own, only a picker belonging to whatever is being
 * uploaded FOR" — true when the pickers genuinely differed. They stopped differing: the composer's
 * image grid, the cover control, the skill-proof field and the project-banner field had all
 * re-implemented the same file-input-with-reset, the same pre-flight type/size/count checks
 * against the same three constants, the same `upload.mutate([...], { onSuccess })` dance and the
 * same `<ProgressBar value={upload.progress}>`. Plate 23 of the layout atlas names the
 * consolidation. `src/shared/*` cannot import `useUploadMedia` (it may not reach into a feature),
 * so `features/media/components/` is the only layering-legal home.
 *
 * IT STILL DOES NOT OWN THE SECOND STEP. `onChange` hands back URLs; attaching them to a post, a
 * profile or a project is the caller's mutation, exactly as before — see `useUploadMedia`'s note.
 *
 * THREE MODES, because the frame is what differs now, not the plumbing:
 *  - `multi`  — a thumbnail grid, up to `maxFiles`, with the 25MB per-request ceiling the composer
 *               needs (ten phone photos clear it without any one file being large).
 *  - `single` — one slot, replace-in-place, optional clear.
 *  - `crop`   — `single` plus a crop dialog before the upload, for the two images with a fixed
 *               frame (avatar, cover). GIF is expected to be filtered out via `accept`.
 */
export interface MediaUploaderProps {
  /** @default "multi" */
  mode?: 'multi' | 'single' | 'crop';
  /** URLs already attached. The caller owns this list; the uploader never holds it. */
  value: string[];
  onChange: (urls: string[]) => void;
  /** True while the surrounding form is submitting — picking then would be a race. */
  disabled?: boolean;
  /** MIME allow-list. @default ACCEPTED_MEDIA_TYPES (pass a GIF-free copy for crop mode). */
  accept?: string[];
  /** Only meaningful for `multi`. @default MAX_MEDIA_FILES */
  maxFiles?: number;
  /** Crop aspect ratio for `crop` mode. @default 1 */
  aspect?: number;
  /** Overrides the add-button label. */
  label?: string;
  className?: string;
}

/** `spring.servlet.multipart.max-request-size` — separate from the per-file ceiling. */
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;

export function MediaUploader({
  mode = 'multi',
  value,
  onChange,
  disabled,
  accept = ACCEPTED_MEDIA_TYPES,
  maxFiles = MAX_MEDIA_FILES,
  aspect = 1,
  label,
  className,
}: MediaUploaderProps) {
  const t = useT();
  const upload = useUploadMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  // The file waiting in the crop dialog, before it is cropped and uploaded.
  const [cropFile, setCropFile] = useState<File | null>(null);

  const single = mode !== 'multi';
  const limit = single ? 1 : maxFiles;
  const remaining = limit - value.length;
  const busy = upload.isPending;
  const canAdd = !disabled && !busy && (single || remaining > 0);

  const send = useCallback(
    (files: File[]) => {
      setError(null);
      upload.mutate(files, {
        onSuccess: (result) => {
          const urls = (result.urls ?? []).filter(Boolean);
          if (urls.length === 0) {
            setError(t('mediaUploader.failed'));
            return;
          }
          onChange(single ? urls.slice(0, 1) : [...value, ...urls]);
        },
        onError: () => setError(t('mediaUploader.failed')),
      });
    },
    [onChange, single, t, upload, value]
  );

  /** Every rule the server also enforces, checked before a byte is sent — a sentence, not a round trip. */
  const validate = (files: File[]): string | null => {
    if (!single && files.length > remaining) return t('mediaUploader.tooMany', { count: limit });
    if (files.some((file) => !accept.includes(file.type))) return t('mediaUploader.wrongType');
    if (files.some((file) => file.size > MAX_MEDIA_FILE_BYTES))
      return t('mediaUploader.fileTooLarge');
    if (!single && files.reduce((sum, file) => sum + file.size, 0) > MAX_REQUEST_BYTES)
      return t('mediaUploader.batchTooLarge');
    return null;
  };

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Reset here, not in a callback: re-picking the SAME file fires no change event otherwise, so a
    // failed upload could never be retried with the same image.
    if (inputRef.current) inputRef.current.value = '';
    if (files.length === 0) return;

    const message = validate(mode === 'crop' ? files.slice(0, 1) : files);
    if (message) {
      setError(message);
      return;
    }
    setError(null);

    if (mode === 'crop') {
      setCropFile(files[0]);
      return;
    }

    send(single ? files.slice(0, 1) : files);
  };

  const removeAt = (url: string) => onChange(value.filter((entry) => entry !== url));

  const addLabel = label ?? t('mediaUploader.add');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {value.length > 0 && (
        <ul className={cn('flex flex-wrap gap-2', single && 'flex-col')}>
          {value.map((url) => (
            <li key={url} className="relative w-fit">
              {/* Arbitrary object-storage host — `next/image` would need every domain declared up
                  front and 500 on the first that is not. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className={cn(
                  'rounded-nx-xs border border-nx-border-subtle object-cover',
                  single ? 'h-28 w-full max-w-xs' : 'size-20'
                )}
              />
              <button
                type="button"
                onClick={() => removeAt(url)}
                disabled={disabled || busy}
                aria-label={t('mediaUploader.remove')}
                title={t('mediaUploader.remove')}
                className={cn(
                  'absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-nx-full',
                  'border border-nx-border-default bg-nx-surface-raised text-nx-text-secondary',
                  'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out hover:text-nx-text-primary',
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
          multiple={mode === 'multi'}
          accept={accept.join(',')}
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
          {single && value.length > 0 ? t('mediaUploader.replace') : addLabel}
        </Button>

        {mode === 'multi' && value.length > 0 && (
          <span className="font-mono text-nx-micro text-nx-text-muted">
            {value.length}/{limit}
          </span>
        )}
      </div>

      {busy && <ProgressBar value={upload.progress} label={addLabel} className="max-w-xs" />}

      {error && <p className="text-nx-micro text-nx-status-danger-fg">{error}</p>}

      <ImageCropDialog
        file={mode === 'crop' ? cropFile : null}
        aspect={aspect}
        onCancel={() => setCropFile(null)}
        onCropped={(cropped) => {
          setCropFile(null);
          send([cropped]);
        }}
      />
    </div>
  );
}
