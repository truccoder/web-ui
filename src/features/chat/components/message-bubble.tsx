'use client';

import { Avatar } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import type { ChatMessage } from '../types/chat';
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
  return (
    <div
      className={cn(
        'flex items-end gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        // Runs sit tight; a new speaker gets air.
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

      <div
        className={cn(
          'max-w-[min(28rem,72%)] px-3 py-2',
          'text-nx-body whitespace-pre-wrap break-words',
          bubbleRadius(isOwn, position),
          /**
           * THE INCOMING BUBBLE IS `tint`, NOT `surface-sunken`, AND THAT IS A BUG FIX.
           *
           * R15 recessed the ground a step — `--nx-surface-page` went from gray-50 to gray-100 —
           * and `--nx-surface-sunken` is gray-100 too. `/chats` paints its transcript pane
           * `bg-nx-surface-page` (see `ChatMessenger`), so from that round on every incoming
           * bubble was gray-100 laid on gray-100: the fill was still there, it just had nothing
           * to say. Reported as "chat bị mất bg color", and the screenshot is a column of bare
           * text with no bubble around it.
           *
           * A step off the ramp cannot fix it, because this component is rendered on TWO planes:
           * the page ground here, and `surface-raised` (white) inside the floating window. Any
           * fixed grey disappears into one of them. `--nx-tint` is the token the DS keeps for
           * exactly that case — "the one fill that must read on EVERY plane, hence an alpha
           * rather than a step off the ramp" — so it darkens the ground and the white window by
           * the same perceptual amount, in both themes.
           */
          isOwn ? 'bg-nx-accent-fill text-nx-accent-fill-text' : 'bg-nx-tint text-nx-text-primary'
        )}
      >
        {message.text}
      </div>
    </div>
  );
}
