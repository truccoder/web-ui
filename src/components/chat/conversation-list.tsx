'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useCommunication } from './communication-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function ConversationList() {
  const { conversationsClient, dispatch } = useCommunication();
  const { conversations } = conversationsClient;
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    (c.friendlyName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openChat = (conv: (typeof conversations)[0]) => {
    dispatch({
      type: 'OPEN_CHAT_WINDOW',
      payload: {
        conversationSid: conv.sid,
        peerName: conv.friendlyName ?? 'Chat',
        peerIdentity: conv.sid,
        isMinimized: false,
      },
    });
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-base">Messages</h3>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_CHAT_LIST' })}
          className="p-1 rounded hover:bg-accent transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <MessageCircleIcon className="h-8 w-8 mb-2 opacity-50" />
            <p>No conversations yet</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.sid}
              onClick={() => openChat(conv)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left cursor-pointer"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="text-sm font-medium">
                  {(conv.friendlyName ?? '?')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {conv.friendlyName ?? 'Conversation'}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {formatTime(conv.lastMessageDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage ?? 'No messages'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge className="h-4 min-w-4 flex items-center justify-center p-0 text-[10px] bg-blue-600 ml-2 shrink-0">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

function MessageCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
