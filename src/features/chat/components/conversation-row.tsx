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
        'flex w-full items-center gap-3 rounded-nx-md px-3 py-2.5 text-left',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
        isActive ? 'bg-nx-accent-soft' : 'hover:bg-nx-surface-sunken',
        className
      )}
    >
      <Avatar src={conversation.otherMemberImage ?? undefined} name={title} size="lg" />

      <span className="min-w-0 flex-1">
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

        <span className="mt-0.5 flex items-center justify-between gap-2">
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
                'grid h-5 min-w-5 shrink-0 place-items-center rounded-nx-full px-1.5',
                'bg-nx-accent text-nx-caption font-semibold text-white'
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
