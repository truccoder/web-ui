'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { useChatClient } from '../hooks/use-chat-client';
import { useConversations } from '../hooks/use-conversations';
import { ConversationSidebar } from './conversation-sidebar';
import { FloatingChatWindow } from './floating-chat-window';

/**
 * The app shell's chat surface: a launcher button, the conversation list it opens, and the
 * conversation windows floating beside it.
 *
 * WHY THIS LIVES IN P2.7 AND NOT IN P3.4 WITH THE REST OF THE SHELL. A floating chat window
 * already exists in the running app (the Twilio `ChatBox`); removing it at P2.7d without a
 * replacement would delete working functionality, which Guardrail C forbids. P3.4 rebuilds the
 * shell and will only change where this is mounted, not what it does.
 *
 * ONE CONNECTION, TWO SURFACES. This reads the same `ChatClientProvider` as `/chats` — see the
 * provider for why connecting per-surface would be wrong. The provider is mounted once, in the
 * `(main)` layout, so the unread badge is live on every page; that is a shell-level decision
 * recorded in `findings/chat.md`, not something this component may take on itself.
 */
export interface ChatDockProps {
  className?: string;
}

/**
 * How many conversations may float at once, carried over from the Twilio dock it replaces
 * (`.slice(-3)`). Beyond three the row runs past the width of a laptop screen; opening a fourth
 * drops the oldest rather than refusing, so the click always does something visible.
 */
const MAX_WINDOWS = 3;

interface DockWindow {
  conversationId: string;
  isMinimized: boolean;
}

export function ChatDock({ className }: ChatDockProps) {
  const t = useT();
  const pathname = usePathname();
  const { status } = useChatClient();
  const { conversations, isLoading, startConversation } = useConversations();

  const [isListOpen, setIsListOpen] = useState(false);
  const [windows, setWindows] = useState<DockWindow[]>([]);

  const open = useCallback((conversationId: string) => {
    setWindows((current) => {
      // Already open: restore it instead of stacking a second copy of the same conversation.
      if (current.some((window) => window.conversationId === conversationId)) {
        return current.map((window) =>
          window.conversationId === conversationId ? { ...window, isMinimized: false } : window
        );
      }
      return [...current, { conversationId, isMinimized: false }].slice(-MAX_WINDOWS);
    });
    setIsListOpen(false);
  }, []);

  const toggleMinimize = useCallback((conversationId: string) => {
    setWindows((current) =>
      current.map((window) =>
        window.conversationId === conversationId
          ? { ...window, isMinimized: !window.isMinimized }
          : window
      )
    );
  }, []);

  const close = useCallback((conversationId: string) => {
    setWindows((current) => current.filter((window) => window.conversationId !== conversationId));
  }, []);

  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  );

  /**
   * Hidden on `/chats`, which shows the same conversations full-screen.
   *
   * The check is here rather than at the mount site on purpose: it is a fact about this component
   * (it duplicates the messenger page), not about the layout, and leaving it to each caller means
   * the day a second caller appears both surfaces show at once. Kept from the Twilio dock, which
   * did the same — Guardrail C.
   *
   * After the hooks, never before: bailing early would change the hook order between routes.
   */
  if (pathname.startsWith('/chats')) return null;

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 bottom-0 z-40', className)}>
      <div className="pointer-events-none flex items-end justify-end gap-3 px-4">
        {/* Windows sit left of the launcher column, oldest first so an arriving window does not
            shove the others sideways. */}
        <div className="pointer-events-auto flex items-end gap-3">
          {windows.map((window) => (
            <FloatingChatWindow
              key={window.conversationId}
              conversationId={window.conversationId}
              isMinimized={window.isMinimized}
              onToggleMinimize={toggleMinimize}
              onClose={close}
            />
          ))}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-3 pb-4">
          {isListOpen && (
            <div
              className={cn(
                'flex h-[500px] w-[360px] flex-col overflow-hidden',
                'rounded-nx-lg border border-nx-border-subtle bg-nx-surface-raised shadow-nx-3'
              )}
            >
              {/* The very same sidebar `/chats` uses. Its search, unread filter and new-message
                  panel are not worth a second implementation at a different width — it was written
                  to take all of its data as props for this. */}
              <ConversationSidebar
                conversations={conversations}
                isLoading={isLoading}
                status={status}
                onSelect={open}
                onStartConversation={startConversation}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsListOpen((current) => !current)}
            aria-label={t('chat.openChat')}
            aria-expanded={isListOpen}
            title={t('chat.openChat')}
            className={cn(
              'relative grid size-14 place-items-center rounded-nx-full',
              'bg-nx-accent text-white shadow-nx-3',
              'transition-transform duration-[var(--nx-duration-fast)] ease-nx-out',
              'hover:scale-105 active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
            )}
          >
            <MessageCircle className="size-6" />

            {totalUnread > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-nx-full px-2',
                  'bg-nx-status-danger text-nx-caption font-semibold text-white',
                  // Ring in the page background so the badge stays legible over the accent circle.
                  'ring-2 ring-nx-surface-page'
                )}
              >
                {/* Past 99 the exact number stops being information, as in `ConversationRow`. */}
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
