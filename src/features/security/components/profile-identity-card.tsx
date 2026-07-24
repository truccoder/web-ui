'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, Card } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { useChangeProfilePicture, useMyProfile } from '../hooks/use-profile';
import { ACCEPTED_PICTURE_TYPES, MAX_PROFILE_PICTURE_BYTES } from '../lib/validation';

/**
 * The profile header: avatar with inline picture upload, plus name and email. Unlike the
 * register photo picker, the upload fires immediately (`useChangeProfilePicture`) and the
 * cache patch from that hook drives the displayed image.
 */
export function ProfileIdentityCard() {
  const t = useT();
  const { data: profile } = useMyProfile();
  const changePicture = useChangeProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Optimistic preview shown only while the upload is in flight; the real URL comes from
  // the patched cache on success.
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_PICTURE_TYPES.includes(file.type) || file.size > MAX_PROFILE_PICTURE_BYTES) {
      setError(t('profile.uploadHint'));
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    changePicture.mutate(file, {
      onSettled: () => {
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const displayUrl = preview ?? profile?.profilePictureUrl;

  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="group relative shrink-0">
          <Avatar src={displayUrl} name={profile?.fullName} size="2xl" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={changePicture.isPending}
            aria-label={t('profile.uploadHint')}
            className="absolute inset-0 flex items-center justify-center rounded-nx-full bg-nx-surface-overlay opacity-0 transition-opacity duration-[var(--nx-duration-fast)] ease-nx-out group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring disabled:cursor-not-allowed"
          >
            {changePicture.isPending ? (
              <Loader2 className="size-6 animate-spin text-nx-text-on-color" aria-hidden />
            ) : (
              <Camera className="size-6 text-nx-text-on-color" aria-hidden />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_PICTURE_TYPES.join(',')}
            className="hidden"
            onChange={onPickFile}
          />
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-nx-title-sm font-semibold text-nx-text-primary">
            {profile?.fullName ?? '—'}
          </h2>
          {profile?.email && (
            <p className="mt-0.5 text-nx-body-sm text-nx-text-muted">{profile.email}</p>
          )}
          <p className="mt-1 text-nx-caption text-nx-text-faint">{t('profile.uploadHint')}</p>
          {error && <p className="mt-1 text-nx-caption text-nx-status-danger-fg">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
