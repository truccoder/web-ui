'use client';

import { useState, type KeyboardEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button, Textarea } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';

/**
 * The message input.
 *
 * SEPARATE FROM `ConversationView` BECAUSE IT HAS A SECOND CALLER COMING: the floating chat
 * window in the app shell (P2.7c-2) needs the same box in a narrower frame. Splitting it now,
 * with one real caller and a second known one, is the case CLAUDE.md's "build a primitive when a
 * caller needs it" rule is about — the shape is decided by use, not guessed.
 */
export interface MessageComposerProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function MessageComposer({ onSend, disabled = false, className }: MessageComposerProps) {
  const t = useT();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !disabled && !isSending;

  const submit = async () => {
    if (!canSend) return;

    setIsSending(true);
    try {
      await onSend(trimmed);
      /**
       * CLEARED ONLY ON SUCCESS, and cleared here rather than from an effect. A failed send that
       * wipes the box loses what the person wrote, which is the one thing a chat input must never
       * do; and clearing from an effect is both banned by `react-hooks/set-state-in-effect` and
       * the wrong place — this is an event, not a synchronisation.
       */
      setText('');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Enter sends, Shift+Enter breaks the line — the convention every messenger uses.
   *
   * `isComposing` GUARDS IME INPUT, and this app needs it: typing Vietnamese with a
   * telex/VNI input method fires Enter to accept a candidate, and without this check that Enter
   * would send a half-finished word instead of completing it.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={cn('flex items-end gap-2 border-t border-nx-border-subtle p-3', className)}>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.messagePlaceholder')}
        aria-label={t('chat.messagePlaceholder')}
        disabled={disabled}
        autoResize
        rows={1}
        className="flex-1"
      />

      <Button
        variant="primary"
        size="md"
        icon={<SendHorizontal className="size-4" />}
        onClick={submit}
        disabled={!canSend}
        loading={isSending}
        aria-label={t('chat.send')}
      />
    </div>
  );
}
