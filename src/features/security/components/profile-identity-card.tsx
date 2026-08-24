'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { ProfileHero } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useChangeProfilePicture, useMyProfile } from '../hooks/use-profile';
import { ACCEPTED_PICTURE_TYPES, MAX_PROFILE_PICTURE_BYTES } from '../lib/validation';

/**
 * `/profile`'s hero: the shared `ProfileHero` filled with the signed-in account, plus the one
 * thing only the owner's copy has — inline picture upload. Unlike the register photo picker, the
 * upload fires immediately (`useChangeProfilePicture`) and the cache patch from that hook drives
 * the displayed image.
 *
 * WHAT IS LEFT HERE IS THE UPLOAD AND THE QUERY, AND THAT IS THE POINT OF THE SPLIT. The card,
 * the avatar, the `<h1>`, the handle and the layout around them were a near-copy of the hero
 * `/u/[username]` builds inline; the two had drifted on avatar size, alignment, mobile behaviour
 * and whether the name truncates. `ProfileHero` carries that account and now owns all of it. This
 * file supplies the data and hands the camera button in through `avatarOverlay`.
 *
 * IT IS THE PAGE'S TITLE, not a card under one. `/profile` used to open with an `<h1>` reading
 * "Trang cá nhân" over a subtitle reading "Quản lý cài đặt tài khoản của bạn", directly above a
 * card showing the same person's name — a heading that repeated the rail's active item, over a
 * subtitle that described one third of the page. Both are gone and the name is the `<h1>`, which
 * is the shape `/u/{username}` has always had: on a page about one person, that person's name is
 * the title.
 *
 * WHY `badge` IS PASSED THROUGH RATHER THAN FETCHED HERE. The Elite Score chip belongs beside the
 * name, but `features/reputation` imports `features/security` for `MyReputationCard`. Reaching
 * back the other way from inside this component would close a barrel-to-barrel cycle. The ROUTE
 * may import both, so the route resolves the score and hands the rendered chip in.
 *
 * THE EMAIL LEFT THIS HERO with the upload hint, at the owner's call, and it is worth writing down
 * what that costs: this was the ONLY place in the product that showed you your own account
 * address. `ProfileInfoForm` edits the display name and nothing else, and no other surface prints
 * it — so the address is now visible nowhere. Nothing depends on it being on screen, and the
 * identity people actually go by here is the handle, which stayed. Restoring it is one `<p>` in
 * the `footer` slot.
 */
export interface ProfileIdentityCardProps {
  /**
   * Rendered on the name line, after the name. Intended for the Elite Score chip; kept generic
   * because this component must not know what reputation is.
   */
  badge?: React.ReactNode;
}

export function ProfileIdentityCard({ badge }: ProfileIdentityCardProps) {
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
      // Says what was wrong by repeating the rule — the same sentence the tooltip carries, which
      // is the one the reader has just broken.
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

  return (
    <ProfileHero
      name={profile?.fullName ?? '—'}
      username={profile?.username}
      avatarUrl={preview ?? profile?.profilePictureUrl}
      badge={badge}
      avatarOverlay={
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={changePicture.isPending}
            aria-label={t('profile.uploadHint')}
            /* THE HINT IS A TOOLTIP, not a line of the hero. It used to be printed under the email
               in `text-faint`, where it was permanent furniture explaining a control that is itself
               invisible until you point at it — the page said "click to upload" at all times about
               a camera button nobody could see yet. On the same `title` as the `aria-label` it
               appears exactly when the camera does, which is when the reader has already found the
               thing it describes.
               WHAT IT COSTS, stated rather than glossed: a touch screen has no hover, so on a phone
               neither the camera nor this text appears. The control still works — the button covers
               the whole avatar and a tap opens the picker — but it is now undiscoverable there
               rather than merely quiet. The owner asked for the hover, and a real tooltip component
               (which this kit does not ship) would not fix the phone either. */
            title={t('profile.uploadHint')}
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
        </>
      }
      footer={error && <p className="mt-1 text-nx-caption text-nx-status-danger-fg">{error}</p>}
    />
  );
}
