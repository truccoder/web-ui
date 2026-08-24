'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Dialog.d.ts` + `Dialog.prompt.md` contract and from the
 * rendered `overlays.card.html` specimen. No design-system source was read.
 *
 * Values below were MEASURED off the rendered specimen with `getComputedStyle` rather than guessed,
 * and every one of them turned out to already have a token: the panel shadow is exactly
 * `--shadow-nx-3`, the radius is `--radius-nx-lg` (12px), and the scrim is `--nx-surface-overlay`
 * (`rgba(16,24,32,.55)`). So this component introduces no new raw values.
 *
 * DEVIATION #23, deliberate: `Dialog.d.ts` describes the footer as "right-aligned on a sunken
 * footer band". The rendered specimen's footer has NO band — it is transparent, flush with the
 * body, padding `14px 18px 12px`, gap 8px. The specimen is the visual source of truth
 * (CLAUDE.md §1: view the rendered guideline, do not infer appearance from prose), so the footer is
 * built flush. Recorded in `ds-deviations.md` so the mismatch goes back to the DS owner instead of
 * each reader deciding separately.
 *
 * EXTENSION beyond the DS contract, also #23: `maxHeight` + a scrollable body. The DS Dialog is
 * specified for "confirmations and small focused forms", which never overflow. The book reader is
 * a tall panel whose content scrolls, and inventing a second overlay primitive for it would leave
 * two dialogs to keep visually in sync. The extension is additive — omit `maxHeight` and the
 * component behaves exactly as specified.
 */

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Action row (Buttons), right-aligned. */
  footer?: React.ReactNode;
  /** Max width in px. @default 440 */
  width?: number;
  /**
   * Cap the panel height and let the body scroll inside it. Any CSS length. Omit for the DS
   * default of a panel that grows with its content.
   */
  maxHeight?: number | string;
  /** Removes the body padding, for content that manages its own (the PDF reader's page area). */
  bodyBleed?: boolean;
  children?: React.ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  width = 440,
  maxHeight,
  bodyBleed = false,
  children,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  // Portals need a DOM that exists, and this component is rendered during SSR by any page holding
  // a closed dialog. `useSyncExternalStore` DERIVES "am I on the client" — server snapshot false,
  // client snapshot true — instead of the usual `useState(false)` + `useEffect(setMounted)`, which
  // `react-hooks/set-state-in-effect` rejects. Deriving is the fix the rule is asking for; silencing
  // it would leave the cascading render it exists to prevent. The subscribe callback never fires
  // because the value cannot change after hydration.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Escape closes, and the page behind must not scroll while a modal owns the screen. Both are
  // part of the DS contract ("Escape/scrim-click to close") rather than embellishments.
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  /**
   * FOCUSING THE PANEL IS ITS OWN EFFECT, KEYED ON `open` ALONE — and this split is a bug fix,
   * not tidying.
   *
   * It used to live in the effect above, which also depends on `onClose`. Almost every caller
   * writes `onClose={() => setOpen(false)}` inline, so that prop is a NEW FUNCTION on every
   * render of the parent. Any dialog holding a controlled field therefore did this: type a
   * character → parent state changes → parent re-renders → `onClose` identity changes → the
   * effect re-runs → `panel.focus()` → the field you were typing in loses focus.
   *
   * Reported on the composer as "I type one letter and cannot type any more", and it was every
   * dialog with an input in it, not just that one. Moving focus into the panel is a thing that
   * should happen exactly ONCE per opening, which is what `[open]` says and what `[open, onClose]`
   * did not.
   *
   * Returning focus to the trigger on close is still the caller's job — it owns the element, and
   * stashing it here breaks when the trigger unmounts.
   */
  React.useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  if (!isClient || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-nx-surface-overlay p-4"
      // Only a click that both starts and ends on the scrim closes: dragging a text selection out
      // of the panel and releasing over the backdrop would otherwise throw the dialog away.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        }}
        className={cn(
          'flex flex-col overflow-hidden rounded-nx-lg border border-nx-border-default',
          'bg-nx-surface-card text-nx-text-primary shadow-nx-3 outline-none'
        )}
      >
        {(title || description) && (
          <div className="shrink-0 px-[18px] pt-4">
            {title && (
              <div id={titleId} className="text-[16px] font-semibold leading-[1.6]">
                {title}
              </div>
            )}
            {description && (
              <div
                id={descriptionId}
                className="mt-1 text-[13px] leading-[1.6] text-nx-text-secondary"
              >
                {description}
              </div>
            )}
          </div>
        )}

        {children != null && (
          <div
            className={cn(
              'min-h-0 flex-1',
              maxHeight && 'overflow-y-auto',
              bodyBleed ? '' : 'px-[18px] pt-4',
              // The specimen's body has no bottom padding — the footer's own top padding provides
              // the gap. Without a footer that would leave the content flush against the edge.
              !footer && !bodyBleed && 'pb-4'
            )}
          >
            {children}
          </div>
        )}

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 px-[18px] pb-3 pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
