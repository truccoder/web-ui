'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, X } from 'lucide-react';
import { Avatar, Button, IconButton, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { type MentionSuggestion, useMentionSuggestions } from '@/features/search';

/**
 * Finds the `@`-mention being typed right before `caret`, if any.
 *
 * Mirrors the backend's own trigger, `MentionScanner.MENTION` (`(?<![^\s])@(handle)`): the `@`
 * must sit at the start of the text or right after whitespace, or `me@example.com` would open a
 * dropdown mid-email. Unlike the backend pattern this matches a PARTIAL, unfinished handle (zero
 * to 29 characters) — the dropdown has to open on the keystroke that types `@` itself, before
 * there is anything to validate as a real handle yet.
 */
function findMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const upToCaret = text.slice(0, caret);
  const match = /(?:^|\s)@([a-zA-Z0-9_-]{0,29})$/.exec(upToCaret);
  if (!match) return null;
  return { start: caret - match[1].length - 1, query: match[1] };
}

/**
 * The write box for a comment. One component for all three jobs — new comment, reply, and
 * edit — because the backend's contract for all three is the same single non-blank
 * `content` field (`CommentService.validateContent`), and three near-identical boxes would
 * drift apart the first time that changes.
 *
 * It is deliberately controlled by its own state and reports upward only on submit: the
 * thread should not re-render on every keystroke in one of its boxes.
 */
export interface CommentComposerProps {
  /** Prefilled text — the existing body when editing. */
  initialValue?: string;
  placeholder?: string;
  /**
   * The action's NAME, not its face — the control is icon-only, so this is what it carries as
   * `aria-label` and as the tooltip. A screen reader still hears "Trả lời" / "Lưu"; nobody
   * loses the word, it just stopped taking a row of its own.
   */
  submitLabel?: string;
  /**
   * The glyph in the send button. Defaults to the paper plane, which is right for "post this" —
   * editing passes a tick instead, because saving a change is not sending a new thing.
   */
  submitIcon?: React.ReactNode;
  /** Renders a cancel button. Reply and edit use it; the top-level box does not. */
  onCancel?: () => void;
  onSubmit: (content: string) => void;
  pending?: boolean;
  /** Server-side failure text, rendered under the box. */
  error?: string | null;
  autoFocus?: boolean;
  className?: string;
}

export function CommentComposer({
  initialValue = '',
  placeholder,
  submitLabel,
  submitIcon,
  onCancel,
  onSubmit,
  pending = false,
  error,
  autoFocus = false,
  className,
}: CommentComposerProps) {
  const t = useT();

  /**
   * `initialValue` seeds this once, at mount, and there is deliberately no effect syncing
   * it afterwards — an effect that calls `setState` is exactly what `react-hooks/
   * set-state-in-effect` flags, and the rule is right: it causes a cascading render for
   * something React already has a mechanism for.
   *
   * RESETTING IS THE CALLER'S JOB, VIA `key`. The reply and edit boxes unmount when they
   * close, so they reset for free. The always-mounted top-level box is remounted by the
   * thread changing its `key` **after a confirmed write** — see `CommentThread`. Clearing
   * on submit instead would be simpler and wrong: a rejected comment would take the user's
   * text with it, and this backend rejects writes for reasons the frontend cannot predict.
   */
  const [value, setValue] = useState(initialValue);

  /**
   * PUTS THE CARET AFTER THE PREFILLED TEXT, ONCE, ON THE FOCUS `autoFocus` CAUSES.
   *
   * A textarea that is focused programmatically does not agree across browsers about where the
   * caret lands, and "position 0" is a real answer some of them give. That is invisible on an
   * empty box and actively wrong on a prefilled one: the reply box opens holding
   * `@backend_khoi_nguyen ` and the reader types their sentence IN FRONT of the tag.
   *
   * ON `onFocus` RATHER THAN A REF, because `Textarea` binds its own `ref` for auto-resize and
   * does not forward one — adding a second ref path through a shared DS component to move a
   * caret is a poor trade. `props` is spread onto the element, so a handler gets there.
   *
   * THE LATCH IS WHAT MAKES IT SAFE. Without it, every later focus would drag the caret to the
   * end — including the focus a reader gets from clicking in the middle of their own sentence to
   * fix a typo, which is the one place a caret must not move. It fires for the opening focus and
   * never again.
   *
   * Gated on `autoFocus && initialValue` so a box the user chose to click into is untouched.
   */
  const caretPlaced = useRef(false);

  const placeCaretAtEnd = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (caretPlaced.current || !autoFocus || !initialValue) return;
    caretPlaced.current = true;
    const end = event.currentTarget.value.length;
    event.currentTarget.setSelectionRange(end, end);
  };

  /**
   * THE `@`-MENTION DROPDOWN (BE `9fe0b88`, `GET /search/mentions`).
   *
   * `mentionSpan` IS LIVE, UPDATED ON EVERY KEYSTROKE — it is what decides which slice of `value`
   * gets replaced on selection, so it cannot lag behind what was actually typed. `debouncedQuery`
   * is the network-facing copy, 200ms behind, same debounce and same reasoning as
   * `SearchBar` (this component owns the keyboard, so it owns the timing — the hook only refuses
   * to fetch while there is nothing open).
   *
   * NO REF TO THE `<textarea>`: `Textarea` does not forward one (see `placeCaretAtEnd` above), so
   * selecting a row queries the DOM through `wrapperRef` instead of holding a second ref path
   * through a shared DS component.
   */
  const [mentionSpan, setMentionSpan] = useState<{ start: number; query: string } | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(mentionSpan?.query ?? ''), 200);
    return () => clearTimeout(id);
  }, [mentionSpan?.query]);

  const { data: mentionRows } = useMentionSuggestions(debouncedQuery, mentionSpan !== null);
  const rows = mentionSpan !== null ? (mentionRows ?? []) : [];
  const highlight = rows.length > 0 ? mentionHighlight % rows.length : 0;

  const selectMention = (row: MentionSuggestion) => {
    if (!mentionSpan || !row.username) return;
    const before = value.slice(0, mentionSpan.start);
    const after = value.slice(mentionSpan.start + 1 + mentionSpan.query.length);
    const inserted = `@${row.username} `;
    setValue(before + inserted + after);
    setMentionSpan(null);

    // The DOM has not re-rendered with the new value yet — restoring the caret has to wait for
    // that commit, same reason `onBlur`'s dropdown-close elsewhere in this codebase uses a
    // `setTimeout(0)` rather than doing it inline.
    const caret = before.length + inserted.length;
    setTimeout(() => {
      const el = wrapperRef.current?.querySelector('textarea');
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    }, 0);
  };

  // Mirrors the server rule rather than inventing one: blank (whitespace-only) is rejected
  // with 400 "Comment content must not be blank", so the button is the same gate.
  const canSubmit = value.trim().length > 0 && !pending;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
  };

  const submitName = submitLabel ?? t('post.send');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div ref={wrapperRef} className="relative">
        <Textarea
          value={value}
          onChange={(event) => {
            const el = event.target;
            setValue(el.value);
            setMentionSpan(findMentionQuery(el.value, el.selectionStart ?? el.value.length));
          }}
          placeholder={placeholder ?? t('post.commentPlaceholder')}
          // Grows with what is written instead of scrolling inside two fixed lines. It matters more
          // now than it did: the send control lives at the bottom-right INSIDE the box, so the box's
          // own height is the thing that has to follow the text.
          autoResize
          rows={2}
          autoFocus={autoFocus}
          onFocus={placeCaretAtEnd}
          // A row's own `onMouseDown` calls `preventDefault`, which keeps focus on the textarea and
          // means this never fires for a click that is actually a selection — same split `SearchBar`
          // relies on for its dropdown. This only has to catch focus leaving for real.
          onBlur={() => setTimeout(() => setMentionSpan(null), 120)}
          onKeyDown={(event) => {
            // THE MENTION DROPDOWN TAKES THE ARROW/ENTER/ESCAPE KEYS WHILE IT IS OPEN, ahead of
            // this box's own bindings for the same keys — picking a row beats inserting a newline
            // or closing the whole composer.
            if (mentionSpan !== null && rows.length > 0) {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setMentionHighlight((h) => (h + 1) % rows.length);
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setMentionHighlight((h) => (h - 1 + rows.length) % rows.length);
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

            // Ctrl/Cmd+Enter submits; plain Enter inserts a newline. Comments here are code
            // talk, so multi-line is the common case and Enter-to-send would truncate people
            // mid-thought.
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
            /**
             * ESCAPE CLOSES A REPLY OR AN EDIT, and it is the keyboard half of a change that took a
             * word off the screen: cancel used to be a labelled button and is now a small ✕. Anyone
             * who would rather not hunt for a 28px target can back out of the box the way every
             * other dismissable thing in this app backs out.
             */
            if (event.key === 'Escape' && onCancel && !pending) {
              event.preventDefault();
              onCancel();
            }
          }}
          /**
           * THE ACTIONS SIT IN THE FIELD, BOTTOM-RIGHT, rather than on a row under it. Three
           * reasons, in order of how much they cost the reader:
           *
           * 1. A full-width filled button under every box made the composer look like a form to
           *    fill in. A comment box is one gesture, and the gesture belongs to the box.
           * 2. It gave the thread a stack of identical "Gửi" buttons — the top-level box, an open
           *    reply, an open edit — competing for the same eye at the same weight.
           * 3. It cost a row of vertical space per box, in a list whose whole job is to show as
           *    much of the conversation as fits.
           *
           * The word is not lost: it is the `aria-label` and the tooltip on both controls.
           */
          trailing={
            <div className="flex items-center gap-1">
              {onCancel && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={t('post.comments.cancel')}
                  onClick={onCancel}
                  disabled={pending}
                >
                  <X />
                </IconButton>
              )}
              {/* `Button` with an icon and no children, which is what the chat composer's send
                already is — `IconButton` only ships ghost/outline, and this one is the primary
                action of the box. `aria-label` names it, since there is no text node to read. */}
              <Button
                size="sm"
                className="px-2"
                icon={submitIcon ?? <SendHorizontal />}
                aria-label={submitName}
                title={submitName}
                onClick={submit}
                disabled={!canSubmit}
                loading={pending}
              />
            </div>
          }
        />

        {/**
         * THE DROPDOWN. `onMouseDown` rather than `onClick`, same reason as `SearchBar`'s: the
         * textarea's blur (which `IconButton`/`Button` presses elsewhere in this box would cause)
         * fires before `click`, and would close this list before a click could land on it.
         *
         * NO SEPARATE "FRIENDS" HEADING WHEN THE LIST IS ALL FRIENDS OR ALL STRANGERS — the divider
         * only earns its place where the split actually happens, so it is drawn between the last
         * friend row and the first non-friend row rather than as a fixed label above each group.
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
                  onMouseEnter={() => setMentionHighlight(index)}
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

      {error && <p className="text-nx-micro text-nx-status-danger-fg">{error}</p>}
    </div>
  );
}
