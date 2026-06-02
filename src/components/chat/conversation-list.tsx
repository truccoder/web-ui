'use client';

import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { useCommunication } from './communication-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

export function ConversationList() {
  const { conversationsClient, dispatch } = useCommunication();
  const { conversations } = conversationsClient;
  const [search, setSearch] = useState('');
  const t = useT();

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
    if (diff < 60_000) return t('post.justNow');
    if (diff < 3_600_000) return t('post.minutesAgo', { minutes: Math.floor(diff / 60_000) });
    if (diff < 86_400_000) return t('post.hoursAgo', { hours: Math.floor(diff / 3_600_000) });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#242526]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-xl font-bold text-[#050505] dark:text-white">{t('chat.chats')}</h2>
        <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#e4e6eb] dark:bg-[#3a3b3c] hover:bg-[#d8dadf] dark:hover:bg-[#4e4f50] transition-colors text-[#050505] dark:text-white cursor-pointer">
          <Edit2 className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-3 py-[7px]">
          <svg
            className="h-4 w-4 text-[#65676b] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            placeholder={t('chat.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#050505] dark:text-white placeholder:text-[#65676b] outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <svg
              className="h-12 w-12 text-[#65676b] opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm text-[#65676b] dark:text-[#b0b3b8]">{t('chat.noConversations')}</p>
          </div>
        ) : (
          <div className="px-2">
            {filtered.map((conv) => (
              <button
                key={conv.sid}
                onClick={() => openChat(conv)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] transition-colors text-left cursor-pointer"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-[52px] w-[52px]">
                    <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                      {(conv.friendlyName ?? '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-[#242526]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm truncate',
                        conv.unreadCount > 0
                          ? 'font-bold text-[#050505] dark:text-white'
                          : 'font-medium text-[#050505] dark:text-white'
                      )}
                    >
                      {conv.friendlyName ?? 'Conversation'}
                    </p>
                    <span
                      className={cn(
                        'text-[11px] shrink-0',
                        conv.unreadCount > 0
                          ? 'text-[#0084ff] font-semibold'
                          : 'text-[#65676b] dark:text-[#b0b3b8]'
                      )}
                    >
                      {formatTime(conv.lastMessageDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                      className={cn(
                        'text-xs truncate',
                        conv.unreadCount > 0
                          ? 'font-semibold text-[#050505] dark:text-white'
                          : 'text-[#65676b] dark:text-[#b0b3b8]'
                      )}
                    >
                      {conv.lastMessage ?? t('chat.noConversations')}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="h-[18px] min-w-[18px] flex items-center justify-center rounded-full bg-[#0084ff] text-white text-[10px] font-bold px-[5px] shrink-0">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
