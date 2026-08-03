'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Keyboard-first launcher: type to filter a list of actions, arrows to move, Enter to run.
 *
 * IT KNOWS NO DOMAINS, AND THAT IS WHY IT IS IN `shared/`. It takes `actions` and runs the one you
 * pick. The app shell supplies the routes; `features/search` supplies the "search everywhere"
 * action. Putting the route list inside this file — or inside `features/search`, the other
 * tempting home — would give one module a hardcoded map of every other domain's URLs, which is
 * exactly the cross-domain bucket CLAUDE.md §4 exists to prevent.
 *
 * NO DESIGN SYSTEM SPECIMEN EXISTS FOR THIS. `components/overlays/` is Dialog, Menu, Toast,
 * Tooltip; there is no palette, launcher or combobox anywhere in the DS, and no guideline page
 * about one. Recorded as ds-deviation #30. It is composed from the same tokens as `Dialog` (same
 * scrim, same radius, same `shadow-nx-3`) so it reads as a member of the same overlay family
 * rather than as a stranger.
 *
 * THE KEYBOARD MODEL IS THE OPPOSITE OF `Menu`'s, deliberately. `Menu` keeps focus on its trigger
 * and moves a highlight; a palette's whole point is that you are typing, so focus lives in the
 * input and the highlighted row is pointed at with `aria-activedescendant`. Both are correct for
 * their own component — do not "unify" them.
 *
 * IT SITS HIGH, NOT CENTRED (`items-start` + a top offset). A centred panel jumps as the filtered
 * list grows and shrinks under the caret; anchoring the input near the top keeps the one element
 * you are actually looking at still.
 */

export interface CommandAction {
  id: string;
  label: string;
  /** Extra words that should match this action without being displayed. */
  keywords?: string;
  /** 14–16px glyph. */
  icon?: React.ReactNode;
  /** Right-aligned mono hint. */
  meta?: string;
  /** Group heading this action appears under. Actions with no section come first. */
  section?: string;
  /**
   * Skip filtering and always show this action last, with the raw query available.
   * Used for "search everywhere for …", which by definition matches nothing in the list.
   */
  alwaysShow?: boolean;
  onRun: (query: string) => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
  placeholder?: string;
  /** Shown when the query matches nothing. */
  emptyLabel?: string;
  /** Accessible name for the dialog. */
  label: string;
}

/** Diacritic-insensitive, case-insensitive contains. */
function normalise(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * THE OPEN/CLOSED SPLIT IS DELIBERATE AND LOAD-BEARING, not an accident of file layout.
 *
 * The outer component owns nothing but "should this exist"; the panel below owns the query and the
 * highlight. Because the panel is unmounted while closed, `useState('')` IS the reset — reopening
 * mounts a fresh one with an empty field. Written the obvious way instead (one component, an
 * effect that clears state when `open` flips true) it fails `react-hooks/set-state-in-effect`, and
 * the rule is right: that effect renders once with the stale query still on screen, then again
 * with it cleared. Mounting fresh has no first frame to get wrong.
 */
export function CommandPalette({ open, ...props }: CommandPaletteProps) {
  // Same client-detection derivation as `Dialog`/`Drawer`: portals need a DOM, and this renders
  // during SSR on every page. See `dialog.tsx` for why it is `useSyncExternalStore` and not
  // `useState` + `useEffect`.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!isClient || !open) return null;
  return <CommandPalettePanel {...props} />;
}

function CommandPalettePanel({
  onClose,
  actions,
  placeholder,
  emptyLabel,
  label,
}: Omit<CommandPaletteProps, 'open'>) {
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(0);
  const listId = React.useId();

  // Matching is diacritic-insensitive because the backend's own search is (`unaccent` on both
  // sides), and a palette that demanded "lộ trình" while the search page accepted "lo trinh"
  // would be the app disagreeing with itself.
  const visible = React.useMemo(() => {
    const q = normalise(query.trim());
    return actions.filter((action) => {
      if (action.alwaysShow) return q.length > 0;
      if (!q) return true;
      return normalise(`${action.label} ${action.keywords ?? ''}`).includes(q);
    });
  }, [actions, query]);

  // The page behind must not scroll while the palette owns the screen — same contract as `Dialog`.
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const run = (action: CommandAction | undefined) => {
    if (!action) return;
    onClose();
    action.onRun(query.trim());
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlight((h) => (visible.length ? (h + 1) % visible.length : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlight((h) => (visible.length ? (h - 1 + visible.length) % visible.length : 0));
        break;
      case 'Enter':
        // The IME guard `SearchBar` needs applies here too: accepting a telex candidate sends an
        // Enter, which would otherwise run whatever is highlighted mid-word.
        if ((event.nativeEvent as KeyboardEvent).isComposing) return;
        event.preventDefault();
        run(visible[highlight]);
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  };

  // Section headings are derived from the list order rather than from a separate grouping prop:
  // the caller already has to order the actions, and a second source for grouping is a second
  // thing to keep in step.
  let lastSection: string | undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-nx-surface-overlay p-4 pt-[12vh]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'flex w-full max-w-[560px] flex-col overflow-hidden rounded-nx-lg',
          'border border-nx-border-default bg-nx-surface-card shadow-nx-3',
          'animate-[nx-enter_var(--nx-duration-fast)_var(--ease-nx-out)]'
        )}
      >
        <div className="flex items-center gap-2 border-b border-nx-border-subtle px-3">
          <Search className="size-4 shrink-0 text-nx-text-muted" aria-hidden />
          <input
            // The input is the point of the component, so focus goes there rather than to the
            // panel. `autoFocus` is safe here in a way it is not on a page: this element only
            // exists because someone just asked for it.
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // Reset in the handler, not an effect: a highlight left pointing past the end of a
              // newly filtered list would make Enter run nothing (or the wrong row).
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={label}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={visible[highlight] ? `${listId}-${highlight}` : undefined}
            className={cn(
              'h-11 flex-1 bg-transparent text-nx-body text-nx-text-primary outline-none',
              'placeholder:text-nx-text-faint'
            )}
          />
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="max-h-[50vh] overflow-y-auto p-1"
        >
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-nx-body-sm text-nx-text-muted">{emptyLabel}</p>
          ) : (
            visible.map((action, index) => {
              const heading = action.section !== lastSection ? action.section : undefined;
              lastSection = action.section;
              return (
                <React.Fragment key={action.id}>
                  {heading && (
                    <div className="px-2 pb-1 pt-2 text-nx-micro font-semibold uppercase tracking-wide text-nx-text-muted">
                      {heading}
                    </div>
                  )}
                  <div
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={highlight === index}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => run(action)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-nx-sm px-2 py-2 text-nx-ui',
                      'text-nx-text-primary',
                      highlight === index && 'bg-nx-surface-hover'
                    )}
                  >
                    {action.icon && (
                      <span className="shrink-0 text-nx-text-muted [&>svg]:size-4" aria-hidden>
                        {action.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{action.label}</span>
                    {action.meta && (
                      <span className="shrink-0 font-mono text-nx-micro text-nx-text-faint">
                        {action.meta}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
