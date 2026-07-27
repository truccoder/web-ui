import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from `Skeleton.d.ts` + `Skeleton.prompt.md`. Content-region loading
 * placeholder with the calm 1.6s shimmer (`.nx-skeleton`). Mirror the final layout —
 * never a full-page spinner. `aria-hidden` is built in.
 */
export interface SkeletonProps {
  /** CSS width. Ignored when `circle`. @default "100%" */
  width?: number | string;
  /** Bar height / circle diameter. @default 14 */
  height?: number | string;
  /** Round avatar placeholder (width = height). */
  circle?: boolean;
  /** Override border radius. Default is `--radius-nx-xs`. */
  radius?: number | string;
  /** Render N stacked text lines (the last is 62% wide). */
  lines?: number;
  /** Gap between lines. @default 8 */
  gap?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const asLen = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

export function Skeleton({
  width = '100%',
  height = 14,
  circle = false,
  radius,
  lines,
  gap = 8,
  className,
  style,
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <span
        aria-hidden
        className={cn('flex flex-col', className)}
        style={{ gap: asLen(gap), ...style }}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className="nx-skeleton block"
            style={{
              width: i === lines - 1 ? '62%' : '100%',
              height: asLen(height),
              borderRadius: radius !== undefined ? asLen(radius) : 'var(--radius-nx-xs)',
            }}
          />
        ))}
      </span>
    );
  }

  const size = asLen(height);
  return (
    <span
      aria-hidden
      className={cn('nx-skeleton block', className)}
      style={{
        width: circle ? size : asLen(width),
        height: size,
        borderRadius: circle
          ? '9999px'
          : radius !== undefined
            ? asLen(radius)
            : 'var(--radius-nx-xs)',
        ...style,
      }}
    />
  );
}
