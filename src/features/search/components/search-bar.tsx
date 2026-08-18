'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, User, X } from 'lucide-react';
import { Avatar, Input } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { MIN_QUERY_LENGTH, useSuggestions } from '../hooks';

/**
 * The app shell's search field.
 *
 * SUBMIT-ON-ENTER, NOT SEARCH-AS-YOU-TYPE. Every keystroke would be a database query — the
 * backend runs `unaccent(...) LIKE` over three tables with no index behind it — and the result
 * would still need somewhere to be shown. This stays the behaviour it replaces (Guardrail C).
 *
 * THE COMMAND PALETTE SHIPPED AT P3.4 AND DID NOT CHANGE THAT. It filters a static list of routes
 * with no request at all, and its one non-navigation action submits into `/search` exactly as this
 * field does. So the app still issues one search per deliberate submit, not one per keystroke.
 *
 * That is also why the debounce helpers the legacy module carried are gone rather than migrated:
 * `useDebouncedValue` and `useDebouncedSearch` had **zero** callers, and dead code is deleted
 * outright rather than moved (CLAUDE.md Constraint #2). Search-as-you-type will need debouncing
 * on the day it exists, written against that caller.
 */
export interface SearchBarProps {
  className?: string;
  /**
   * Keyboard hint rendered INSIDE the field, at its trailing edge — `⌘K` / `Ctrl K`.
   *
   * It lives here rather than beside the field because the design puts it there, and the reason
   * is that the hint is about THIS control: a chip floating next to the field names a shortcut
   * whose target the reader has to guess. Passed in rather than hardcoded because the shortcut
   * belongs to the shell (which owns the palette and the key binding), not to search.
   */
  shortcutLabel?: string;
  /**
   * Makes the hint clickable. See the note at the render site for why it is a real button and not
   * the `kbd` the kit draws.
   */
  onShortcutClick?: () => void;
  shortcutAriaLabel?: string;
}

export function SearchBar({
  className,
  shortcutLabel,
  onShortcutClick,
  shortcutAriaLabel,
}: SearchBarProps) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * THE DROPDOWN IS DEBOUNCED HERE, not in the hook — this component owns the keyboard, so it
   * owns the timing. `GET /search/suggest` is documented as per-keystroke, but firing on literally
   * every character keeps a request in flight for terms nobody finished typing; 200ms is under the
   * threshold where a dropdown feels laggy and above the one where every letter costs a round trip.
   */
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), 200);
    return () => clearTimeout(id);
  }, [value]);

  const { data: suggestions } = useSuggestions(debounced);
  const rows = open && value.trim().length >= MIN_QUERY_LENGTH ? (suggestions ?? []) : [];

  /**
   * A USER ROW LINKS BY HANDLE, NOT BY ID, and that is why it can be missing. `/u/{username}` is
   * keyed by username while the suggestion carries the user's id; the handle only arrives as
   * `sublabel`, already `@`-prefixed by the server, and is null for accounts that never set one
   * (the column is nullable and registration does not fill it). A row with no handle still shows —
   * it is a real search hit — but it submits the search instead of navigating to a 404.
   *
   * A BOOK ROW NOW LANDS ON THE BOOK. It used to push `/library`, which is the catalogue the
   * reader was trying to skip: they had named one book and the app handed them every book and
   * asked them to find it again by eye. `/books/{id}` exists now, and `id` is on the row.
   */
  const go = (row: { type?: string; id?: number; sublabel?: string }) => {
    setOpen(false);
    if (row.type === 'BOOK') {
      // The catalogue stays the fallback for the one row that somehow arrives without an id —
      // that is still closer than doing nothing, and it is where the book would be listed.
      router.push(row.id != null ? `/books/${row.id}` : '/library');
      return;
    }
    const handle = row.sublabel?.replace(/^@/, '');
    if (handle) router.push(`/u/${encodeURIComponent(handle)}`);
    else submit();
  };

  const submit = () => {
    const trimmed = value.trim();
    // Same floor the query hook enforces, so the bar never navigates to a page that will refuse
    // to search. Silent by design: a validation message under the shell's search field would be
    // shouting about a term the user is still in the middle of typing.
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // `isComposing` guards the IME the same way `MessageComposer` does: typing Vietnamese with
      // telex/VNI sends an Enter to accept a candidate, and without this that Enter would search
      // for a half-finished word.
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      // Escape closes the dropdown first and only blurs when there is none — otherwise dismissing
      // a suggestion list would also throw away the field the person is still typing in.
      if (open && rows.length > 0) setOpen(false);
      else inputRef.current?.blur();
    }
  };

  const clear = () => {
    setValue('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // `mousedown` on a row fires before `blur`, so the click still lands; the timeout is only
        // for the case where focus leaves the field entirely.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
        // `md` (34), not `lg` (40): the kit's search field measures 34 tall — the same row height
        // as a `md` button, which is what sits beside it in the bar. At `lg` this field was 6px
        // taller than every other control on the same 56px row.
        size="md"
        prefix={<Search className="size-4" />}
        /**
         * The clear button is NOT passed as `suffix`.
         *
         * `Input` renders its adornments inside an `aria-hidden` span — right for the decorative
         * icons the DS models there, wrong for a control, which would become invisible to screen
         * readers while still taking a tab stop. So it is positioned over the field instead, and
         * `pr-9` reserves the space so the text never runs underneath it.
         */
        className={cn((value || shortcutLabel) && 'pr-9')}
      />

      {/**
       * THE HINT IS A BUTTON, THOUGH THE KIT DRAWS A `kbd` — deviation #44, and it is the whole
       * reason the separate `Ctrl K` button next to the field could be removed.
       *
       * A `kbd` is inert. Moving the hint inside the field as pure decoration would have left the
       * command palette reachable ONLY by keyboard, so a mouse-only reader loses a surface that
       * currently has a visible control. Same pixels as the kit, one extra capability, and no
       * second chip in the bar.
       *
       * It is NOT passed as `Input`'s `suffix`: that slot renders inside an `aria-hidden` span,
       * which is right for decoration and wrong for a control — it would be invisible to a screen
       * reader while still taking a tab stop. Positioned over the field instead, exactly like the
       * clear button, with `pr-9` reserving the space.
       *
       * IT YIELDS TO THE CLEAR BUTTON once there is a value: two controls cannot share one corner,
       * and a shortcut hint matters least at the moment someone is mid-query.
       */}
      {!value && shortcutLabel && (
        <button
          type="button"
          onClick={onShortcutClick}
          aria-label={shortcutAriaLabel ?? shortcutLabel}
          className={cn(
            // 11px mono, 1px border, `1px 4px` of padding, radius 4 — the kit's own values. The
            // rendered chip is wider than the kit's because the label is `Ctrl K` rather than
            // `⌘K`; the app names the key the reader's platform actually has.
            'absolute top-1/2 right-2.5 -translate-y-1/2 rounded-nx-xs border border-nx-border-default px-1 py-0.5',
            'font-mono text-nx-micro text-nx-text-faint',
            'hover:border-nx-border-strong hover:text-nx-text-muted',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          {shortcutLabel}
        </button>
      )}

      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label={t('search.clear')}
          className={cn(
            'absolute top-1/2 right-2.5 grid size-5 -translate-y-1/2 place-items-center',
            'rounded-nx-xs text-nx-text-muted hover:text-nx-text-primary',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          <X className="size-4" />
        </button>
      )}

      {/**
       * THE DROPDOWN. It sits under the field rather than replacing the results page: a suggestion
       * is a shortcut to ONE thing, and Enter still runs the full search — the two answer different
       * questions and the endpoint split says so (the results page ranks friends first, counts
       * hits and hydrates posts; none of that happens here).
       *
       * PEOPLE AND BOOKS ONLY, because those are the only things with a short label to complete.
       * There are no post suggestions and this must not invent any.
       *
       * `onMouseDown` RATHER THAN `onClick`: the field's `blur` would close this list before a
       * click could land on it, and `mousedown` fires first.
       */}
      {rows.length > 0 && (
        <ul
          className={cn(
            'absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-nx-md',
            'border border-nx-border-default bg-nx-surface-raised py-1 shadow-nx-2'
          )}
        >
          {rows.map((row) => (
            <li key={`${row.type}-${row.id}`}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  go(row);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left',
                  'hover:bg-nx-surface-hover',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
                )}
              >
                {row.type === 'USER' ? (
                  <Avatar src={row.imageUrl} name={row.label} size="sm" />
                ) : (
                  // A book cover is not an avatar: square, not a circle, and a glyph rather than
                  // initials when there is no cover — initials on a book title read as a person.
                  <span className="grid size-6 shrink-0 place-items-center rounded-nx-xs bg-nx-surface-sunken text-nx-text-faint">
                    <BookOpen className="size-3.5" aria-hidden />
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-nx-ui text-nx-text-primary">
                    {row.label}
                  </span>
                  {row.sublabel && (
                    <span className="block truncate font-mono text-nx-caption text-nx-text-muted">
                      {row.sublabel}
                    </span>
                  )}
                </span>

                {/* Says which kind of thing the row is, because the two navigate to different
                    places and the icon alone is easy to skim past. */}
                <span className="shrink-0 text-nx-text-faint" aria-hidden>
                  {row.type === 'USER' ? <User className="size-3.5" /> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
