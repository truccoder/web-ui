'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Tabs.d.ts` + `Tabs.prompt.md` contract and the
 * rendered `navigation.card` specimen. No design-system source was read.
 *
 * Underline tabs: a 2px indicator on the active tab, sitting on the tablist's hairline.
 * Counts render as mono pills (metadata is mono, constitution §7.1).
 *
 * DEVIATION, deliberate: `Tabs.d.ts` and the prompt both say "amber active indicator",
 * but the DS's own rendered specimen draws `border-bottom: 2px solid var(--accent)` —
 * blue. Amber is reserved for reputation (§1.3) and the active tab is interactive state,
 * which is blue's job (§1.2). Specimen + constitution agree, so the indicator is blue.
 */
export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Rendered as a trailing mono pill. */
  count?: number;
}

export interface TabsProps {
  tabs?: Array<string | TabItem>;
  /** Id of the active tab. */
  active?: string;
  onChange?: (id: string) => void;
  /** @default "md" */
  size?: 'sm' | 'md';
  /** Labels the tablist for assistive tech. */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
}

const sizeStyles: Record<NonNullable<TabsProps['size']>, string> = {
  sm: 'px-2.5 py-1.5 text-nx-body-sm',
  md: 'px-3 py-2.5 text-nx-ui',
};

const toItem = (tab: string | TabItem): TabItem =>
  typeof tab === 'string' ? { id: tab, label: tab } : tab;

export function Tabs({
  tabs = [],
  active,
  onChange,
  size = 'md',
  'aria-label': ariaLabel,
  className,
  style,
}: TabsProps) {
  const items = tabs.map(toItem);
  const activeIndex = items.findIndex((item) => item.id === active);

  // Arrow keys move between tabs (ARIA tabs pattern); focus follows selection, which is
  // safe here because switching a tab only swaps an already-loaded panel.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    let next = -1;

    if (step !== 0 && activeIndex !== -1) {
      next = (activeIndex + step + items.length) % items.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = items.length - 1;
    }

    if (next === -1) return;
    event.preventDefault();
    onChange?.(items[next].id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={style}
      // R15: the rail the tabs sit on is `border-subtle`, not `border-default`. `border-default`
      // climbed the ramp this round to become a line you can actually see; a tab strip's baseline
      // is not that — it is the faintest possible hint of a shared edge, and at the new value it
      // was competing with the 2px active indicator sitting on top of it.
      className={cn('flex gap-1 border-b border-nx-border-subtle font-sans', className)}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange?.(item.id)}
            className={cn(
              // -1px pulls the indicator onto the tablist hairline instead of below it.
              '-mb-px inline-flex items-center gap-2 border-b-2 bg-transparent',
              'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
              sizeStyles[size],
              isActive
                ? 'border-nx-accent font-semibold text-nx-text-primary'
                : 'border-transparent font-normal text-nx-text-secondary hover:text-nx-text-primary'
            )}
          >
            {item.icon && (
              <span className="shrink-0 [&>svg]:size-4" aria-hidden>
                {item.icon}
              </span>
            )}
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-nx-full bg-nx-surface-sunken px-1.5 font-mono text-nx-overline text-nx-text-muted">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
