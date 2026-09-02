'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, useUploadMedia } from '@/features/media';
import { ProgressBar } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useMyProfile, useUpdateProfile } from '../hooks/use-profile';

/**
 * The owner's control over their cover strip: set one, replace one, remove one.
 *
 * ── IT IS TWO REQUESTS, AND THE SPLIT IS THE BACKEND'S DESIGN RATHER THAN AN ACCIDENT ─────────
 * There is no `PUT /profile/cover`. B18 asked for one; the backend declined and said why, in
 * `UpdateProfileRequest`'s javadoc: `POST /v1/api/media` already stores loose images and hands
 * back a URL, so a second multipart endpoint would be a third copy of the same upload-and-validate
 * code. So this uploads to the media store, then saves the returned URL with `PUT /profile`.
 *
 * THE FAILURE MODE THAT BUYS IS WORTH NAMING: if the second call fails, the object is in the
 * bucket and no row points at it. That is an orphan, not corruption — the reader's cover is
 * unchanged and the error line says so. The reverse order has no better story and a worse one for
 * the reader, since it would blank the cover before knowing there is a replacement.
 *
 * ── `fullName` RIDES ALONG ON EVERY SAVE, AND IT MUST ─────────────────────────────────────────
 * `UpdateProfileRequest.fullName` is `@NotBlank`: the endpoint replaces the name outright and
 * rejects a request that omits it. So a cover change has to send the name it already has, and the
 * control refuses to act until the profile query has produced one — sending `undefined` would be a
 * 400 that reads like the upload failed.
 *
 * ── EMPTY STRING REMOVES, `null` LEAVES ALONE ────────────────────────────────────────────────
 * The backend distinguishes the two deliberately, and its note ties the rule to B12: every caller
 * that predates this field sends `fullName` alone, so a copy-nulls endpoint would have let the
 * first rename after setting a cover silently wipe it. `ProfileInfoForm` still sends only the
 * name and is safe for exactly that reason. Removing is therefore `''`, never `null`.
 *
 * ── WHY THE PICKER REFUSES GIF WHEN THE ENDPOINT ACCEPTS IT ──────────────────────────────────
 * `MediaService.ALLOWED_TYPES` admits GIF, and its comment defends that for POSTS — "an animated
 * avatar is a distraction, an animated image inside a post is ordinary". A cover is the first
 * thing on the page and sits under the reader's name for as long as they are on it, which puts it
 * on the avatar's side of that line. The restriction is this picker's, not the store's: the same
 * endpoint still takes GIFs from the composer.
 *
 * ── `variant` ───────────────────────────────────────────────────────────────────────────────
 * `overlay` (default) is the hero corner — `absolute`, so the hero's geometry never shifts.
 * `panel` is `/settings/picture`, where the control stands on its own: the same two-step upload
 * and the same invariants, laid out as a labelled row of buttons instead of a floating overlay.
 */
export interface ProfileCoverControlProps {
  /** @default "overlay" */
  variant?: 'overlay' | 'panel';
}

export function ProfileCoverControl({ variant = 'overlay' }: ProfileCoverControlProps = {}) {
  const t = useT();
  const { data: profile } = useMyProfile();
  const upload = useUploadMedia();
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const fullName = profile?.fullName;
  const hasCover = Boolean(profile?.coverImageUrl);
  const busy = upload.isPending || updateProfile.isPending;
  // No name yet means the profile query has not answered; see the note above on why that blocks.
  const disabled = busy || !fullName;

  /** Still images only — see the note on GIF above. */
  const acceptedTypes = ACCEPTED_MEDIA_TYPES.filter((type) => type !== 'image/gif');

  const save = (coverImageUrl: string) => {
    if (!fullName) return;
    updateProfile.mutate(
      { fullName, coverImageUrl },
      { onError: () => setError(t('profile.cover.error')) }
    );
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clearing the input here rather than in a callback: picking the SAME file twice fires no
    // change event otherwise, so a failed upload could not be retried with the same image.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (!acceptedTypes.includes(file.type) || file.size > MAX_MEDIA_FILE_BYTES) {
      // Repeats the rule the reader has just broken, which is the same sentence the button's
      // tooltip carries.
      setError(t('profile.cover.hint'));
      return;
    }
    setError(null);

    upload.mutate([file], {
      onSuccess: (result) => {
        const url = result.urls[0];
        // A 2xx with an empty array should not happen — the service validates every file before
        // writing any — but reading `[0]` off it blind would save `undefined` as a cover.
        if (!url) {
          setError(t('profile.cover.error'));
          return;
        }
        save(url);
      },
      onError: () => setError(t('profile.cover.error')),
    });
  };

  if (variant === 'panel') {
    return (
      <div className="flex flex-col gap-[var(--nx-space-element)]">
        <div className="aspect-[4/1] w-full overflow-hidden rounded-nx-sm border border-nx-border-subtle bg-nx-surface-sunken">
          {profile?.coverImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- object-storage host */
            <img src={profile.coverImageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title={t('profile.cover.hint')}
            className="inline-flex h-8 items-center gap-2 rounded-nx-sm border border-nx-border-strong bg-nx-surface-card px-2.5 text-nx-caption text-nx-text-primary hover:bg-nx-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )}
            {hasCover ? t('profile.cover.change') : t('profile.cover.add')}
          </button>
          {hasCover && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                save('');
              }}
              disabled={disabled}
              className="inline-flex h-8 items-center gap-2 rounded-nx-sm px-2.5 text-nx-caption text-nx-text-secondary hover:text-nx-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="size-4" aria-hidden />
              {t('profile.cover.remove')}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            className="hidden"
            onChange={onPickFile}
          />
        </div>
        {upload.isPending && (
          <ProgressBar
            value={upload.progress}
            label={t('profile.cover.add')}
            className="max-w-xs"
          />
        )}
        {error && <p className="text-nx-caption text-nx-status-danger-fg">{error}</p>}
      </div>
    );
  }

  return (
    <>
      {/* TOP-RIGHT ON A PHONE, BOTTOM-RIGHT FROM `sm`, and the split is a collision found by
          driving the real page rather than a preference. Above `sm` the hero is a row: the avatar
          hangs off the LEFT of the band and the bottom-right corner is empty, which is where a
          cover control belongs — nearest the image, furthest from the identity.

          Below `sm` the hero is a centred column, so the avatar rises into the MIDDLE of a band
          that is only 96 tall, and it covered the remove button entirely — the button was not
          merely cramped, it was unclickable, with the avatar's own `inset-0` upload button
          swallowing the tap. The band's top half is free at every width, so the phone uses it.

          `surface-overlay` rather than a solid fill: this has to stay legible over an arbitrary
          photograph AND over the empty sunken band. */}
      <div className="absolute right-2 top-2 flex items-center gap-1 sm:bottom-2 sm:top-auto">
        {hasCover && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              save('');
            }}
            disabled={disabled}
            aria-label={t('profile.cover.remove')}
            title={t('profile.cover.remove')}
            className="flex size-8 items-center justify-center rounded-nx-sm bg-nx-surface-overlay text-nx-text-on-color transition-colors duration-[var(--nx-duration-fast)] ease-nx-out hover:bg-nx-surface-overlay-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label={hasCover ? t('profile.cover.change') : t('profile.cover.add')}
          title={t('profile.cover.hint')}
          className="flex h-8 items-center gap-2 rounded-nx-sm bg-nx-surface-overlay px-2.5 text-nx-caption text-nx-text-on-color transition-colors duration-[var(--nx-duration-fast)] ease-nx-out hover:bg-nx-surface-overlay-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
          )}
          {hasCover ? t('profile.cover.change') : t('profile.cover.add')}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      {/* Under the band rather than on it, `absolute` so the hero's geometry never moves. Carries
          the upload progress while a file is going up, then the error line if the save fails. */}
      {upload.isPending && (
        <div className="absolute left-[var(--nx-space-pad)] top-full mt-1 w-40">
          <ProgressBar value={upload.progress} label={t('profile.cover.add')} />
        </div>
      )}
      {error && (
        <p className="absolute left-[var(--nx-space-pad)] top-full mt-1 text-nx-caption text-nx-status-danger-fg">
          {error}
        </p>
      )}
    </>
  );
}
