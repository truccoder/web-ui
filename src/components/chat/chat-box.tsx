'use client';

import { MessageCircle } from 'lucide-react';
import { useCommunication } from './communication-provider';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';
import { Badge } from '@/components/ui/badge';

export function ChatBox() {
  const { state, dispatch, conversationsClient } = useCommunication();
  const totalUnread = conversationsClient.conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <>
      {/* Floating chat windows */}
      <div className="fixed bottom-0 right-20 z-50 flex items-end gap-2">
        {state.openWindows.map((win) => (
          <ChatWindow key={win.conversationSid} window={win} />
        ))}
      </div>

      {/* Conversation list panel */}
      {state.isChatListOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 h-[480px] bg-card border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          <ConversationList />
        </div>
      )}

      {/* Floating chat toggle button */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_CHAT_LIST' })}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
      >
        <MessageCircle className="h-5 w-5 text-white" />
        {totalUnread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 text-white border-2 border-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </button>
    </>
  );
}
