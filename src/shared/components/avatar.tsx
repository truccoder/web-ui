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

export function Avatar({ src, name, size = 'md', status, className, style }: AvatarProps) {
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
          <img src={src} alt={name ?? ''} className="size-full object-cover" />
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
