'use client';

import { FileText } from 'lucide-react';
import { Avatar } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ChatMessage } from '../types/chat';
import { formatFileSize } from '../lib/format';
import type { MessagePosition } from '../lib/grouping';

/**
 * One message bubble.
 *
 * NO DESIGN-SYSTEM SPECIMEN EXISTS FOR CHAT. The DS ships buttons, cards, forms, tabs, dialogs
 * and menus — there is no message bubble to match, so this is built from tokens only: the
 * accent for one's own messages, the neutral tint for everyone else's, the standard radius
 * scale, and the same body size the rest of the app reads at. Recorded as a deviation in
 * `ledger/ds-deviations.md` — it is an invention, not a match, and the next person should know
 * that rather than assume there is a specimen they failed to find.
 */
export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  /** Where this sits in a run from the same sender — decides which corners stay round. */
  position: MessagePosition;
  /** Reserve the avatar column even when no avatar is drawn, so a run stays aligned. */
  showAvatar: boolean;
  className?: string;
}

/**
 * Corner rounding for a run of messages.
 *
 * The side facing the sender squares off in the middle of a run, so consecutive bubbles read as
 * one block. Both outer ends stay fully round.
 */
function bubbleRadius(isOwn: boolean, position: MessagePosition): string {
  if (position === 'single') return 'rounded-nx-lg';

  if (isOwn) {
    if (position === 'first') return 'rounded-nx-lg rounded-br-nx-xs';
    if (position === 'middle') return 'rounded-nx-lg rounded-r-nx-xs';
    return 'rounded-nx-lg rounded-tr-nx-xs';
  }

  if (position === 'first') return 'rounded-nx-lg rounded-bl-nx-xs';
  if (position === 'middle') return 'rounded-nx-lg rounded-l-nx-xs';
  return 'rounded-nx-lg rounded-tl-nx-xs';
}

export function MessageBubble({
  message,
  isOwn,
  position,
  showAvatar,
  className,
}: MessageBubbleProps) {
  const t = useT();

  const images = message.attachments.filter((attachment) => attachment.kind === 'image');
  const files = message.attachments.filter((attachment) => attachment.kind === 'file');
  const hasText = message.text.length > 0;

  // Once a bubble carries attachments the run-corner squaring stops applying — the blocks stack
  // with their own full radius rather than reading as one welded column.
  const textRadius =
    message.attachments.length > 0 ? 'rounded-nx-lg' : bubbleRadius(isOwn, position);

  const fillClass = isOwn
    ? 'bg-nx-accent-fill text-nx-accent-fill-text'
    : 'bg-nx-tint text-nx-text-primary';

  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        // Runs sit tight; a new speaker gets air.
        // THE TRANSCRIPT HAS ITS OWN COURSE. R9 §1.3 and R14 §4 give the message list a
        // separate vertical ladder, and R10 scopes this rule out of the transcript
        // explicitly via `[data-nx-transcript]`. These two values are that course: `turn`
        // between speakers, `utterance` within one speaker's run.
        // eslint-disable-next-line no-restricted-syntax -- the transcript's own course
        position === 'single' || position === 'first' ? 'mt-3' : 'mt-0.5',
        className
      )}
    >
      {/* The column is always reserved, so bubbles in a run line up with the one that has the
          avatar instead of stepping sideways when it disappears. */}
      <span className="w-7 shrink-0">
        {showAvatar && !isOwn && (
          <Avatar
            src={message.senderImage ?? undefined}
            name={message.senderName ?? message.senderId}
            size="sm"
          />
        )}
      </span>

      {/**
       * ONE COLUMN, ONE MEASURE. Images, file rows and the text bubble stack here and the
       * `max-w` caps the widest of them — the same `min(28rem,72%)` a text-only bubble always had.
       *
       * THE INCOMING FILL IS `tint`, NOT `surface-sunken`, AND THAT IS A BUG FIX. R15 recessed the
       * ground to gray-100 and `--nx-surface-sunken` is gray-100 too, so an incoming bubble on the
       * transcript pane was grey-on-grey ("chat bị mất bg color"). `--nx-tint` is an alpha, so it
       * darkens whatever plane it lands on by the same perceptual amount.
       */}
      <div
        className={cn(
          'flex min-w-0 max-w-[min(28rem,72%)] flex-col gap-1',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {images.map((attachment, index) => (
          <a
            key={`image-${index}`}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-full rounded-nx-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Stream's CDN already serves a
                sized image; next/image would proxy it for no gain and needs the host allow-listed. */}
            <img
              src={attachment.url}
              alt={attachment.name ?? t('chat.imageAttachment')}
              loading="lazy"
              className="max-h-80 max-w-full rounded-nx-lg"
            />
          </a>
        ))}

        {files.map((attachment, index) => (
          <a
            key={`file-${index}`}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className={cn(
              'flex max-w-full items-center gap-2 px-3 py-2 text-nx-body rounded-nx-lg',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
              fillClass
            )}
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {attachment.name ?? t('chat.fileAttachment')}
            </span>
            {attachment.size != null && (
              <span className="shrink-0 text-nx-caption opacity-70">
                {formatFileSize(attachment.size)}
              </span>
            )}
          </a>
        ))}

        {hasText && (
          <div
            className={cn(
              'max-w-full px-3 py-2 text-nx-body whitespace-pre-wrap break-words',
              textRadius,
              fillClass
            )}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
