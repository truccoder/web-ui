'use client';

import * as React from 'react';
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
 * The panel is NOT portalled, unlike `Dialog`. A menu is anchored to its trigger, so it has to
 * live in the trigger's stacking context to stay put when the page scrolls; a modal owns the whole
 * screen and has the opposite requirement.
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
  onSelect,
  className,
}: MenuProps) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

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

  // Outside click closes — part of the contract ("closes on outside click"). `mousedown` rather
  // than `click` so the menu is gone before the click lands on whatever is underneath, which is
  // what makes "click straight through to the next control" feel right.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

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
        if (!open) {
          setOpen(true);
          setHighlight(selectable[0] ?? -1);
        } else step(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(selectable[selectable.length - 1] ?? -1);
        } else step(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) setOpen(true);
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
      setOpen((v) => !v);
      setHighlight(-1);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      trigger.props.onKeyDown?.(event);
      onKeyDown(event);
    },
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      {triggerNode}

      {open && (
        <div
          id={menuId}
          role="menu"
          style={{ minWidth: width }}
          className={cn(
            'absolute z-40 overflow-hidden rounded-nx-md border border-nx-border-default',
            'bg-nx-surface-raised p-1 shadow-nx-2',
            // 120ms fade + 4px rise, the DS entrance. `motion-reduce` is already collapsed
            // globally by the reduced-motion block in globals.css.
            'animate-[nx-enter_var(--nx-duration-fast)_var(--ease-nx-out)]',
            side === 'bottom' ? 'top-[calc(100%+4px)]' : 'bottom-[calc(100%+4px)]',
            align === 'end' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, index) =>
            isSeparator(item) ? (
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
                  'flex cursor-pointer items-center gap-2 rounded-nx-sm px-2 py-1.5 text-nx-ui',
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
      )}
    </div>
  );
}
