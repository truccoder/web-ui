'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';

/**
 * Edge-anchored overlay panel. Used by the app shell for the mobile navigation.
 *
 * NO DESIGN SYSTEM SPECIMEN EXISTS FOR THIS. `components/overlays/` ships Dialog, Menu, Toast and
 * Tooltip — nothing drawer-, sheet-, or sidebar-shaped — and `guidelines/` has no page on
 * responsive chrome. Recorded as ds-deviation #28, same class as the chat bubbles (#21), the
 * floating dock (#22) and the contribution graph (#26).
 *
 * BUILT AS A NARROWED `Dialog` RATHER THAN A NEW IDEA, so the two overlays cannot drift apart:
 * same scrim token (`--nx-surface-overlay`), same Escape-and-scrim-click contract, same
 * body-scroll lock, same focus-into-the-panel move. What differs is only geometry — full height,
 * pinned to an edge instead of centred — because that is the whole reason a drawer is not a
 * dialog. It is NOT built by extending `Dialog` with a `variant` prop: the two share four lines
 * of behaviour and disagree about every line of layout, and one component answering to both ends
 * up with a prop that silently changes what half the other props mean.
 *
 * THERE IS NO SLIDE-IN, AND THAT IS THE DECISION, not an omission. The obvious drawer motion is a
 * translate from off-screen, which would need a keyframe that does not exist — and the keyframe
 * block in `globals.css` says in as many words that it is the DS's sanctioned entrance set,
 * transcribed verbatim, "no others". Inventing motion on top of inventing the component is two
 * deviations where one will do, so the panel uses `nx-enter` (the same 120ms fade-rise every other
 * overlay in the app uses) and the scrim uses `nx-fade`. Add the slide the day the DS ships one.
 */

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  /** Which edge the panel is pinned to. @default "left" */
  side?: 'left' | 'right';
  /** Panel width in px. @default 256 */
  width?: number;
  /**
   * Accessible name for the panel. Required — a nav drawer with no name is an unlabelled region,
   * and this one never has a visible heading of its own.
   */
  label: string;
  children?: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  side = 'left',
  width = 256,
  label,
  children,
}: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Same client-detection trick as `Dialog`, and for the same reason: this renders during SSR on
  // every page that holds a closed drawer, and `createPortal` needs a DOM. Deriving the value with
  // `useSyncExternalStore` instead of `useState` + `useEffect` avoids the cascading render that
  // `react-hooks/set-state-in-effect` exists to prevent. The subscribe callback never fires.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!isClient || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-nx-surface-overlay animate-[nx-fade_var(--nx-duration-fast)_var(--ease-nx-out)]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ width }}
        className={cn(
          'fixed inset-y-0 flex max-w-[85vw] flex-col overflow-y-auto outline-none',
          'bg-nx-surface-card text-nx-text-primary shadow-nx-3',
          'animate-[nx-enter_var(--nx-duration-fast)_var(--ease-nx-out)]',
          side === 'left'
            ? 'left-0 border-r border-nx-border-default'
            : 'right-0 border-l border-nx-border-default'
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
