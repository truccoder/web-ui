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
 * accent for one's own messages, the sunken surface for everyone else's, the standard radius
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
          isOwn ? 'bg-nx-accent text-white' : 'bg-nx-surface-sunken text-nx-text-primary'
        )}
      >
        {message.text}
      </div>
    </div>
  );
}
