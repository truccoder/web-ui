'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { AlertTriangle, FileText, Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';
import { Button, IconButton, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ChatAttachment } from '../types/chat';

/**
 * The message input.
 *
 * PRESENTATIONAL AND FRAME-AGNOSTIC. It takes `onSend` and an optional `onUpload` and owns none of
 * the transport — the same box serves `/chats` and would serve any other frame that opens a
 * conversation. Splitting it from `ConversationView` is the "build a primitive when a caller needs
 * it" rule (CLAUDE.md); the shape is decided by use.
 */
export interface MessageComposerProps {
  onSend: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  /**
   * Uploads one picked file and resolves to the attachment `onSend` then commits. Given, the
   * attach button appears; omitted, the composer is text-only.
   */
  onUpload?: (file: File) => Promise<ChatAttachment>;
  disabled?: boolean;
  className?: string;
}

/**
 * Bytes. Stream's own ceiling is 100 MB — 25 is a friendlier limit for a chat and, checked before
 * the upload starts, it catches "attached the wrong 2 GB file" without a round trip.
 */
const MAX_FILE_BYTES = 25_000_000;

/** One picked file on its way into a message. */
type PendingAttachment = {
  key: string;
  name: string;
  isImage: boolean;
  /** Object URL for an image thumbnail — revoked on removal, on send, and on unmount. */
  previewUrl: string | null;
  status: 'uploading' | 'ready' | 'error';
  /** Set once `status === 'ready'` — this is what `onSend` is handed. */
  uploaded: ChatAttachment | null;
};

export function MessageComposer({
  onSend,
  onUpload,
  disabled = false,
  className,
}: MessageComposerProps) {
  const t = useT();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keySeq = useRef(0);

  /**
   * Revoke every object URL still held when the composer unmounts — switching conversations keys a
   * fresh `ConversationView`, so this runs on every switch, not just on route-away. The ref tracks
   * the latest list (written from an effect, never during render) so the unmount cleanup, which
   * closes over nothing, still sees what is outstanding.
   */
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(
    () => () => {
      attachmentsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    },
    []
  );

  const trimmed = text.trim();
  const isUploading = attachments.some((item) => item.status === 'uploading');
  const ready = attachments.filter((item) => item.status === 'ready');
  // Send is allowed with text, with at least one uploaded attachment, or both — but never while an
  // upload is still in flight, or the message would go without it.
  const canSend =
    (trimmed.length > 0 || ready.length > 0) && !isUploading && !disabled && !isSending;

  const removeAttachment = useCallback((key: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  }, []);

  const acceptFiles = useCallback(
    (fileList: FileList | null) => {
      if (!onUpload || !fileList || fileList.length === 0) return;
      setAttachmentError(null);

      const files = Array.from(fileList);
      if (files.some((file) => file.size > MAX_FILE_BYTES)) {
        setAttachmentError(
          t('chat.attachmentTooLarge', { size: Math.round(MAX_FILE_BYTES / 1_000_000) })
        );
      }

      files
        .filter((file) => file.size <= MAX_FILE_BYTES)
        .forEach((file) => {
          const key = `att-${(keySeq.current += 1)}`;
          const isImage = file.type.startsWith('image/');
          const previewUrl = isImage ? URL.createObjectURL(file) : null;

          setAttachments((current) => [
            ...current,
            { key, name: file.name, isImage, previewUrl, status: 'uploading', uploaded: null },
          ]);

          onUpload(file)
            .then((uploaded) => {
              setAttachments((current) =>
                current.map((item) =>
                  item.key === key ? { ...item, status: 'ready', uploaded } : item
                )
              );
            })
            .catch(() => {
              setAttachments((current) =>
                current.map((item) => (item.key === key ? { ...item, status: 'error' } : item))
              );
              setAttachmentError(t('chat.attachmentFailed'));
            });
        });
    },
    [onUpload, t]
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFiles(event.target.files);
    // Reset so picking the same file again still fires `change`.
    event.target.value = '';
  };

  const submit = async () => {
    if (!canSend) return;

    setIsSending(true);
    try {
      await onSend(
        trimmed,
        ready.map((item) => item.uploaded as ChatAttachment)
      );
      /**
       * CLEARED ONLY ON SUCCESS. A failed send keeps both the text and the uploaded files — the
       * files already live on Stream's store, so re-sending costs no second upload. Clearing from
       * an event rather than an effect: `react-hooks/set-state-in-effect` forbids the latter and
       * this is an event, not a synchronisation.
       */
      setText('');
      attachments.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setAttachments([]);
      setAttachmentError(null);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Enter sends, Shift+Enter breaks the line — the convention every messenger uses.
   *
   * `isComposing` GUARDS IME INPUT: typing Vietnamese with a telex/VNI method fires Enter to accept
   * a candidate, and without this check that Enter would send a half-finished word.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={cn('border-t border-nx-border-subtle p-3', className)}>
      {/* The tray of picked files, above the field — a thumbnail for an image, a labelled tile for
          anything else, each with a spinner while it uploads and a cross to drop it. */}
      {attachments.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {attachments.map((item) => (
            <li key={item.key} className="relative">
              {item.isImage && item.previewUrl ? (
                // A background image, not an `<img>`: it is a fixed-size `blob:` thumbnail with no
                // remote URL for next/image to optimise, gone the moment the message sends.
                <div
                  role="img"
                  aria-label={item.name}
                  className="size-16 rounded-nx-md bg-nx-surface-sunken bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.previewUrl})` }}
                />
              ) : (
                <div className="flex size-16 flex-col items-center justify-center gap-1 rounded-nx-md bg-nx-surface-sunken px-1 text-center">
                  <FileText className="size-5 shrink-0 text-nx-text-secondary" aria-hidden />
                  <span className="w-full truncate text-nx-caption text-nx-text-muted">
                    {item.name}
                  </span>
                </div>
              )}

              {item.status !== 'ready' && (
                <div
                  className={cn(
                    'absolute inset-0 grid place-items-center rounded-nx-md',
                    item.status === 'uploading' ? 'bg-nx-surface-overlay' : 'bg-nx-status-danger'
                  )}
                >
                  {item.status === 'uploading' ? (
                    <Loader2
                      className="size-4 animate-spin text-nx-text-on-color"
                      aria-label={t('chat.attachmentUploading')}
                    />
                  ) : (
                    <AlertTriangle
                      className="size-4 text-nx-text-on-color"
                      aria-label={t('chat.attachmentFailed')}
                    />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => removeAttachment(item.key)}
                aria-label={t('chat.removeAttachment', { name: item.name })}
                className={cn(
                  'absolute -right-1 -top-1 grid size-5 place-items-center rounded-nx-full',
                  'bg-nx-surface-inverse text-nx-text-inverse hover:bg-nx-surface-inverse-hover',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
                )}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {attachmentError && (
        <p role="alert" className="mb-2 text-nx-body-sm text-nx-status-danger">
          {attachmentError}
        </p>
      )}

      {/**
       * THE ACTIONS SIT INSIDE THE FIELD — owner ask (*cho nút gửi vào trong khung*), and the attach
       * button joins them. `Textarea.trailing` is the slot built for controls parked against the
       * field's right edge.
       *
       * `items-center`, OVERRIDING THE SLOT'S DEFAULT `items-end`. That default bottom-aligns the
       * control so it tracks the last line as `autoResize` grows — right for the comment composer's
       * three-row box, wrong here: at `rows={1}` a 28px button bottom-aligned against a 20px line
       * left the line sitting low and the button proud of it (*trông lệch*). Centred, the buttons
       * and a single line share an axis.
       */}
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.messagePlaceholder')}
        aria-label={t('chat.messagePlaceholder')}
        disabled={disabled}
        autoResize
        rows={1}
        className="items-center"
        trailing={
          <div className="flex items-center gap-1">
            {onUpload && (
              <>
                <input ref={fileInputRef} type="file" multiple hidden onChange={onFileChange} />
                <IconButton
                  size="sm"
                  label={t('chat.attachFile')}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isSending}
                >
                  <Paperclip />
                </IconButton>
              </>
            )}
            <Button
              variant="primary"
              size="sm"
              className="px-2"
              icon={<SendHorizontal className="size-4" />}
              onClick={submit}
              disabled={!canSend}
              loading={isSending}
              aria-label={t('chat.send')}
            />
          </div>
        }
      />
    </div>
  );
}
