'use client';

import { Avatar } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useRelativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { ChatConversation } from '../types/chat';

/**
 * One conversation in the sidebar.
 *
 * PRESENTATIONAL — takes a conversation and a callback, holds no query. The sidebar owns the
 * data so a row never has to know how conversations are fetched.
 */
export interface ConversationRowProps {
  conversation: ChatConversation;
  isActive?: boolean;
  onSelect: (conversationId: string) => void;
  className?: string;
}

/**
 * What to call a conversation.
 *
 * THREE FALLBACKS DEEP, AND EACH ONE IS REACHABLE. Channels this app creates are member-based and
 * unnamed, so `name` is normally null and the other person's name is the real title. That name
 * comes from Stream's user profile, which the backend pushes when it issues a token — a member
 * who has never opened chat exists as an id with no name until they do. The id is the last
 * resort: ugly, but it identifies the row rather than rendering a blank one.
 */
function conversationTitle(conversation: ChatConversation, unknown: string): string {
  return conversation.name ?? conversation.otherMemberName ?? conversation.otherMemberId ?? unknown;
}

export function ConversationRow({
  conversation,
  isActive = false,
  onSelect,
  className,
}: ConversationRowProps) {
  const t = useT();
  const relativeTime = useRelativeTime();

  const title = conversationTitle(conversation, t('chat.unknownPerson'));
  const hasUnread = conversation.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        /**
         * THE ROW INSET IS `pad-y` 12 / `pad` 20, not 10/12 — `density-r14.md:155` fixes it and
         * calls it "R13's rung move, unchanged". Report §3.7 (E002).
         *
         * The horizontal half already reached 20 by accident: the column around this row adds its
         * own `px-2` (8), so 12 + 8 landed on the right total by a split the ladder does not name.
         * Paying it here makes the row's own inset legible without having to add up two files —
         * `--nx-space-pad-half` is the token for a deliberate split, and this was not one.
         */
        'flex w-full items-center gap-3 rounded-nx-md px-5 py-3 text-left',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        isActive ? 'bg-nx-accent-soft' : 'hover:bg-nx-surface-sunken',
        className
      )}
    >
      <Avatar src={conversation.otherMemberImage ?? undefined} name={title} size="lg" />

      {/**
       * `gap-2` (tight 8) ON THE STACK, replacing a `mt-0.5` on the second line — report §3.7
       * (E002), and this is the exact defect `density-r14.md` §3 was written to fix.
       *
       * That section quotes the owner — *"Trong btn này spacing không đẹp… có khoảng cách giữa
       * tên và tin nhắn"* — and describes the cause as *"a plain `<div>` with no `gap`, so its two
       * lines were separated by line-height alone: the only stacked pair in the kit that inherited
       * zero instead of declaring a rung"*. Measured here before the change: this wrapper was
       * `min-w-0 flex-1`, `display: block`, `gap: normal`, and the 2px between the lines came from
       * `mt-0.5` on the second one. Word for word the same shape.
       *
       * The rung is `tight` 8, and R14 gives the reason: the name and the last message are TWO
       * READINGS — who, and what they last said — not one thing wrapping onto a second line.
       *
       * Declaring it as a `gap` also matters beyond this row: a margin is invisible to the
       * ladder-measuring probe and untouched by a refit, which is the same trap D002 records.
       */}
      <span className="flex min-w-0 flex-1 flex-col gap-[var(--nx-space-tight)]">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'truncate text-nx-ui text-nx-text-primary',
              hasUnread ? 'font-semibold' : 'font-normal'
            )}
          >
            {title}
          </span>

          {/* Null when the conversation has no messages yet — a channel created and not written
              to. Rendering an empty span keeps the title from stretching across the gap. */}
          {conversation.lastMessageAt !== null && (
            <span className="shrink-0 text-nx-caption text-nx-text-muted">
              {relativeTime(conversation.lastMessageAt)}
            </span>
          )}
        </span>

        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-nx-body-sm',
              hasUnread ? 'font-medium text-nx-text-primary' : 'text-nx-text-secondary'
            )}
          >
            {conversation.lastMessage ?? t('chat.sayHi')}
          </span>

          {hasUnread && (
            <span
              className={cn(
                'grid h-5 min-w-5 shrink-0 place-items-center rounded-nx-full px-2',
                'bg-nx-accent-fill text-nx-caption font-semibold text-nx-accent-fill-text'
              )}
            >
              {/* Past 99 the exact number stops being information and starts being noise. */}
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
