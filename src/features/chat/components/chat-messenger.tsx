'use client';

import { useCallback } from 'react';
import { cn } from '@/shared/lib/cn';
import { useChatClient } from '../hooks/use-chat-client';
import { useConversation } from '../hooks/use-conversation';
import { useConversations } from '../hooks/use-conversations';
import { ConversationSidebar } from './conversation-sidebar';
import { ConversationView, ConversationEmpty } from './conversation-view';

/**
 * The full-screen messenger: conversation list beside the open conversation.
 *
 * THE COMPONENT HOLDS THE DATA, THE ROUTE HOLDS THE URL. Which conversation is open is a fact
 * about the address bar — it has to survive a reload and a back button — so it arrives as a prop
 * and leaves through `onSelect`. Everything else (the client, the list, the messages) is this
 * feature's business and never reaches the page. That split is what lets `app/(main)/chats/page.tsx`
 * stay a few lines of routing with no chat knowledge in it, which is the shape Phase 3 requires of
 * every route.
 *
 * ONE PANE ON MOBILE, DERIVED RATHER THAN STORED. The Twilio screen this replaces kept a
 * `mobileView: 'list' | 'chat'` state alongside the URL, which could disagree with it — opening a
 * conversation link on a phone showed the list. Here "a conversation is open" is the same fact as
 * "the URL names one", so the panes follow `activeConversationId` and cannot drift from it.
 */
export interface ChatMessengerProps {
  /** From the route's query string; null means nothing is open. */
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  /** Clears the selection — the mobile back arrow. */
  onBack: () => void;
  className?: string;
}

export function ChatMessenger({
  activeConversationId,
  onSelect,
  onBack,
  className,
}: ChatMessengerProps) {
  const { userId, status } = useChatClient();
  const { conversations, isLoading, startConversation } = useConversations();
  const {
    messages,
    header,
    isLoading: isConversationLoading,
    error,
    send,
  } = useConversation(activeConversationId);

  const handleStart = useCallback(
    async (friendUserId: string) => {
      const conversationId = await startConversation(friendUserId);
      onSelect(conversationId);
      return conversationId;
    },
    [startConversation, onSelect]
  );

  return (
    // `h-full`, not a viewport calculation: the `(main)` layout hands full-bleed routes the height
    // left after its chrome, so this component never has to know how tall that chrome is.
    <div className={cn('flex h-full overflow-hidden', className)}>
      <div
        className={cn(
          'w-full shrink-0 border-r border-nx-border-subtle md:flex md:w-[320px] md:flex-col',
          // Mobile shows exactly one pane; desktop always shows both.
          activeConversationId ? 'hidden md:flex md:flex-col' : 'flex flex-col'
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          isLoading={isLoading}
          status={status}
          activeConversationId={activeConversationId}
          onSelect={onSelect}
          onStartConversation={handleStart}
        />
      </div>

      <div
        className={cn('min-w-0 flex-1 flex-col', activeConversationId ? 'flex' : 'hidden md:flex')}
      >
        {activeConversationId ? (
          <ConversationView
            /**
             * KEYED BY CONVERSATION. `useConversation` already masks the previous thread's data
             * behind an id check, so this is not what prevents a flash of the wrong messages —
             * it resets the view's own scroll position, which would otherwise carry over from the
             * conversation just closed.
             */
            key={activeConversationId}
            header={header}
            messages={messages}
            myUserId={userId}
            isLoading={isConversationLoading}
            error={error}
            onSend={send}
            // Only meaningful on mobile, where the list is a separate screen. On desktop both
            // panes are visible, so the arrow would clear a selection for no reason — hidden
            // through the `data-slot` hook rather than by withholding the callback, because
            // "which breakpoint" is a CSS question and JS cannot answer it during render.
            onBack={onBack}
            className="md:[&_[data-slot=back]]:hidden"
          />
        ) : (
          <ConversationEmpty />
        )}
      </div>
    </div>
  );
}
