'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Avatar, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ChatConversation, ChatMessage } from '../types/chat';
import { getMessagePosition } from '../lib/grouping';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';

/** Just the identity part of a conversation — what the header needs. */
export type ConversationHeaderData = Pick<
  ChatConversation,
  'id' | 'name' | 'otherMemberId' | 'otherMemberName' | 'otherMemberImage' | 'memberCount'
>;

/**
 * The open conversation: who it is with, the messages, and the composer.
 *
 * PRESENTATIONAL. It receives messages and a send callback rather than calling `useConversation`
 * itself, so the same component serves this screen and the app shell's floating window
 * (P2.7c-2), which open conversations from different places.
 */
export interface ConversationViewProps {
  header: ConversationHeaderData | null;
  messages: ChatMessage[];
  /** Stream user id of the signed-in user — decides which side each bubble sits on. */
  myUserId: string | null;
  isLoading: boolean;
  error: string | null;
  onSend: (text: string) => Promise<void>;
  /** Rendered as a back arrow in the header when given — the mobile one-pane layout needs it. */
  onBack?: () => void;
  /**
   * Header controls for the caller's own frame, aligned right.
   *
   * A SLOT RATHER THAN BOOLEAN PROPS (`onMinimize`, `onClose`, ...): the buttons a conversation
   * header carries depend entirely on what is framing it. `/chats` needs none — the pane is the
   * page — while the floating window needs minimise and close. Encoding those two as props would
   * mean a third prop the day a third frame appears; a slot costs the caller one line and this
   * component nothing.
   */
  actions?: ReactNode;
  className?: string;
}

/** Shown in the right-hand pane when nothing is selected. */
export function ConversationEmpty({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn('grid h-full place-items-center px-5 py-4', className)}>
      <EmptyState
        title={t('chat.selectConversation')}
        description={t('chat.selectConversationDesc')}
      />
    </div>
  );
}

export function ConversationView({
  header,
  messages,
  myUserId,
  isLoading,
  error,
  onSend,
  onBack,
  actions,
  className,
}: ConversationViewProps) {
  const t = useT();
  const bottomRef = useRef<HTMLDivElement>(null);

  /**
   * Keep the newest message in view.
   *
   * `messages.length` RATHER THAN `messages` AS THE DEPENDENCY: the array identity changes on
   * every sync — a read receipt re-derives it — and scrolling on those would yank the viewport
   * away from someone reading back through history. Only an actual new message should move it.
   *
   * `behavior: 'auto'` on purpose: smooth scrolling a long list on first open animates through
   * the whole history, which reads as a glitch rather than as polish.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  /**
   * `name` FIRST, WHICH IS THE ORDER THE SIDEBAR ROW ALREADY USED. A group's `name` is the only
   * honest title it has, and the mappers null `otherMemberName` out above two members precisely so
   * this chain reaches it — but the two files disagreed on the order, so the row said `Team FE`
   * while the header above the same thread said whichever member Stream listed first. For a direct
   * message nothing changes: `name` is null there and the peer's name is still what shows.
   */
  const title = header?.name ?? header?.otherMemberName ?? header?.otherMemberId ?? '';

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center gap-3 border-b border-nx-border-subtle px-3 py-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            /**
             * A stable hook for callers that need to hide the arrow at some breakpoints — the
             * two-pane messenger shows it only on mobile, where the list is a separate screen.
             * Whether a back arrow makes sense is a property of the frame, not of this component,
             * and a `data-` attribute lets the frame say so in CSS instead of adding a prop per
             * layout that ever wants it.
             */
            data-slot="back"
            aria-label={t('chat.back')}
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-nx-md text-nx-text-secondary',
              'hover:bg-nx-surface-sunken',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
            )}
          >
            <ArrowLeft className="size-4" />
          </button>
        )}

        <Avatar src={header?.otherMemberImage ?? undefined} name={title} size="md" />
        <span className="min-w-0 flex-1 truncate text-nx-ui font-semibold text-nx-text-primary">
          {title}
        </span>
        {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-2">
            {[64, 48, 72].map((width, index) => (
              <Skeleton key={index} width={`${width}%`} height={36} radius={12} />
            ))}
          </div>
        ) : error ? (
          <EmptyState compact title={t('chat.loadError')} description={error} />
        ) : messages.length === 0 ? (
          <EmptyState compact title={t('chat.sayHi')} />
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.senderId === myUserId;
              const position = getMessagePosition(messages, index);
              // The avatar belongs to the last bubble of a run, where it sits level with the
              // bottom of the block rather than floating beside its middle.
              const showAvatar = position === 'single' || position === 'last';

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  position={position}
                  showAvatar={showAvatar}
                />
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <MessageComposer onSend={onSend} disabled={isLoading || error !== null} />
    </div>
  );
}
