'use client';

import { useRef, useState } from 'react';
import { Button, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';

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
  submitLabel?: string;
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

  // Mirrors the server rule rather than inventing one: blank (whitespace-only) is rejected
  // with 400 "Comment content must not be blank", so the button is the same gate.
  const canSubmit = value.trim().length > 0 && !pending;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder ?? t('post.commentPlaceholder')}
        rows={2}
        autoFocus={autoFocus}
        onFocus={placeCaretAtEnd}
        onKeyDown={(event) => {
          // Ctrl/Cmd+Enter submits; plain Enter inserts a newline. Comments here are code
          // talk, so multi-line is the common case and Enter-to-send would truncate people
          // mid-thought.
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
      />

      {error && <p className="text-nx-micro text-nx-status-danger-fg">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={!canSubmit} loading={pending}>
          {submitLabel ?? t('post.send')}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
            {t('post.comments.cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
