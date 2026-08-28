'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * The floating row of reactions that opens off the single Like button.
 *
 * THIS IS A POPOVER, AND THE DESIGN SYSTEM HAS NO POPOVER. `ReactionBar` used to say so out loud
 * as the reason it kept seven inline toggles instead: the DS ships Dialog, Menu, Tooltip and
 * Toast, and nothing that floats a small panel off a control. The owner asked for the familiar
 * one-button-plus-tray, so the primitive is written here rather than pretended away — and kept
 * deliberately small, in this feature, so it is not mistaken for a sanctioned DS component that
 * other surfaces should reach for.
 *
 * THREE WAYS IN, BECAUSE HOVER IS ONLY ONE INPUT. A tray that opens on hover alone does not exist
 * on a phone and cannot be reached from a keyboard, which would take a product that currently has
 * seven reachable reactions down to one:
 *
 *  | input    | opens on                        | closes on                         |
 *  | ---      | ---                             | ---                               |
 *  | mouse    | pointer in, after `OPEN_DELAY`  | pointer out, after `CLOSE_DELAY`  |
 *  | keyboard | focus entering the group        | focus leaving it, or `Escape`     |
 *  | touch    | press held for `HOLD_DELAY`     | picking one, or a tap outside     |
 *
 * THE DELAYS ARE NOT DECORATION. Opening instantly on hover means the tray flashes at anyone whose
 * pointer crosses the button on its way somewhere else; closing instantly means the diagonal
 * travel from the button to the far end of the tray passes over dead space and dismisses it. Both
 * are the standard fix and both are why this cannot be `:hover` in CSS.
 */
const OPEN_DELAY = 320;
const CLOSE_DELAY = 220;
const HOLD_DELAY = 400;

export interface ReactionTrayProps {
  /** The always-visible control. Rendered inside the hover/focus group. */
  trigger: React.ReactNode;
  /**
   * The reaction buttons. Plain children, NOT a render prop that receives a `close`.
   *
   * The tray closes itself from a click anywhere inside it, which is both simpler and the only
   * shape `react-hooks/refs` allows: handing a caller a closure over `timer.current` and then
   * CALLING that caller during render is exactly the pattern the rule rejects, and it is right to
   * — the ref would be read on a render rather than in a handler.
   */
  children?: React.ReactNode;
  /** Names the floating group for assistive tech. */
  label: string;
  className?: string;
}

export function ReactionTray({ trigger, children, label, className }: ReactionTrayProps) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = React.useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Every scheduled open/close is cancelled on unmount: a card scrolled out of a feed mid-hover
  // would otherwise set state after it is gone.
  React.useEffect(() => clear, []);

  const schedule = (next: boolean, delay: number) => {
    clear();
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  const closeNow = () => {
    clear();
    setOpen(false);
  };

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => schedule(true, OPEN_DELAY)}
      onMouseLeave={() => schedule(false, CLOSE_DELAY)}
      // `focusin`/`focusout` on the wrapper rather than on the button: the tray's own items are
      // inside it, so tabbing from the trigger into the tray never leaves the group and never
      // closes what the user is tabbing through.
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeNow();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          closeNow();
        }
      }}
      /**
       * TOUCH: A HELD PRESS OPENS IT. `pointerdown` starts the timer only for a touch pointer —
       * a mouse already has hover and would otherwise get two competing openings — and any
       * movement or release before `HOLD_DELAY` cancels, so a normal tap still reaches the
       * button's own `onClick` and just likes the post.
       */
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') return;
        held.current = false;
        clear();
        timer.current = setTimeout(() => {
          held.current = true;
          setOpen(true);
        }, HOLD_DELAY);
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== 'touch') return;
        clear();
      }}
      onPointerCancel={clear}
      // A hold that opened the tray must not ALSO fire the trigger's click when the finger lifts.
      onClickCapture={(event) => {
        if (!held.current) return;
        held.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {trigger}

      {/**
       * `hidden` RATHER THAN OPACITY-0. A visually hidden tray that is still in the DOM keeps its
       * seven buttons in the tab order, so a keyboard user would tab through seven controls they
       * cannot see. `hidden` removes them from the tree and the tab order together.
       *
       * `bottom-full` — it opens UPWARD. The bar sits at the bottom of a card with the comment
       * thread under it; a tray opening downward would cover the first comment, which is the one
       * thing a reader is most likely to be heading for next.
       */}
      <div
        role="group"
        aria-label={label}
        hidden={!open}
        // PICKING ONE CLOSES THE TRAY, and the listener sits on the container rather than on each
        // button so a caller cannot forget it. Clicks from the reaction buttons bubble here; a
        // click on the tray's own padding closes it too, which is the harmless reading of "you
        // pointed at this and did not pick anything".
        onClick={closeNow}
        className={cn(
          'absolute bottom-full left-0 z-20 mb-1 flex items-center gap-1',
          'rounded-nx-full border border-nx-border-subtle bg-nx-surface-raised p-1 shadow-nx-2'
        )}
      >
        {children}
      </div>
    </div>
  );
}
