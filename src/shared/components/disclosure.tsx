'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * A collapsible `Section`: same title/description contract, closed by default and opened by
 * clicking the header. For a tab that is a list of independent things a person might do
 * ("Tài khoản": edit your name, change your password, review a violation, check who you blocked)
 * rather than one thing they came to read, showing every section's full content at once forces a
 * scroll through three the visitor did not ask for.
 *
 * WAI-ARIA accordion shape: the toggle `<button>` sits INSIDE the `<h2>`, not the other way round,
 * so the heading is still announced as a heading and the button still owns the click. There is no
 * separate expand/collapse label — the button's accessible name is the title text it already
 * shows, and `aria-expanded` is what a screen reader uses to say which state it is in.
 */
export interface DisclosureProps {
  title: string;
  description?: React.ReactNode;
  /** @default false */
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Disclosure({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: DisclosureProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const panelId = React.useId();

  return (
    <section className={cn('flex flex-col gap-[var(--nx-space-pair)]', className)}>
      <h2 className="text-nx-title-sm text-nx-text-primary">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-[var(--nx-space-element)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          {title}
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-nx-text-muted transition-transform duration-[var(--nx-duration-fast)] ease-nx-out',
              open && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </h2>

      {description && <p className="text-nx-body-sm text-nx-text-muted">{description}</p>}

      {open && (
        <div
          id={panelId}
          className="mt-[var(--nx-space-tight)] flex flex-col gap-[var(--nx-space-element)]"
        >
          {children}
        </div>
      )}
    </section>
  );
}
