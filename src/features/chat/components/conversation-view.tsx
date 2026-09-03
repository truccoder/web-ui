'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Avatar, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ChatAttachment, ChatConversation, ChatMessage } from '../types/chat';
import { getMessagePosition } from '../lib/grouping';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';

/** Just the identity part of a conversation — what the header and the info column need. */
export type ConversationHeaderData = Pick<
  ChatConversation,
  | 'id'
  | 'name'
  | 'otherMemberId'
  | 'otherMemberName'
  | 'otherMemberImage'
  | 'memberCount'
  | 'members'
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
  onSend: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  /**
   * Uploads one picked file and resolves to the attachment `onSend` then commits. Given, the
   * composer shows an attach button; omitted (a frame that does not want uploads), it does not.
   */
  onUpload?: (file: File) => Promise<ChatAttachment>;
  /** Rendered as a back arrow in the header when given — the mobile one-pane layout needs it. */
  onBack?: () => void;
  /**
   * The peer's profile page, when the frame could resolve one (B38).
   *
   * A PROP RATHER THAN A LOOKUP IN HERE, because this component is presentational — it is handed
   * a conversation and renders it, and the floating window frames it too. The handle comes from
   * `GET /users/{userId}/reputation`, which the frame is already asking for; resolving it here
   * would put a request inside a component whose whole contract is that it makes none.
   *
   * It also has to be optional: a group has no single peer, and a payload can arrive without a
   * handle. Absent means the title renders as plain text, same rule as `PostCard.authorHref`.
   */
  titleHref?: string;
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
  onUpload,
  onBack,
  titleHref,
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
      {/**
       * THE HEADER IS A PLANE CHANGE, NOT AN ELEVATION — owner asks, in two passes.
       *
       * It began as a transparent `border-b` row on the pane's own ground, which read as part of
       * the transcript once that went full-width. A first pass lifted it with `surface-card` +
       * `shadow-nx-2`; the owner rejected the shadow — *cái thanh này không được trồi lên so với 2
       * bên*. So: the `surface-card` fill stays (it sits a step off the recessed transcript ground,
       * same as both flanking columns), the shadow and the `z` lift are gone, and the `border-b`
       * hairline comes back to seat the edge. Nothing here rises above the side columns.
       */}
      <div className="flex shrink-0 items-center gap-3 border-b border-nx-border-subtle bg-nx-surface-card px-3 py-2.5">
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

        {titleHref ? (
          /* The avatar and the name are one anchor here, not two as in the info pane: this is a
             32px row where two adjacent tap targets to the same place would only make each of
             them smaller. */
          <Link href={titleHref} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
            <Avatar src={header?.otherMemberImage ?? undefined} name={title} size="md" />
            <span className="min-w-0 flex-1 truncate text-nx-ui font-semibold text-nx-text-primary">
              {title}
            </span>
          </Link>
        ) : (
          <>
            <Avatar src={header?.otherMemberImage ?? undefined} name={title} size="md" />
            <span className="min-w-0 flex-1 truncate text-nx-ui font-semibold text-nx-text-primary">
              {title}
            </span>
          </>
        )}
        {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>

      {/**
       * THE TRANSCRIPT RUNS FULL-WIDTH — owner override of report §3.7 (E003).
       *
       * E003 capped the column at `--spacing-nx-chat-measure` (600) and centred it with `mx-auto`
       * to hold a readable line length. On the wide focus-mode pane that left a broad band of bare
       * `surface-page` down each side of every message, and the owner read the screen as hard to
       * track: *cho chat tràn hết khung*. The cap is gone; the transcript now fills the pane.
       *
       * The bubble still caps ITSELF at `min(28rem, 72%)` (see `MessageBubble`), so no single
       * message spans the whole pane — only a run's alignment, the timestamps and the date
       * separators widen out, which is the reach the owner wanted back.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="w-full">
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
      </div>

      <MessageComposer onSend={onSend} onUpload={onUpload} disabled={isLoading || error !== null} />
    </div>
  );
}
