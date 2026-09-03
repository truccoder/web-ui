'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Hash, TrendingUp } from 'lucide-react';
import { Input } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useHashtagSuggest, useHashtagTrending } from '../hooks/use-hashtags';
import { normalizeHashtag } from '../lib/normalize';
import type { Hashtag } from '../types/hashtag';

/**
 * The search box that completes a `#` and shows the tags people actually use — B31.
 *
 * TWO LISTS BEHIND ONE FIELD. With nothing typed the dropdown is `GET /hashtags/trending` (the
 * week's most-used tags); the moment the reader types, it switches to `GET /hashtags/suggest` for
 * that prefix. The endpoints were split for that reason — "what's popular" and "complete what I've
 * started" are different questions — so this does not fake one with the other.
 *
 * IT DOES NOT NAVIGATE ITSELF. Selecting a row calls `onSelect(tag)` with the folded name; the
 * page owns what that means (it points `/newsfeed?tab=posts&hashtag=` at it). Same split as the
 * `/search` page and `SearchResults`.
 *
 * MODELLED ON `SearchBar`: debounce lives here because this component owns the keyboard,
 * `onMouseDown` beats the field's `blur`, and the blur close is on a timeout so a click on a row
 * still lands.
 */
export interface HashtagSearchBoxProps {
  /** Called with the folded tag name (no `#`, lower-case) when a row is chosen. */
  onSelect: (tag: string) => void;
  /** The tag currently applied upstream, if any — shown as the field's placeholder hint. */
  activeTag?: string | null;
  className?: string;
  autoFocus?: boolean;
}

export function HashtagSearchBox({
  onSelect,
  activeTag,
  className,
  autoFocus = false,
}: HashtagSearchBoxProps) {
  const t = useT();
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // 200ms: under the threshold where a dropdown feels laggy, over the one where every letter is a
  // round trip. Same figure as `SearchBar`.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), 200);
    return () => clearTimeout(id);
  }, [value]);

  const typing = normalizeHashtag(value) !== null;
  const trending = useHashtagTrending('week');
  const suggest = useHashtagSuggest(debounced);

  const rows: Hashtag[] = (typing ? suggest.data : trending.data) ?? [];
  const showList = open && rows.length > 0;

  // The keyboard cursor is reset by the handlers that change the list (typing, focus) rather than
  // by an effect watching them; this clamp is the safety net for the frame where a shorter list
  // has landed but no handler has fired, so a stale index never highlights the wrong row.
  const cursor = activeIndex < rows.length ? activeIndex : -1;

  const choose = (tag: string) => {
    const folded = normalizeHashtag(tag);
    if (!folded) return;
    setValue('');
    setOpen(false);
    inputRef.current?.blur();
    onSelect(folded);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'ArrowDown' && showList) {
      event.preventDefault();
      setActiveIndex((cursor + 1) % rows.length);
    } else if (event.key === 'ArrowUp' && showList) {
      event.preventDefault();
      setActiveIndex(cursor <= 0 ? rows.length - 1 : cursor - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // A highlighted row wins; otherwise the raw text, if it folds to anything, is itself a
      // perfectly good tag to browse — the reader typed an exact name and pressed Enter.
      if (cursor >= 0 && rows[cursor]) choose(rows[cursor].tag);
      else if (typing) choose(value);
    } else if (event.key === 'Escape') {
      if (open && showList) setOpen(false);
      else inputRef.current?.blur();
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={
          activeTag
            ? t('hashtags.search.placeholderActive', { tag: activeTag })
            : t('hashtags.search.placeholder')
        }
        aria-label={t('hashtags.search.placeholder')}
        size="md"
        prefix={<Hash className="size-4" />}
      />

      {showList && (
        <div
          className={cn(
            'absolute top-full right-0 left-0 z-40 mt-1 overflow-hidden rounded-nx-md',
            'border border-nx-border-default bg-nx-surface-raised py-1 shadow-nx-2'
          )}
        >
          {/* The header names which list this is, because the two answer different questions and
              the rows look identical. Only shown for trending — a prefix list needs no label. */}
          {!typing && (
            <p className="flex items-center gap-1 px-2.5 py-1 text-nx-micro font-medium tracking-wide text-nx-text-faint uppercase">
              <TrendingUp className="size-3" aria-hidden />
              {t('hashtags.search.trendingLabel')}
            </p>
          )}
          <ul>
            {rows.map((row, index) => (
              <li key={row.tag}>
                <button
                  type="button"
                  // `mousedown`, not `click`: the field's blur would close this list first.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(row.tag);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-2.5 py-2 text-left',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
                    index === cursor ? 'bg-nx-surface-hover' : 'hover:bg-nx-surface-hover'
                  )}
                >
                  <Hash className="size-3.5 shrink-0 text-nx-text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-nx-ui text-nx-text-primary">
                    {row.tag}
                  </span>
                  <span className="shrink-0 text-nx-caption text-nx-text-muted tabular-nums">
                    {t('hashtags.postCount', { count: row.postCount })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
