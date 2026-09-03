'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';

/**
 * Hand-written from the design system's `Menu.d.ts` + `Menu.prompt.md` contract. No design-system
 * source was read.
 *
 * KEYBOARD MODEL IS THE CONTRACT, NOT A NICETY, and it is unusual enough to state: **focus never
 * leaves the trigger**. ArrowDown opens and highlights the first item, arrows cycle, Enter/Space
 * selects the highlighted one, Escape closes. Nothing inside the panel is focusable — the
 * highlight is a `aria-activedescendant` pointer, not real focus. That is why the items are
 * `<div role="menuitem">` rather than buttons: a button would take a tab stop and pull focus off
 * the trigger, breaking the model the DS specifies.
 *
 * FOR ACTIONS ONLY. `Menu.prompt.md` is explicit that choosing a form value uses `Select`. If you
 * are reaching for this to set a field, you want the other component.
 *
 * Destructive items go last, after a `"-"` separator, with `danger: true` — also doctrine, also
 * not enforceable here; review it.
 *
 * The panel is NOT portalled by default, unlike `Dialog`. A menu is anchored to its trigger, so it
 * belongs in the trigger's stacking context to stay put when the page scrolls; a modal owns the
 * whole screen and has the opposite requirement.
 *
 * `portal` IS THE ESCAPE HATCH FOR A CLIPPING ANCESTOR, and it exists because one real caller has
 * one. `/newsfeed`'s filter bar is a `StickyBlock`, which sets `overflow-hidden` so the tab
 * scroller keeps inside its rounded corners — and an absolutely positioned panel inside an
 * `overflow: hidden` box is CUT OFF at that box's edge, which is exactly what the owner saw: press
 * the compose icon and a two-pixel sliver of menu appears under the bar. No z-index fixes it;
 * clipping happens before stacking is considered.
 *
 * SO THE PANEL LEAVES THE TREE AND TAKES ITS ANCHOR WITH IT. In portal mode it renders into
 * `document.body` at `position: fixed`, positioned from the trigger's measured rect, and re-reads
 * that rect on scroll and resize while open. Two consequences worth stating: the outside-click
 * test has to consult the panel as well as the root (the panel is no longer inside it), and the
 * panel no longer inherits the root's `opacity`/`pointer-events` — which is fine for the caller
 * that needed this, because a trigger it cannot click is a menu that cannot open.
 *
 * NO AUTO-FLIP. `side` stays the explicit control: guessing needs the panel's height before it is
 * laid out, and the one portalled caller sits at the top of the viewport where down is always
 * right. Flip it deliberately or not at all.
 */

export type MenuItem =
  | {
      label: React.ReactNode;
      /** 14–16px glyph. */
      icon?: React.ReactNode;
      /** Right-aligned mono hint (shortcut, count). */
      meta?: string;
      danger?: boolean;
      disabled?: boolean;
      onSelect?: () => void;
    }
  | '-';

export interface MenuProps {
  /** The element that toggles the menu (usually a Button/IconButton). */
  trigger: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  /** Items; `"-"` renders a separator. */
  items?: MenuItem[];
  /** Horizontal anchoring. @default "start" */
  align?: 'start' | 'end';
  /** Min panel width in px. @default 200 */
  width?: number;
  /** Open upwards, for a trigger that sits at the bottom of the viewport. */
  side?: 'bottom' | 'top';
  /**
   * Render the panel into `document.body` instead of beside the trigger. Needed only when an
   * ancestor clips overflow — see the header. Costs a measured rect and two listeners.
   */
  portal?: boolean;
  /** Called with the picked item, in addition to that item's own `onSelect`. */
  onSelect?: (item: Exclude<MenuItem, '-'>) => void;
  className?: string;
}

/*
 * TWO CONTRACT PROPS ARE MISSING ON PURPOSE.
 * `defaultOpen` — `Menu.d.ts` marks it "render open initially (specimens)". It exists so the DS
 * can screenshot the panel; this app has no specimen page, and a menu that opens by itself on
 * mount is a bug everywhere else.
 * `style` — every other primitive here takes `className` instead, and mixing the two conventions
 * across `shared/` is how inline styles start winning over tokens.
 *
 * `side` is an ADDITION, not part of the contract: the user menu sits at the bottom of the
 * sidebar, where a downward panel opens off-screen. Additive — omit it and behaviour is as
 * specified.
 */

const isSeparator = (item: MenuItem): item is '-' => item === '-';

export function Menu({
  trigger,
  items = [],
  align = 'start',
  width = 200,
  side = 'bottom',
  portal = false,
  onSelect,
  className,
}: MenuProps) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  /** Trigger geometry in viewport coordinates. Only read in portal mode. */
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  // `createPortal` needs a DOM and this component renders during SSR wherever a closed menu sits.
  // Same derivation `Dialog` and `Drawer` use — `useSyncExternalStore` rather than state plus an
  // effect, so there is no cascading render for `react-hooks/set-state-in-effect` to object to.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Indices of the items that can actually be highlighted, so arrow keys skip separators and
  // disabled rows without the caller having to think about it.
  const selectable = React.useMemo(
    () =>
      items.map((item, i) => (!isSeparator(item) && !item.disabled ? i : -1)).filter((i) => i >= 0),
    [items]
  );

  const close = React.useCallback(() => {
    setOpen(false);
    setHighlight(-1);
  }, []);

  /**
   * OPENING MEASURES FIRST, and the measurement lives here rather than in an effect on purpose:
   * `react-hooks/set-state-in-effect` rejects a synchronous `setState` in an effect body, and
   * "read the trigger's box at the moment it is pressed" is an event, not a synchronisation.
   * Every path that opens the panel goes through this — pointer and keyboard alike — so there is
   * no way to reach the open state without an anchor.
   */
  const openMenu = React.useCallback(
    (highlightIndex: number) => {
      if (portal) setAnchor(rootRef.current?.getBoundingClientRect() ?? null);
      setHighlight(highlightIndex);
      setOpen(true);
    },
    [portal]
  );

  // Outside click closes — part of the contract ("closes on outside click"). `mousedown` rather
  // than `click` so the menu is gone before the click lands on whatever is underneath, which is
  // what makes "click straight through to the next control" feel right.
  //
  // THE PANEL IS CONSULTED SEPARATELY because in portal mode it is not inside `rootRef` any more.
  // Without this line a press on a menu item would read as "outside", close the panel on
  // `mousedown`, and the item's `click` would land on whatever the panel had been covering.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  /**
   * A fixed panel is positioned once and would then sit still while the page moves under it, so
   * the anchor is re-read on scroll and resize. `capture` on the scroll listener: the trigger may
   * live in a nested scroller (a sticky bar, a dialog body), and those do not bubble `scroll`.
   */
  React.useEffect(() => {
    if (!portal || !open) return;
    const measure = () => setAnchor(rootRef.current?.getBoundingClientRect() ?? null);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [portal, open]);

  const step = (delta: number) => {
    if (selectable.length === 0) return;
    const current = selectable.indexOf(highlight);
    const next =
      current < 0
        ? delta > 0
          ? 0
          : selectable.length - 1
        : (current + delta + selectable.length) % selectable.length;
    setHighlight(selectable[next]);
  };

  const select = (index: number) => {
    const item = items[index];
    if (!item || isSeparator(item) || item.disabled) return;
    close();
    item.onSelect?.();
    onSelect?.(item);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openMenu(selectable[0] ?? -1);
        else step(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openMenu(selectable[selectable.length - 1] ?? -1);
        else step(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) openMenu(-1);
        else if (highlight >= 0) select(highlight);
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          close();
        }
        break;
      case 'Tab':
        // Tabbing away is a decision to leave; the menu should not follow.
        close();
        break;
    }
  };

  const triggerNode = React.cloneElement(trigger, {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    'aria-activedescendant': open && highlight >= 0 ? `${menuId}-${highlight}` : undefined,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      trigger.props.onClick?.(event);
      if (open) close();
      else openMenu(-1);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      trigger.props.onKeyDown?.(event);
      onKeyDown(event);
    },
  } as React.HTMLAttributes<HTMLElement>);

  /**
   * The 4px offset is the same in both modes — `top-[calc(100%+4px)]` beside the trigger, or four
   * pixels off the measured edge once the panel is fixed. `right`/`bottom` are expressed as
   * distances from the far edge of the viewport, which is what `position: fixed` measures from.
   */
  const fixedPosition: React.CSSProperties | undefined =
    portal && anchor
      ? {
          position: 'fixed',
          ...(side === 'bottom'
            ? { top: anchor.bottom + 4 }
            : // `clientHeight`/`clientWidth` OF THE ROOT, NOT `window.inner*`, AND THE DIFFERENCE
              // IS THE SCROLLBAR. `position: fixed` resolves against the initial containing block,
              // which excludes a classic scrollbar; `window.innerWidth` includes it. Measured with
              // the wrong pair the panel hung 15px clear of the trigger it is anchored to on
              // Windows, and lined up perfectly on any machine with overlay scrollbars — which is
              // the worst kind of wrong, because half the people looking at it see nothing.
              { bottom: document.documentElement.clientHeight - anchor.top + 4 }),
          ...(align === 'end'
            ? { right: Math.max(0, document.documentElement.clientWidth - anchor.right) }
            : { left: Math.max(0, anchor.left) }),
        }
      : undefined;

  const panel = open && (!portal || anchor) && (
    <div
      ref={panelRef}
      id={menuId}
      role="menu"
      style={{ minWidth: width, ...fixedPosition }}
      className={cn(
        'z-40 overflow-hidden rounded-nx-md border border-nx-border-default',
        'bg-nx-surface-raised p-1 shadow-nx-2',
        // 120ms fade + 4px rise, the DS entrance. `motion-reduce` is already collapsed
        // globally by the reduced-motion block in globals.css.
        'animate-[nx-enter_var(--nx-duration-fast)_var(--ease-nx-out)]',
        // In portal mode every edge is set by `fixedPosition`; the anchored mode keeps the
        // corner classes it always had.
        portal
          ? // A long list must not run off the bottom of the screen now that nothing else
            // constrains it. `--spacing-nx-topbar` of clearance at each end is the same margin
            // the chrome already claims.
            'max-h-[calc(100dvh-2*var(--spacing-nx-topbar))] overflow-y-auto'
          : cn(
              'absolute',
              side === 'bottom' ? 'top-[calc(100%+4px)]' : 'bottom-[calc(100%+4px)]',
              align === 'end' ? 'right-0' : 'left-0'
            )
      )}
    >
      {items.map((item, index) =>
        isSeparator(item) ? (
          // R10 §3.2 EXCEPTION, read to the end of the rule: it says a small vertical margin
          // usually means a SEPARATION DEVICE is missing. Here the device is present — this
          // element IS the hairline — so the margin is its own breathing room rather than a
          // substitute for one.
          // eslint-disable-next-line no-restricted-syntax -- the hairline's own breathing room
          <div key={index} role="separator" className="my-1 h-px bg-nx-border-subtle" />
        ) : (
          <div
            key={index}
            id={`${menuId}-${index}`}
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            // Pointer selection still works; the keyboard model above is additional, not
            // exclusive. `mouseEnter` syncs the highlight so the two never disagree.
            onMouseEnter={() => !item.disabled && setHighlight(index)}
            onClick={() => select(index)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-nx-sm px-2 py-2 text-nx-ui',
              '[&>svg]:size-4 [&>svg]:shrink-0',
              item.danger ? 'text-nx-status-danger-fg' : 'text-nx-text-primary',
              item.disabled && 'pointer-events-none opacity-50',
              highlight === index &&
                (item.danger ? 'bg-nx-status-danger-bg' : 'bg-nx-surface-hover')
            )}
          >
            {item.icon && (
              <span className="shrink-0 [&>svg]:size-4" aria-hidden>
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.meta && (
              <span className="shrink-0 font-mono text-nx-micro text-nx-text-faint">
                {item.meta}
              </span>
            )}
          </div>
        )
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      {triggerNode}
      {portal ? isClient && panel && createPortal(panel, document.body) : panel}
    </div>
  );
}
