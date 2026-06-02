'use client';

import { usePathname } from 'next/navigation';
import { useCommunication } from './communication-provider';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';

export function ChatBox() {
  const pathname = usePathname();
  const { state, dispatch, conversationsClient } = useCommunication();
  const totalUnread = conversationsClient.conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Hide the floating chat UI entirely when the user is on the dedicated /chats page
  if (pathname.startsWith('/chats')) return null;

  return (
    <>
      {/* Floating chat windows – stack left of the toggle button */}
      <div className="fixed bottom-0 right-[76px] z-50 flex items-end gap-2">
        {state.openWindows.map((win) => (
          <ChatWindow key={win.conversationSid} window={win} />
        ))}
      </div>

      {/* Conversation list panel */}
      {state.isChatListOpen && (
        <div className="fixed bottom-[76px] right-4 z-50 w-[360px] h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 bg-white dark:bg-[#242526]">
          <ConversationList />
        </div>
      )}

      {/* Messenger-style toggle button */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_CHAT_LIST' })}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer bg-gradient-to-br from-[#0099ff] to-[#a033ff]"
      >
        <MessengerIcon className="w-[30px] h-[30px] text-white" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    </>
  );
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="currentColor" className={className}>
      <path d="M18 2C9.163 2 2 8.768 2 17.1c0 4.573 1.977 8.67 5.148 11.565V34l4.796-2.633A17.49 17.49 0 0018 32.2c8.837 0 16-6.768 16-15.1S26.837 2 18 2z" />
      <path
        fill="url(#msng-grad)"
        d="M18 2C9.163 2 2 8.768 2 17.1c0 4.573 1.977 8.67 5.148 11.565V34l4.796-2.633A17.49 17.49 0 0018 32.2c8.837 0 16-6.768 16-15.1S26.837 2 18 2z"
      />
      <path
        fill="white"
        d="M9.5 21.5 15.5 14l5.25 5 5.75-5-6 7.5L15.25 17 9.5 21.5z"
      />
    </svg>
  );
}
