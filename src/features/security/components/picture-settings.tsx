'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Avatar, Section } from '@/shared/components';
import { ImageCropDialog } from '@/features/media';
import { useT } from '@/core/i18n';
import { useChangeProfilePicture, useMyProfile } from '../hooks/use-profile';
import { ACCEPTED_PICTURE_TYPES, MAX_PROFILE_PICTURE_BYTES } from '../lib/validation';
import { ProfileCoverControl } from './profile-cover-control';

/**
 * `/settings/picture` — avatar and cover, managed on their own surface.
 *
 * THE HERO KEEPS ITS INLINE EDITING TOO. Unlike the other five things the settings hub absorbed,
 * a face with a camera button on it is not machinery-config — it is identity, and taking the
 * upload off `/profile`'s hero would be a regression (its phone discoverability is already
 * fragile, see `ProfileIdentityCard`). So this page is an additional home, not a replacement.
 *
 * AVATAR IS ITS OWN ENDPOINT (`PUT /profile/picture`, `useChangeProfilePicture`) with its own
 * limits — 5MB, no GIF — separate from the media store the cover uses. Crop is not wired here yet
 * (a later pass); this is a straight pick-and-upload.
 */
export function PictureSettings() {
  const t = useT();
  const { data: profile } = useMyProfile();
  const changePicture = useChangeProfilePicture();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The picked file, waiting in the square crop dialog before it is uploaded.
  const [cropFile, setCropFile] = useState<File | null>(null);

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!ACCEPTED_PICTURE_TYPES.includes(file.type) || file.size > MAX_PROFILE_PICTURE_BYTES) {
      setError(t('profile.uploadHint'));
      return;
    }
    setError(null);
    setCropFile(file);
  };

  const upload = (file: File) => {
    setCropFile(null);
    setPreview(URL.createObjectURL(file));
    changePicture.mutate(file, { onSettled: () => setPreview(null) });
  };

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Section
        title={t('settings.picture.avatarTitle')}
        description={t('settings.picture.avatarDesc')}
      >
        <div className="flex items-center gap-[var(--nx-space-group)]">
          <Avatar
            size="lg"
            src={preview ?? profile?.profilePictureUrl}
            name={profile?.fullName ?? undefined}
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={changePicture.isPending}
              className="inline-flex h-8 w-fit items-center gap-2 rounded-nx-sm border border-nx-border-strong bg-nx-surface-card px-2.5 text-nx-caption text-nx-text-primary hover:bg-nx-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {changePicture.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
              {t('settings.picture.avatarChange')}
            </button>
            <p className="text-nx-caption text-nx-text-muted">{t('profile.uploadHint')}</p>
            {error && <p className="text-nx-caption text-nx-status-danger-fg">{error}</p>}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_PICTURE_TYPES.join(',')}
            className="hidden"
            onChange={pick}
          />
        </div>
      </Section>

      <Section
        title={t('settings.picture.coverTitle')}
        description={t('settings.picture.coverDesc')}
      >
        <ProfileCoverControl variant="panel" />
      </Section>

      <ImageCropDialog
        file={cropFile}
        aspect={1}
        onCancel={() => setCropFile(null)}
        onCropped={upload}
      />
    </div>
  );
}
