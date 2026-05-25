'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, X, Send, Phone, Video } from 'lucide-react';
import { useCommunication } from './communication-provider';
import { useConversation } from '@/lib/twilio/use-conversations';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

export function ChatWindow({ window: win }: ChatWindowProps) {
  const { dispatch, conversationsClient, currentIdentity } = useCommunication();
  const { messages, isTyping, sendMessage, sendTyping } = useConversation(
    win.conversationSid,
    conversationsClient.client
  );

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

  const startVideoCall = () => {
    dispatch({
      type: 'START_CALL',
      payload: {
        peer: {
          identity: win.peerIdentity,
          name: win.peerName,
          avatar: win.peerAvatar,
        },
        callType: 'video',
      },
    });
  };

  const startVoiceCall = () => {
    dispatch({
      type: 'START_CALL',
      payload: {
        peer: {
          identity: win.peerIdentity,
          name: win.peerName,
          avatar: win.peerAvatar,
        },
        callType: 'voice',
      },
    });
  };

  if (win.isMinimized) {
    return (
      <button
        onClick={() =>
          dispatch({
            type: 'MINIMIZE_CHAT_WINDOW',
            payload: win.conversationSid,
          })
        }
        className="w-12 h-12 rounded-full bg-card border shadow-lg flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">{win.peerName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </button>
    );
  }

  return (
    <div className="w-80 h-[420px] bg-card border rounded-t-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">{win.peerName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">{win.peerName}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={startVoiceCall}
            title="Voice call"
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={startVideoCall}
            title="Video call"
          >
            <Video className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              dispatch({
                type: 'MINIMIZE_CHAT_WINDOW',
                payload: win.conversationSid,
              })
            }
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              dispatch({
                type: 'CLOSE_CHAT_WINDOW',
                payload: win.conversationSid,
              })
            }
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.map((msg) => {
          const isOwn = msg.author === currentIdentity;
          return (
            <div key={msg.sid} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] px-3 py-1.5 rounded-2xl text-sm break-words',
                  isOwn ? 'bg-blue-600 text-white rounded-br-md' : 'bg-muted rounded-bl-md'
                )}
              >
                {msg.body}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Aa"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm rounded-full"
          />
          <Button
            size="icon"
            className="h-8 w-8 rounded-full shrink-0"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
