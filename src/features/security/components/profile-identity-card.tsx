'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, Card } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useChangeProfilePicture, useMyProfile } from '../hooks/use-profile';
import { ACCEPTED_PICTURE_TYPES, MAX_PROFILE_PICTURE_BYTES } from '../lib/validation';

/**
 * The profile header: avatar with inline picture upload, plus name and email. Unlike the
 * register photo picker, the upload fires immediately (`useChangeProfilePicture`) and the
 * cache patch from that hook drives the displayed image.
 *
 * IT IS THE PAGE'S TITLE NOW, not a card under one. `/profile` used to open with an `<h1>` reading
 * "Trang cá nhân" and a subtitle reading "Quản lý cài đặt tài khoản của bạn", directly above this
 * card showing the same person's name — a heading that repeated the rail's active item, over a
 * subtitle that described one third of the page. Both are gone and the name is the `<h1>`, which
 * is the shape `/u/{username}` has always had: on a page about one person, that person's name is
 * the title.
 *
 * SO THE NAME MOVED FROM `<h2>`/`title-sm` TO `<h1>`/`title`. Nothing else about the card grew —
 * the point of the change was to REMOVE two lines from the top of the page, not to make the hero
 * taller.
 *
 * WHY `badge` IS A SLOT RATHER THAN THIS CARD FETCHING THE SCORE. The Elite Score chip belongs
 * beside the name (`/u/{username}` puts it there and the reputation e2e test already describes it
 * as living "beside the name in the profile hero"), but `features/reputation` imports
 * `features/security` for `MyReputationCard`. Reaching back the other way from inside this
 * component would close a barrel-to-barrel cycle. The ROUTE may import both, so the route resolves
 * the score and hands the rendered chip in.
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

  const displayUrl = preview ?? profile?.profilePictureUrl;

  return (
    <Card className="w-full">
      {/* `sm:items-center` — and this REVERSES the `items-start` that was right when the block was
          four lines deep (name · handle · email · upload hint). Top alignment exists to stop a
          wrapped name from dragging the avatar down; against two lines that are shorter than the
          96 avatar it does the opposite, hanging a short stack off the top of a tall circle with
          all the slack pooled underneath. Two lines want the optical centre of the picture.
          If a line is ever added back here, this goes back to `sm:items-start` with it. */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        {/* `flex`, AND IT IS LOAD-BEARING RATHER THAN TIDINESS. `Avatar` renders an `inline-flex`
            span, so inside a plain block this div it sits on a text baseline and the line box adds
            the descender gap under it: the wrapper measured 96 × 103 around a 96 × 96 picture.
            That is not only a stray 7px of layout — this div is what the camera button anchors to
            with `absolute inset-0`, so the round overlay was drawn as a 96 × 103 ellipse bleeding
            below the circle it is supposed to cover. Making the wrapper a flex container turns the
            avatar into a flex item, which has no baseline to hang from. */}
        <div className="group relative flex shrink-0">
          {/* `inset`: the seeded pictures are circles drawn to the edge of a square file, and
              a circular mask over one of those shaves its outline flat at four points. See the
              prop's note on `Avatar`. */}
          <Avatar src={displayUrl} name={profile?.fullName} size="2xl" inset />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={changePicture.isPending}
            aria-label={t('profile.uploadHint')}
            /* THE HINT IS A TOOLTIP NOW, not a line of the hero. It used to be printed under the
               email in `text-faint`, where it was permanent furniture explaining a control that is
               itself invisible until you point at it — the page said "click to upload" at all
               times about a camera button nobody could see yet. On the same `title` as the
               `aria-label` it appears exactly when the camera does, which is when the reader has
               already found the thing it describes.
               WHAT IT COSTS, stated rather than glossed: a touch screen has no hover, so on a
               phone neither the camera nor this text appears. The control still works — the button
               covers the whole avatar and a tap opens the picker — but it is now undiscoverable
               there rather than merely quiet. The owner asked for the hover, and a real tooltip
               component (which this kit does not ship) would not fix the phone either. */
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
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-[var(--nx-space-tight)] sm:justify-start">
            <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
              {profile?.fullName ?? '—'}
            </h1>
            {badge}
          </div>
          {profile?.username && (
            <p className="truncate font-mono text-nx-body-sm text-nx-text-muted">
              @{profile.username}
            </p>
          )}
          {/* THE EMAIL LEFT WITH THE UPLOAD HINT, at the owner's call, and it is worth writing down
              what that costs: this hero was the ONLY place in the product that showed you your own
              account address. `ProfileInfoForm` edits the display name and nothing else, and no
              other surface prints it — so the address is now visible nowhere. Nothing depends on
              it being on screen, and the identity people actually go by here is the handle, which
              stayed. Restoring it is one `<p>`. */}
          {error && <p className="mt-1 text-nx-caption text-nx-status-danger-fg">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
