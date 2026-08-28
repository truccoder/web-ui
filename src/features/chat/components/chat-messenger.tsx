'use client';

import { useCallback } from 'react';
import { cn } from '@/shared/lib/cn';
import { useChatClient } from '../hooks/use-chat-client';
import { useConversation } from '../hooks/use-conversation';
import { useConversations } from '../hooks/use-conversations';
import { ChatInfo } from './chat-info';
import { ConversationSidebar } from './conversation-sidebar';
import { ConversationView, ConversationEmpty } from './conversation-view';

/**
 * The full-screen messenger: conversation list · the open conversation · who it is with.
 *
 * THREE PANES, NOT TWO. The kit's focus-mode region measures `300 | flex-1 | 300`, and the third
 * was simply never built here — round 9's headline names it (*`/chats` gains an info column*) and
 * this component stopped at the pair. The owner reported it: *Chat sao không làm full screen 3
 * phần: người nhắn - tin nhắn - thông tin đoạn chat như DS?*
 *
 * THE THREE PANES DO NOT SHARE A SURFACE, AND THAT IS THE STRUCTURE. Measured: list on
 * `surface-card` (a region you operate), transcript on `surface-page` (the recessed ground the
 * bubbles rise off), info transparent (apparatus, like the ledger). The middle pane being the
 * *lowest* plane is the whole point — it is the only one holding content rather than chrome.
 *
 * THE LIST IS 300, NOT 320. It had been 320 for no reason the DS supports; both flanks in focus
 * mode are 300 and share `--nx-focus-aside`.
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
  const { conversations, isLoading, startConversation, startGroupConversation } =
    useConversations();
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

  const handleStartGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const conversationId = await startGroupConversation(name, memberIds);
      onSelect(conversationId);
      return conversationId;
    },
    [startGroupConversation, onSelect]
  );

  return (
    // `h-full`, not a viewport calculation: the `(main)` layout hands full-bleed routes the height
    // left after its chrome, so this component never has to know how tall that chrome is.
    <div className={cn('flex h-full overflow-hidden', className)}>
      <div
        className={cn(
          // `surface-card` and NO right border. The plane change is what separates the list from
          // the transcript — a hairline as well would be saying it twice, and R4's rule is that
          // nothing in flow carries a border once the surfaces do the work.
          'w-full shrink-0 bg-nx-surface-card md:flex md:w-[var(--spacing-nx-focus-aside)] md:flex-col',
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
          onStartGroupConversation={handleStartGroup}
        />
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 flex-col bg-nx-surface-page',
          activeConversationId ? 'flex' : 'hidden md:flex'
        )}
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

      {/* ONLY WITH A CONVERSATION OPEN — the column is about a person, and with nothing selected
          there is no person for it to be about. It hides itself below `xl` (its own class), which
          is the same order the shell folds in: the thing furthest from the content goes first. */}
      {activeConversationId && <ChatInfo header={header} />}
    </div>
  );
}
