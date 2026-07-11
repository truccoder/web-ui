'use client';

import { useEffect, useRef, useState } from 'react';
import { Info, Smile, ThumbsUp, Send, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { useCommunication } from './communication-provider';
import { useConversation } from '@/lib/twilio/use-conversations';

interface MessengerConversationProps {
  conversationSid: string;
  peerName: string;
  peerAvatar?: string;
  peerIdentity: string;
}

type MessagePosition = 'single' | 'first' | 'middle' | 'last';

function getPosition(messages: { author: string | null }[], index: number): MessagePosition {
  const msg = messages[index];
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const samePrev = prev?.author === msg.author;
  const sameNext = next?.author === msg.author;
  if (!samePrev && !sameNext) return 'single';
  if (!samePrev && sameNext) return 'first';
  if (samePrev && sameNext) return 'middle';
  return 'last';
}

function bubbleRadius(isOwn: boolean, pos: MessagePosition) {
  if (isOwn) {
    switch (pos) {
      case 'single':
        return 'rounded-[18px]';
      case 'first':
        return 'rounded-[18px] rounded-br-[4px]';
      case 'middle':
        return 'rounded-[18px] rounded-r-[4px]';
      case 'last':
        return 'rounded-[18px] rounded-tr-[4px]';
    }
  } else {
    switch (pos) {
      case 'single':
        return 'rounded-[18px]';
      case 'first':
        return 'rounded-[18px] rounded-bl-[4px]';
      case 'middle':
        return 'rounded-[18px] rounded-l-[4px]';
      case 'last':
        return 'rounded-[18px] rounded-tl-[4px]';
    }
  }
}

function formatMessageTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86_400_000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessengerConversation({
  conversationSid,
  peerName,
  peerAvatar,
}: MessengerConversationProps) {
  const t = useT();
  const { conversationsClient, currentIdentity } = useCommunication();
  const { messages, isTyping, sendMessage, sendTyping } = useConversation(
    conversationSid,
    conversationsClient.client
  );

  const [input, setInput] = useState('');
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationSid]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1c1e21]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e6eb] dark:border-[#3a3b3c] shrink-0 bg-white dark:bg-[#1c1e21]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={peerAvatar} />
              <AvatarFallback className="font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                {peerName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-[#1c1e21]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#050505] dark:text-white leading-tight">
              {peerName}
            </p>
            <p className="text-xs text-green-500 font-medium leading-tight">
              {t('chat.activeNow')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            title="Info"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]"
          >
            <Info className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-[2px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Avatar className="h-20 w-20">
              <AvatarImage src={peerAvatar} />
              <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                {peerName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-[#050505] dark:text-white">{peerName}</p>
            <p className="text-sm text-[#65676b] dark:text-[#b0b3b8]">{t('chat.sayHi')}</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isOwn = msg.author === currentIdentity;
          const pos = getPosition(messages as { author: string | null }[], index);
          const showAvatar = !isOwn && (pos === 'single' || pos === 'last');
          const showTime = pos === 'single' || pos === 'last';
          const isGroupStart = index === 0 || messages[index - 1].author !== msg.author;

          return (
            <div
              key={msg.sid}
              className={cn(
                'flex items-end gap-2',
                isOwn ? 'flex-row-reverse' : 'flex-row',
                isGroupStart && index > 0 && 'mt-3'
              )}
              onMouseEnter={() => setHoveredMsg(msg.sid)}
              onMouseLeave={() => setHoveredMsg(null)}
            >
              {/* Peer avatar placeholder */}
              {!isOwn && (
                <div className="w-8 h-8 shrink-0">
                  {showAvatar && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={peerAvatar} />
                      <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                        {peerName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}

              <div className="flex flex-col max-w-[60%]">
                <div
                  className={cn(
                    'px-3 py-2 text-sm break-words leading-[1.4] cursor-default',
                    bubbleRadius(isOwn, pos),
                    isOwn
                      ? 'bg-[#0084ff] text-white'
                      : 'bg-[#f0f2f5] dark:bg-[#3a3b3c] text-[#050505] dark:text-white'
                  )}
                >
                  {msg.body}
                </div>

                {/* Timestamp on hover */}
                {showTime && hoveredMsg === msg.sid && msg.dateCreated && (
                  <p
                    className={cn(
                      'text-[11px] text-[#65676b] mt-1 px-1',
                      isOwn ? 'text-right' : 'text-left'
                    )}
                  >
                    {formatMessageTime(msg.dateCreated)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 mt-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={peerAvatar} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                {peerName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-[18px] rounded-bl-[4px] px-4 py-3">
              <div className="flex gap-[3px] items-center h-3">
                <span className="w-2 h-2 bg-[#8a8d91] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-[#8a8d91] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[#8a8d91] rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-[#e4e6eb] dark:border-[#3a3b3c] shrink-0 bg-white dark:bg-[#1c1e21]">
        <button className="w-9 h-9 flex items-center justify-center rounded-full text-[#0084ff] hover:bg-[#e7f3ff] dark:hover:bg-[#263951] transition-colors cursor-pointer shrink-0">
          <Smile className="h-5 w-5" />
        </button>

        <div className="flex-1 flex items-center bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-4 py-2 min-w-0">
          <input
            ref={inputRef}
            placeholder="Aa"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              sendTyping();
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none text-[#050505] dark:text-white placeholder:text-[#65676b] dark:placeholder:text-[#b0b3b8] min-w-0"
          />
        </div>

        <button
          onClick={input.trim() ? handleSend : undefined}
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#0084ff] hover:bg-[#e7f3ff] dark:hover:bg-[#263951] transition-colors cursor-pointer shrink-0"
        >
          {input.trim() ? <Send className="h-[18px] w-[18px]" /> : <ThumbsUp className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

// Empty state when no conversation is selected
export function MessengerEmpty() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-white dark:bg-[#1c1e21]">
      <div className="w-20 h-20 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] flex items-center justify-center">
        <MessageCircle className="h-10 w-10 text-[#65676b]" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg text-[#050505] dark:text-white">
          {t('chat.selectConversation')}
        </p>
        <p className="text-sm text-[#65676b] dark:text-[#b0b3b8] mt-1 max-w-xs">
          {t('chat.selectConversationDesc')}
        </p>
      </div>
    </div>
  );
}
