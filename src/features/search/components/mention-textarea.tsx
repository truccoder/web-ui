'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Hash, TrendingUp } from 'lucide-react';
import { Avatar, Textarea, type TextareaProps } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import {
  findHashtagQuery,
  normalizeHashtag,
  useHashtagSuggest,
  useHashtagTrending,
  type Hashtag,
} from '@/features/hashtags';
import { useT } from '@/core/i18n';
import { useMentionSuggestions } from '../hooks';
import type { MentionSuggestion } from '../types';

/**
 * Finds the `@`-mention being typed right before `caret`, if any.
 *
 * Mirrors the backend's own trigger, `MentionScanner.MENTION` (`(?<![^\s])@(handle)`): the `@`
 * must sit at the start of the text or right after whitespace, or `me@example.com` would open a
 * dropdown mid-email. Unlike the backend pattern this matches a PARTIAL, unfinished handle (zero
 * to 29 characters) — the dropdown has to open on the keystroke that types `@` itself.
 */
export function findMentionQuery(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const upToCaret = text.slice(0, caret);
  const match = /(?:^|\s)@([a-zA-Z0-9_-]{0,29})$/.exec(upToCaret);
  if (!match) return null;
  return { start: caret - match[1].length - 1, query: match[1] };
}

/**
 * A `<textarea>` with a friends-first `@`-mention dropdown (`GET /v1/api/search/mentions`) and,
 * where the caller opts in, a `#`-hashtag dropdown (`GET /v1/api/hashtags/suggest`).
 *
 * LIFTED OUT OF `comment-composer.tsx`, where this was ~150 inline lines, so the post composer's
 * "tag friends" typeahead is the same control rather than a second copy that drifts. The comment
 * box keeps its own submit/cancel keyboard rules by passing `onKeyDown` — this component runs its
 * typeahead navigation FIRST and only forwards a key it did not consume.
 *
 * TWO TRIGGERS, ONE OPEN DROPDOWN. `@` and `#` cannot both match at the same caret (each pattern
 * ends with its own sigil plus the word under the caret), so at most one menu is ever open; the
 * arrow / enter / escape keys and the single highlight index are shared between them.
 *
 * `mentionsDisabled` turns the `@` dropdown off entirely (still an ordinary textarea): the post
 * composer sets it when `visibility === 'PRIVATE'`, where the backend rejects tags outright.
 * `hashtagSuggestions` turns the `#` dropdown ON — it is off by default because only the post
 * composer wants it: the backend extracts `#tags` from a *post's* content, not from a comment's.
 *
 * THE DROPDOWN IS PORTALLED to `document.body` and positioned `fixed` off the field's measured
 * rect (see the note by `anchor`). It used to be an `absolute` child of the field, which the post
 * composer's `Dialog` — a `maxHeight` panel whose body is `overflow-y-auto` — clipped down to a
 * two-row sliver. Floating it out of that scroller is what lets the full suggestion list show.
 */
export interface MentionTextareaProps extends Omit<TextareaProps, 'value' | 'onChange' | 'ref'> {
  value: string;
  onChange: (value: string) => void;
  /** Fired when a row is chosen from the `@` dropdown — the caller can record `{ id, username }`. */
  onMentionPicked?: (row: MentionSuggestion) => void;
  /** Fired when a row is chosen from the `#` dropdown. */
  onHashtagPicked?: (row: Hashtag) => void;
  /** Suppress the `@` dropdown; the field still edits text normally. @default false */
  mentionsDisabled?: boolean;
  /** Enable the `#`-hashtag typeahead. @default false */
  hashtagSuggestions?: boolean;
  /** Extra classes for the wrapper around the field. The dropdown is portalled, not nested. */
  containerClassName?: string;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionPicked,
  onHashtagPicked,
  mentionsDisabled = false,
  hashtagSuggestions = false,
  containerClassName,
  onKeyDown,
  onBlur,
  ...textareaProps
}: MentionTextareaProps) {
  const t = useT();

  /**
   * The spans ARE LIVE, updated on every keystroke — they decide which slice of `value` gets
   * replaced on selection. The debounced copies are the network-facing ones, 200ms behind.
   */
  const [mentionSpan, setMentionSpan] = useState<{ start: number; query: string } | null>(null);
  const [hashtagSpan, setHashtagSpan] = useState<{ start: number; query: string } | null>(null);
  const [debouncedMention, setDebouncedMention] = useState('');
  const [debouncedHashtag, setDebouncedHashtag] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /**
   * The dropdown is PORTALLED into `document.body` so a clipping ancestor cannot cut it off — the
   * post composer runs this field inside a `Dialog` whose `maxHeight` body is `overflow-y-auto`,
   * and an `absolute` list inside that scroller was being shaved down to a two-row sliver. Same
   * escape hatch, and the same measured-anchor bookkeeping, as `Menu`'s `portal` mode: render at
   * `position: fixed` from the field's rect, re-read on scroll (capture — the field sits in a
   * nested scroller) and on resize while a menu is open.
   */
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  // `createPortal` needs a DOM, and this renders during SSR wherever a closed composer sits. Same
  // derivation `Dialog` and `Menu` use in place of state-plus-effect.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const id = setTimeout(() => setDebouncedMention(mentionSpan?.query ?? ''), 200);
    return () => clearTimeout(id);
  }, [mentionSpan?.query]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedHashtag(hashtagSpan?.query ?? ''), 200);
    return () => clearTimeout(id);
  }, [hashtagSpan?.query]);

  const mentionActive = !mentionsDisabled && mentionSpan !== null;
  const hashtagActive = hashtagSuggestions && hashtagSpan !== null;

  const { data: mentionData } = useMentionSuggestions(debouncedMention, mentionActive);

  /**
   * TWO LISTS BEHIND THE `#`, THE SAME SPLIT `HashtagSearchBox` MAKES. `GET /hashtags/suggest`
   * needs a prefix — a bare `#` folds to nothing and it returns `[]` — so an empty `#` shows the
   * week's popular tags (`GET /hashtags/trending`) instead, which is what makes `#` open a menu
   * the instant it is typed, the way `@` does. `useHashtagSuggest` disables itself on a blank
   * query; `trending` is held back unless a bare `#` is actually open.
   */
  const hashtagPrefix = normalizeHashtag(hashtagActive ? debouncedHashtag : '');
  const typingHashtag = hashtagPrefix !== null;
  const { data: hashtagSuggestData } = useHashtagSuggest(hashtagActive ? debouncedHashtag : '');
  const { data: hashtagTrendingData } = useHashtagTrending(
    'week',
    8,
    hashtagActive && !typingHashtag
  );

  const mentionRows = mentionActive ? (mentionData ?? []) : [];
  const hashtagRows = !hashtagActive
    ? []
    : typingHashtag
      ? (hashtagSuggestData ?? [])
      : (hashtagTrendingData ?? []);

  // Which menu, if any, currently has rows to show. `@` wins if both somehow have rows at once.
  const menuKind: 'mention' | 'hashtag' | null =
    mentionRows.length > 0 ? 'mention' : hashtagRows.length > 0 ? 'hashtag' : null;
  const activeRows: Array<MentionSuggestion | Hashtag> =
    menuKind === 'mention' ? mentionRows : menuKind === 'hashtag' ? hashtagRows : [];
  const highlight = activeRows.length > 0 ? highlightIndex % activeRows.length : 0;

  const menuOpen = menuKind !== null;

  /**
   * Measure the field the instant a menu opens, then keep the fixed panel pinned to it as the
   * page (or the dialog body it sits in) scrolls. `capture` on the scroll listener because a
   * nested scroller does not bubble `scroll`.
   */
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const measure = () =>
      setAnchor(wrapperRef.current?.querySelector('textarea')?.getBoundingClientRect() ?? null);
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [menuOpen]);

  /**
   * Swap the `@…` / `#…` slice under the caret for `inserted`, then put the caret back after it.
   * The DOM has not re-rendered with the new value yet — restoring the caret waits for that
   * commit, same reason `onBlur`'s dropdown-close uses a `setTimeout(0)`.
   */
  const replaceSpan = (span: { start: number; query: string }, inserted: string) => {
    const before = value.slice(0, span.start);
    const after = value.slice(span.start + 1 + span.query.length);
    onChange(before + inserted + after);

    const caret = before.length + inserted.length;
    setTimeout(() => {
      const el = wrapperRef.current?.querySelector('textarea');
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    }, 0);
  };

  const selectMention = (row: MentionSuggestion) => {
    if (!mentionSpan || !row.username) return;
    replaceSpan(mentionSpan, `@${row.username} `);
    setMentionSpan(null);
    onMentionPicked?.(row);
  };

  const selectHashtag = (row: Hashtag) => {
    if (!hashtagSpan || !row.tag) return;
    replaceSpan(hashtagSpan, `#${row.tag} `);
    setHashtagSpan(null);
    onHashtagPicked?.(row);
  };

  const commitHighlighted = () => {
    if (menuKind === 'mention') selectMention(mentionRows[highlight]);
    else if (menuKind === 'hashtag') selectHashtag(hashtagRows[highlight]);
  };

  const closeMenus = () => {
    setMentionSpan(null);
    setHashtagSpan(null);
  };

  // `z-[60]` clears the `Dialog` panel (`z-50`); `shadow-nx-3` is the elevation the design system
  // gives a surface that floats above another one, so the list reads as lifted off the composer
  // rather than buried in it. Position comes from `dropdownStyle` — `fixed`, off the measured rect.
  const dropdownClass =
    'z-[60] max-h-72 overflow-y-auto rounded-nx-md border border-nx-border-default bg-nx-surface-raised py-1 shadow-nx-3';
  const dropdownStyle: CSSProperties | undefined = anchor
    ? { position: 'fixed', top: anchor.bottom + 4, left: anchor.left, width: anchor.width }
    : undefined;

  return (
    <div ref={wrapperRef} className={containerClassName}>
      <Textarea
        {...textareaProps}
        value={value}
        onChange={(event) => {
          const el = event.target;
          onChange(el.value);
          const caret = el.selectionStart ?? el.value.length;
          setMentionSpan(mentionsDisabled ? null : findMentionQuery(el.value, caret));
          setHashtagSpan(hashtagSuggestions ? findHashtagQuery(el.value, caret) : null);
          setHighlightIndex(0);
        }}
        onBlur={(event) => {
          // A row's own `onMouseDown` calls `preventDefault`, keeping focus on the textarea, so
          // this never fires for a click that is actually a selection.
          setTimeout(closeMenus, 120);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          // The open dropdown takes the arrow / enter / escape keys, ahead of whatever the caller
          // bound for the same keys.
          if (menuKind && activeRows.length > 0) {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlightIndex((h) => (h + 1) % activeRows.length);
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightIndex((h) => (h - 1 + activeRows.length) % activeRows.length);
              return;
            }
            if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
              event.preventDefault();
              commitHighlighted();
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              closeMenus();
              return;
            }
          }
          onKeyDown?.(event);
        }}
      />

      {/**
       * BOTH LISTS ARE PORTALLED to `document.body` and positioned `fixed` off the field's rect —
       * see the note by `anchor`. `onMouseDown` rather than `onClick`: the textarea's blur fires
       * before `click` and would close the list before a click could land; `preventDefault` there
       * keeps focus on the textarea even though the row now lives outside its DOM subtree. The
       * divider is drawn only where the friend / non-friend split actually happens.
       */}
      {isClient &&
        anchor &&
        menuKind === 'mention' &&
        createPortal(
          <ul className={dropdownClass} style={dropdownStyle}>
            {mentionRows.map((row, index) => (
              <li key={row.id}>
                {index > 0 && mentionRows[index - 1].isFriend && !row.isFriend && (
                  <div className="my-1 h-px bg-nx-border-subtle" />
                )}
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectMention(row);
                  }}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-2 text-left',
                    index === highlight ? 'bg-nx-surface-hover' : 'hover:bg-nx-surface-hover'
                  )}
                >
                  <Avatar src={row.profilePictureUrl} name={row.fullName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-nx-ui text-nx-text-primary">
                      {row.fullName}
                    </span>
                    <span className="block truncate font-mono text-nx-caption text-nx-text-muted">
                      @{row.username}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}

      {/* The `#` list mirrors `HashtagSearchBox`'s rows — the tag on the left, its running usage
          count on the right — so a tag looks the same wherever it is completed. */}
      {isClient &&
        anchor &&
        menuKind === 'hashtag' &&
        createPortal(
          <ul className={dropdownClass} style={dropdownStyle}>
            {/* Names the list when it is the "nothing typed yet" one — the rows are popular tags,
                not completions of what was typed, and without the label that is not obvious. */}
            {!typingHashtag && (
              <li
                aria-hidden
                className="flex items-center gap-1 px-2.5 py-1 text-nx-micro font-medium tracking-wide text-nx-text-faint uppercase"
              >
                <TrendingUp className="size-3" />
                {t('hashtags.search.trendingLabel')}
              </li>
            )}
            {hashtagRows.map((row, index) => (
              <li key={row.tag}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectHashtag(row);
                  }}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-2 text-left',
                    index === highlight ? 'bg-nx-surface-hover' : 'hover:bg-nx-surface-hover'
                  )}
                >
                  <Hash className="size-4 shrink-0 text-nx-text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-nx-ui text-nx-text-primary">
                    {row.tag}
                  </span>
                  <span className="shrink-0 text-nx-caption text-nx-text-muted tabular-nums">
                    {t('hashtags.postCount', { count: row.postCount })}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
