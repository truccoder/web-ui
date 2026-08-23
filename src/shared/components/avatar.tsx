import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Avatar.d.ts` + `Avatar.prompt.md` contract.
 * No design-system source was read.
 *
 * Circular avatar: image when `src` is given, initials fallback otherwise, optional
 * presence dot.
 *
 * DEVIATION, minor: the prompt says "initials fallback on a name-stable color". The
 * token layer exposes only semantic aliases as utilities, not the raw ramp, so a
 * per-name colour would mean either raw hex (forbidden, §10) or re-exposing the ramp
 * (invites the decorative colour the constitution forbids). Falls back to one neutral
 * sunken surface instead — ink is structure (§1.1). Revisit if a name-stable colour is
 * ever actually required.
 */
export interface AvatarProps {
  src?: string;
  /** Used for alt text and the initials fallback. */
  name?: string;
  /** xs 20 · sm 24 · md 32 · lg 40 · xl 64 · 2xl 96 (profile hero). @default "md" */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Presence dot. */
  status?: 'online' | 'busy' | 'offline';
  /**
   * Draws the picture with a hair of breathing room inside the circle instead of edge to edge.
   *
   * WHAT IT IS FOR, precisely: artwork that is itself a circle drawn to the bounds of a square
   * file — the seeded profile pictures are exactly this, a 512×512 PNG whose plate outline is
   * tangent to all four edges. A circular mask over a circle of the same diameter does not crop
   * the corners, it SHAVES the outline flat at the four cardinal points, which reads as a picture
   * that was cut badly rather than as a picture that was framed. A few per cent of inset moves the
   * whole drawing inside the mask and the shave disappears.
   *
   * IT IS NOT THE DEFAULT, and must not become one. The inset costs a thin ring of
   * `surface-sunken` around the image, which is invisible behind a transparent-cornered graphic
   * and is a visible grey rim around an edge-to-edge photograph. Small avatars (the feed's 32, the
   * rail's 24) cannot spare the pixels either. So it is opt-in, and today the two profile heroes
   * are what opt in — the one place the picture is large enough to be looked AT rather than
   * glanced at.
   *
   * @default false
   */
  inset?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizePx: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 64,
  '2xl': 96,
};

/** Presence never relies on colour alone (§12) — the dot also carries a title. */
const statusStyles: Record<NonNullable<AvatarProps['status']>, { cls: string; label: string }> = {
  online: { cls: 'bg-nx-status-success', label: 'Online' },
  busy: { cls: 'bg-nx-status-danger', label: 'Busy' },
  offline: { cls: 'bg-nx-text-faint', label: 'Offline' },
};

function initialsOf(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  src,
  name,
  size = 'md',
  status,
  inset = false,
  className,
  style,
}: AvatarProps) {
  const px = sizePx[size];
  const initials = initialsOf(name);
  // Initials scale with the circle; ~40% reads well at every documented size.
  const fontSize = Math.round(px * 0.4);

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: px, height: px, ...style }}
    >
      <span
        className={cn(
          'flex size-full items-center justify-center overflow-hidden rounded-nx-full',
          'bg-nx-surface-sunken text-nx-text-secondary font-medium select-none'
        )}
        style={{ fontSize }}
      >
        {src ? (
          // Avatar src is a runtime user URL / blob, not a static asset; next/image adds
          // no value here and needs remote-pattern config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name ?? ''}
            /* PERCENTAGE PADDING, NOT A FIXED STEP OFF THE SPACING LADDER, and the reason is that
               this box is sized in six different ways: 4 at 20 and 19 at 96 would be two different
               pictures. `box-sizing: border-box` is global here, so the padding eats into the
               drawn area rather than growing the circle, and `object-cover` still fills whatever
               is left. */
            className={cn('size-full object-cover', inset && 'p-[7%]')}
          />
        ) : (
          <span aria-hidden={!name}>{initials || '?'}</span>
        )}
      </span>

      {status && (
        <span
          title={statusStyles[status].label}
          className={cn(
            'absolute bottom-0 right-0 rounded-nx-full ring-2 ring-nx-surface-card',
            statusStyles[status].cls
          )}
          style={{
            width: Math.max(6, Math.round(px * 0.28)),
            height: Math.max(6, Math.round(px * 0.28)),
          }}
        >
          <span className="sr-only">{statusStyles[status].label}</span>
        </span>
      )}
    </span>
  );
}
