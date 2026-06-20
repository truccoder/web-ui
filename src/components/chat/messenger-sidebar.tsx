'use client';

import { useState } from 'react';
import { Edit2, Search, X, MessageCircle, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { useCommunication } from './communication-provider';
import { useFriends } from '@/lib/hooks/use-friendship';
import type { Profile } from '@/lib/types';

interface ConversationSummary {
  sid: string;
  friendlyName: string | null;
  lastMessage?: string;
  lastMessageDate?: Date;
  lastMessageAuthor?: string;
  unreadCount: number;
}

interface MessengerSidebarProps {
  conversations: ConversationSummary[];
  activeSid: string | null;
  onSelect: (sid: string) => void;
  onNewConversation: (friend: Profile) => Promise<void>;
  isConnected: boolean;
  connectionError: string | null;
}

type Filter = 'all' | 'unread';

function formatTime(date?: Date): string {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function NewChatPanel({
  onClose,
  onStart,
  isConnected,
}: {
  onClose: () => void;
  onStart: (friend: Profile) => Promise<void>;
  isConnected: boolean;
}) {
  const t = useT();
  const { data: friends } = useFriends();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = (friends ?? []).filter((f) =>
    f.fullname.toLowerCase().includes(search.toLowerCase())
  );

  const handleStart = async (friend: Profile) => {
    if (!isConnected) {
      toast.error('Twilio not connected yet. Please wait a moment.');
      return;
    }
    setLoading(friend.id);
    try {
      await onStart(friend);
    } catch (err) {
      console.error('[Messenger] Failed to create conversation:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to open conversation. Check console for details.'
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1c1e21]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#e4e6eb] dark:bg-[#3a3b3c] hover:bg-[#d8dadf] dark:hover:bg-[#4e4f50] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4 text-[#050505] dark:text-white" />
        </button>
        <h2 className="font-bold text-[#050505] dark:text-white">{t('chat.newChat')}</h2>
        <div className="ml-auto">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
          )}
        </div>

      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[#65676b] shrink-0" />
          <input
            autoFocus
            placeholder={t('chat.searchFriends')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#050505] dark:text-white placeholder:text-[#65676b] outline-none"
          />
        </div>
      </div>

      {/* Friends list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
            <MessageCircle className="h-8 w-8 text-[#65676b] opacity-40" />
            <p className="text-sm text-[#65676b] dark:text-[#b0b3b8]">
              {friends?.length === 0 ? t('chat.noFriendsToMessage') : 'No results'}
            </p>
            {friends?.length === 0 && (
              <p className="text-xs text-[#65676b] dark:text-[#b0b3b8]">
                {t('chat.addFriendsFirst')}
              </p>
            )}
          </div>
        ) : (
          <div className="px-2">
            {filtered.map((friend) => (
              <button
                key={friend.id}
                onClick={() => handleStart(friend)}
                disabled={loading === friend.id}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] transition-colors text-left cursor-pointer disabled:opacity-60"
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={friend.profilePictureUrl} />
                  <AvatarFallback className="font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                    {friend.fullname[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#050505] dark:text-white truncate">
                    {friend.fullname}
                  </p>
                  {loading === friend.id && (
                    <p className="text-xs text-[#65676b]">{t('chat.creating')}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MessengerSidebar({
  conversations,
  activeSid,
  onSelect,
  onNewConversation,
  isConnected,
  connectionError,
}: MessengerSidebarProps) {
  const t = useT();
  const { currentIdentity } = useCommunication();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showNewChat, setShowNewChat] = useState(false);

  const filtered = conversations.filter((c) => {
    const matchSearch = (c.friendlyName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'unread' && c.unreadCount > 0);
    return matchSearch && matchFilter;
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  if (showNewChat) {
    return (
      <NewChatPanel
        onClose={() => setShowNewChat(false)}
        onStart={onNewConversation}
        isConnected={isConnected}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1c1e21]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <h1 className="text-2xl font-bold text-[#050505] dark:text-white">{t('chat.chats')}</h1>
        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          {isConnected ? (
            <span title="Connected"><Wifi className="h-4 w-4 text-green-500" /></span>
          ) : (
            <span title="Connecting..."><Loader2 className="h-4 w-4 text-yellow-500 animate-spin" /></span>
          )}
          <button
            onClick={() => setShowNewChat(true)}
            title={t('chat.newChat')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#e4e6eb] dark:bg-[#3a3b3c] hover:bg-[#d8dadf] dark:hover:bg-[#4e4f50] transition-colors text-[#050505] dark:text-white cursor-pointer"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Connection error banner */}
      {connectionError && (
        <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 shrink-0">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{connectionError}</p>
        </div>
      )}

      {/* Not connected yet */}
      {!isConnected && !connectionError && (
        <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 shrink-0">
          <WifiOff className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-400">Connecting to chat server...</p>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-3 py-[7px]">
          <Search className="h-4 w-4 text-[#65676b] shrink-0" />
          <input
            placeholder={t('chat.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#050505] dark:text-white placeholder:text-[#65676b] outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#65676b] hover:text-[#050505] cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pb-3 shrink-0">
        {(['all', 'unread'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer',
              filter === f
                ? 'bg-[#0084ff] text-white'
                : 'bg-[#e4e6eb] dark:bg-[#3a3b3c] text-[#050505] dark:text-white hover:bg-[#d8dadf] dark:hover:bg-[#4e4f50]'
            )}
          >
            {f === 'all' ? t('chat.all') : t('chat.unread')}
            {f === 'unread' && totalUnread > 0 && (
              <span className="ml-1 text-xs">({totalUnread})</span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-[#65676b]" />
            </div>
            <p className="text-sm text-[#65676b] dark:text-[#b0b3b8]">
              {t('chat.noConversations')}
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="text-sm text-[#0084ff] font-medium hover:underline cursor-pointer"
            >
              {t('chat.startNewChat')}
            </button>
          </div>
        ) : (
          <div className="px-2">
            {filtered.map((conv) => {
              const isActive = conv.sid === activeSid;
              const isOwn = conv.lastMessageAuthor === currentIdentity;

              return (
                <button
                  key={conv.sid}
                  onClick={() => onSelect(conv.sid)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors text-left cursor-pointer',
                    isActive
                      ? 'bg-[#e7f3ff] dark:bg-[#263951]'
                      : 'hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-[54px] w-[54px]">
                      <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                        {(conv.friendlyName ?? '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-[#1c1e21]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
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

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p
                        className={cn(
                          'text-xs truncate',
                          conv.unreadCount > 0
                            ? 'font-semibold text-[#050505] dark:text-white'
                            : 'text-[#65676b] dark:text-[#b0b3b8]'
                        )}
                      >
                        {isOwn && conv.lastMessage ? `${t('chat.you')}: ` : ''}
                        {conv.lastMessage ?? t('chat.noConversations')}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-[#0084ff] text-white text-[10px] font-bold px-[5px] shrink-0">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
