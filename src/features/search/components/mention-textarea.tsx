'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, Textarea, type TextareaProps } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
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
 * A `<textarea>` with a friends-first `@`-mention dropdown (`GET /v1/api/search/mentions`).
 *
 * LIFTED OUT OF `comment-composer.tsx`, where this was ~150 inline lines, so the post composer's
 * "tag friends" typeahead is the same control rather than a second copy that drifts. The comment
 * box keeps its own submit/cancel keyboard rules by passing `onKeyDown` — this component runs its
 * mention navigation FIRST and only forwards a key it did not consume.
 *
 * `mentionsDisabled` turns the dropdown off entirely (still an ordinary textarea): the post
 * composer sets it when `visibility === 'PRIVATE'`, where the backend rejects tags outright.
 */
export interface MentionTextareaProps extends Omit<TextareaProps, 'value' | 'onChange' | 'ref'> {
  value: string;
  onChange: (value: string) => void;
  /** Fired when a row is chosen from the dropdown — the caller can record `{ id, username }`. */
  onMentionPicked?: (row: MentionSuggestion) => void;
  /** Suppress the dropdown; the field still edits text normally. @default false */
  mentionsDisabled?: boolean;
  /** Wrapper around the field + dropdown (needs `position: relative`, applied here). */
  containerClassName?: string;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionPicked,
  mentionsDisabled = false,
  containerClassName,
  onKeyDown,
  onBlur,
  ...textareaProps
}: MentionTextareaProps) {
  /**
   * `mentionSpan` IS LIVE, updated on every keystroke — it decides which slice of `value` gets
   * replaced on selection. `debouncedQuery` is the network-facing copy, 200ms behind.
   */
  const [mentionSpan, setMentionSpan] = useState<{ start: number; query: string } | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(mentionSpan?.query ?? ''), 200);
    return () => clearTimeout(id);
  }, [mentionSpan?.query]);

  const active = !mentionsDisabled && mentionSpan !== null;
  const { data: mentionRows } = useMentionSuggestions(debouncedQuery, active);
  const rows = active ? (mentionRows ?? []) : [];
  const highlight = rows.length > 0 ? highlightIndex % rows.length : 0;

  const selectMention = (row: MentionSuggestion) => {
    if (!mentionSpan || !row.username) return;
    const before = value.slice(0, mentionSpan.start);
    const after = value.slice(mentionSpan.start + 1 + mentionSpan.query.length);
    const inserted = `@${row.username} `;
    onChange(before + inserted + after);
    setMentionSpan(null);
    onMentionPicked?.(row);

    // The DOM has not re-rendered with the new value yet — restoring the caret waits for that
    // commit, same reason `onBlur`'s dropdown-close uses a `setTimeout(0)`.
    const caret = before.length + inserted.length;
    setTimeout(() => {
      const el = wrapperRef.current?.querySelector('textarea');
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    }, 0);
  };

  return (
    <div ref={wrapperRef} className={cn('relative', containerClassName)}>
      <Textarea
        {...textareaProps}
        value={value}
        onChange={(event) => {
          const el = event.target;
          onChange(el.value);
          setMentionSpan(
            mentionsDisabled
              ? null
              : findMentionQuery(el.value, el.selectionStart ?? el.value.length)
          );
        }}
        onBlur={(event) => {
          // A row's own `onMouseDown` calls `preventDefault`, keeping focus on the textarea, so
          // this never fires for a click that is actually a selection.
          setTimeout(() => setMentionSpan(null), 120);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          // The mention dropdown takes the arrow / enter / escape keys while it is open, ahead of
          // whatever the caller bound for the same keys.
          if (active && rows.length > 0) {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlightIndex((h) => (h + 1) % rows.length);
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightIndex((h) => (h - 1 + rows.length) % rows.length);
              return;
            }
            if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
              event.preventDefault();
              selectMention(rows[highlight]);
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setMentionSpan(null);
              return;
            }
          }
          onKeyDown?.(event);
        }}
      />

      {/**
       * `onMouseDown` rather than `onClick`: the textarea's blur fires before `click` and would
       * close this list before a click could land. The divider is drawn only where the friend /
       * non-friend split actually happens, not as a fixed group label.
       */}
      {rows.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-nx-md border border-nx-border-default bg-nx-surface-raised py-1 shadow-nx-2">
          {rows.map((row, index) => (
            <li key={row.id}>
              {index > 0 && rows[index - 1].isFriend && !row.isFriend && (
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
        </ul>
      )}
    </div>
  );
}
