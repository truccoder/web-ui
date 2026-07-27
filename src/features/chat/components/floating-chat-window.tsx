'use client';

import { ChevronDown, X } from 'lucide-react';
import { Avatar } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import { useChatClient } from '../hooks/use-chat-client';
import { useConversation } from '../hooks/use-conversation';
import { ConversationView } from './conversation-view';

/**
 * One conversation floating over the app shell, in the messenger idiom: a small pane docked to the
 * bottom edge, collapsible to an avatar.
 *
 * IT REUSES `ConversationView` RATHER THAN RESTATING IT. That component takes messages and a send
 * callback as props precisely so a second frame could exist (the note on it says as much) — the
 * only thing this window adds is a chrome of its own around the same conversation. Copying the
 * message list here would mean every later fix to bubble grouping, autoscroll or IME handling has
 * to be made twice, and the second copy is the one that gets forgotten.
 *
 * IT OWNS ITS DATA, unlike the presentational pieces below it. Each window is opened independently
 * by the dock and watches a different channel, so the `useConversation` call belongs per-window;
 * hoisting it into the dock would mean the dock holding a variable-length list of hook results,
 * which React does not allow.
 */
export interface FloatingChatWindowProps {
  conversationId: string;
  isMinimized: boolean;
  onToggleMinimize: (conversationId: string) => void;
  onClose: (conversationId: string) => void;
  className?: string;
}

export function FloatingChatWindow({
  conversationId,
  isMinimized,
  onToggleMinimize,
  onClose,
  className,
}: FloatingChatWindowProps) {
  const t = useT();
  const { userId } = useChatClient();
  const { messages, header, isLoading, error, send } = useConversation(conversationId);

  /**
   * Same three-deep fallback as `ConversationRow`, and reachable for the same reasons: channels are
   * member-based so `name` is normally null, and a member who has never opened chat exists on
   * Stream as an id with no profile.
   */
  const title =
    header?.otherMemberName ?? header?.name ?? header?.otherMemberId ?? t('chat.unknownPerson');

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => onToggleMinimize(conversationId)}
        aria-label={t('chat.expand')}
        title={title}
        className={cn(
          'mb-3 shrink-0 rounded-nx-full shadow-nx-3',
          'transition-transform duration-[var(--nx-duration-fast)] ease-nx-out hover:scale-105',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
          className
        )}
      >
        <Avatar src={header?.otherMemberImage ?? undefined} name={title} size="xl" />
      </button>
    );
  }

  return (
    /**
     * Fixed size rather than fluid: a floating pane that grows with its content would reflow the
     * whole dock row every time a message arrives. `rounded-t-*` only — the bottom edge sits flush
     * against the viewport, which is what makes it read as docked rather than as a dialog.
     */
    <div
      className={cn(
        'flex h-[420px] w-[328px] shrink-0 flex-col overflow-hidden',
        'rounded-t-nx-lg border border-b-0 border-nx-border-subtle bg-nx-surface-raised shadow-nx-3',
        className
      )}
    >
      <ConversationView
        header={header}
        messages={messages}
        myUserId={userId}
        isLoading={isLoading}
        error={error}
        onSend={send}
        actions={
          <>
            <WindowAction
              label={t('chat.minimize')}
              onClick={() => onToggleMinimize(conversationId)}
            >
              <ChevronDown className="size-4" />
            </WindowAction>
            <WindowAction label={t('chat.close')} onClick={() => onClose(conversationId)}>
              <X className="size-4" />
            </WindowAction>
          </>
        }
      />
    </div>
  );
}

/** The two header buttons differ only by icon and handler, so they share one shell. */
function WindowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-8 place-items-center rounded-nx-md text-nx-text-secondary',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out hover:bg-nx-surface-sunken',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
      )}
    >
      {children}
    </button>
  );
}
