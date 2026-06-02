'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Phone, Video, ChevronDown, Smile, ThumbsUp, Send } from 'lucide-react';
import { useCommunication } from './communication-provider';
import { useConversation } from '@/lib/twilio/use-conversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  window: {
    conversationSid: string;
    peerName: string;
    peerAvatar?: string;
    peerIdentity: string;
    isMinimized: boolean;
  };
}

type MessagePosition = 'single' | 'first' | 'middle' | 'last';

function getPosition(
  messages: { author: string | null }[],
  index: number
): MessagePosition {
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
      case 'single': return 'rounded-[18px]';
      case 'first':  return 'rounded-[18px] rounded-br-[4px]';
      case 'middle': return 'rounded-[18px] rounded-r-[4px]';
      case 'last':   return 'rounded-[18px] rounded-tr-[4px]';
    }
  } else {
    switch (pos) {
      case 'single': return 'rounded-[18px]';
      case 'first':  return 'rounded-[18px] rounded-bl-[4px]';
      case 'middle': return 'rounded-[18px] rounded-l-[4px]';
      case 'last':   return 'rounded-[18px] rounded-tl-[4px]';
    }
  }
}

export function ChatWindow({ window: win }: ChatWindowProps) {
  const { dispatch, conversationsClient, currentIdentity } = useCommunication();
  const { messages, isTyping, sendMessage, sendTyping } = useConversation(
    win.conversationSid,
    conversationsClient.client
  );
  const t = useT();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!win.isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, win.isMinimized]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    sendTyping();
  };

  const startVideoCall = () =>
    dispatch({
      type: 'START_CALL',
      payload: {
        peer: { identity: win.peerIdentity, name: win.peerName, avatar: win.peerAvatar },
        callType: 'video',
      },
    });

  const startVoiceCall = () =>
    dispatch({
      type: 'START_CALL',
      payload: {
        peer: { identity: win.peerIdentity, name: win.peerName, avatar: win.peerAvatar },
        callType: 'voice',
      },
    });

  if (win.isMinimized) {
    return (
      <button
        onClick={() => dispatch({ type: 'MINIMIZE_CHAT_WINDOW', payload: win.conversationSid })}
        className="relative mb-2 w-12 h-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <Avatar className="w-12 h-12">
          <AvatarImage src={win.peerAvatar} />
          <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            {win.peerName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white" />
      </button>
    );
  }

  const headerActions = [
    { icon: Phone, onClick: startVoiceCall, label: t('chat.voiceCall') },
    { icon: Video, onClick: startVideoCall, label: t('chat.videoCall') },
    {
      icon: ChevronDown,
      onClick: () => dispatch({ type: 'MINIMIZE_CHAT_WINDOW', payload: win.conversationSid }),
      label: t('chat.minimize'),
    },
    {
      icon: X,
      onClick: () => dispatch({ type: 'CLOSE_CHAT_WINDOW', payload: win.conversationSid }),
      label: t('chat.close'),
    },
  ];

  return (
    <div className="w-[328px] h-[455px] bg-white dark:bg-[#242526] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="relative shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={win.peerAvatar} />
            <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
              {win.peerName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-[#242526]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#050505] dark:text-white leading-tight truncate">
            {win.peerName}
          </p>
          <p className="text-[11px] text-green-500 font-medium leading-tight">
            {t('chat.activeNow')}
          </p>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {headerActions.map(({ icon: Icon, onClick, label }) => (
            <button
              key={label}
              onClick={onClick}
              title={label}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer',
                label === t('chat.voiceCall') || label === t('chat.videoCall')
                  ? 'text-[#0084ff] hover:bg-blue-50 dark:hover:bg-[#3a3b3c]'
                  : 'text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-[2px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={win.peerAvatar} />
              <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                {win.peerName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold text-[#050505] dark:text-white">{win.peerName}</p>
            <p className="text-xs text-[#65676b] dark:text-[#b0b3b8]">{t('chat.sayHi')}</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isOwn = msg.author === currentIdentity;
          const pos = getPosition(messages as { author: string | null }[], index);
          const showAvatar = !isOwn && (pos === 'single' || pos === 'last');
          const isGroupStart =
            index === 0 || messages[index - 1].author !== msg.author;

          return (
            <div
              key={msg.sid}
              className={cn(
                'flex items-end gap-1',
                isOwn ? 'flex-row-reverse' : 'flex-row',
                isGroupStart && index > 0 && 'mt-2'
              )}
            >
              {!isOwn && (
                <div className="w-7 h-7 shrink-0">
                  {showAvatar && (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={win.peerAvatar} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                        {win.peerName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}

              <div
                className={cn(
                  'max-w-[68%] px-3 py-[7px] text-sm break-words leading-[1.35]',
                  bubbleRadius(isOwn, pos),
                  isOwn
                    ? 'bg-[#0084ff] text-white'
                    : 'bg-[#e4e6eb] dark:bg-[#3a3b3c] text-[#050505] dark:text-white'
                )}
              >
                {msg.body}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-1 mt-2">
            <div className="w-7 h-7 shrink-0">
              <Avatar className="h-7 w-7">
                <AvatarImage src={win.peerAvatar} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  {win.peerName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="bg-[#e4e6eb] dark:bg-[#3a3b3c] rounded-[18px] rounded-bl-[4px] px-4 py-3">
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
      <div className="flex items-center gap-1 px-2 py-2 shrink-0 border-t border-[#e4e6eb] dark:border-[#3a3b3c]">
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] transition-colors text-[#0084ff] shrink-0 cursor-pointer">
          <Smile className="h-5 w-5" />
        </button>

        <div className="flex-1 flex items-center bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-3 py-[7px] min-w-0">
          <input
            placeholder="Aa"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none text-[#050505] dark:text-white placeholder:text-[#65676b] dark:placeholder:text-[#b0b3b8] min-w-0"
          />
        </div>

        <button
          onClick={input.trim() ? handleSend : undefined}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c] transition-colors text-[#0084ff] shrink-0 cursor-pointer"
        >
          {input.trim() ? <Send className="h-4 w-4" /> : <ThumbsUp className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
