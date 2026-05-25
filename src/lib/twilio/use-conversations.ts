'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Client as ConversationsClient,
  Conversation,
  Message,
  Participant,
} from '@twilio/conversations';
import { fetchTwilioToken } from './token';

interface ConversationSummary {
  sid: string;
  friendlyName: string | null;
  lastMessage?: string;
  lastMessageDate?: Date;
  lastMessageAuthor?: string;
  unreadCount: number;
}

export function useConversationsClient(identity: string | null) {
  const [client, setClient] = useState<ConversationsClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const clientRef = useRef<ConversationsClient | null>(null);

  const updateConversationList = useCallback(async (c: ConversationsClient) => {
    try {
      const paginator = await c.getSubscribedConversations();
      const items = paginator.items;

      const summaries: ConversationSummary[] = await Promise.all(
        items.map(async (conv) => {
          let lastMessage: string | undefined;
          let lastMessageDate: Date | undefined;
          let lastMessageAuthor: string | undefined;
          let unreadCount = 0;

          try {
            const messages = await conv.getMessages(1);
            const last = messages.items[0];
            if (last) {
              lastMessage = last.body ?? undefined;
              lastMessageDate = last.dateCreated ?? undefined;
              lastMessageAuthor = last.author ?? undefined;
            }
            const count = await conv.getUnreadMessagesCount();
            unreadCount = count ?? 0;
          } catch {}

          return {
            sid: conv.sid,
            friendlyName: conv.friendlyName,
            lastMessage,
            lastMessageDate,
            lastMessageAuthor,
            unreadCount,
          };
        })
      );

      summaries.sort((a, b) => {
        const da = a.lastMessageDate?.getTime() ?? 0;
        const db = b.lastMessageDate?.getTime() ?? 0;
        return db - da;
      });

      setConversations(summaries);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, []);

  useEffect(() => {
    if (!identity) return;

    let cancelled = false;

    async function init() {
      try {
        const token = await fetchTwilioToken(identity!);
        const newClient = new ConversationsClient(token);

        newClient.on('connectionStateChanged', (state) => {
          if (cancelled) return;
          setIsConnected(state === 'connected');
        });

        newClient.on('conversationJoined', () => {
          if (cancelled) return;
          updateConversationList(newClient);
        });

        newClient.on('conversationLeft', () => {
          if (cancelled) return;
          updateConversationList(newClient);
        });

        newClient.on('messageAdded', () => {
          if (cancelled) return;
          updateConversationList(newClient);
        });

        newClient.on('tokenAboutToExpire', async () => {
          const newToken = await fetchTwilioToken(identity!);
          newClient.updateToken(newToken);
        });

        clientRef.current = newClient;
        if (!cancelled) setClient(newClient);
      } catch (err) {
        console.error('Failed to initialize Conversations client:', err);
      }
    }

    init();

    return () => {
      cancelled = true;
      clientRef.current?.shutdown();
      clientRef.current = null;
    };
  }, [identity, updateConversationList]);

  useEffect(() => {
    if (!client || !isConnected) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateConversationList(client).catch(console.error);
  }, [client, isConnected, updateConversationList]);

  const createOrGetConversation = useCallback(
    async (participantIdentity: string, friendlyName?: string) => {
      if (!client) throw new Error('Client not connected');

      const uniqueName = [identity, participantIdentity].sort().join('_');

      try {
        const existing = await client.getConversationByUniqueName(uniqueName);
        return existing;
      } catch {
        const conv = await client.createConversation({
          uniqueName,
          friendlyName: friendlyName ?? participantIdentity,
        });
        await conv.join();
        await conv.add(participantIdentity);
        return conv;
      }
    },
    [client, identity]
  );

  return {
    client,
    isConnected,
    conversations,
    createOrGetConversation,
    refreshConversations: () => client && updateConversationList(client),
  };
}

export function useConversation(
  conversationSid: string | null,
  client: ConversationsClient | null
) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingParticipant, setTypingParticipant] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationSid || !client) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversation(null);
      setMessages([]);
      return;
    }

    let cancelled = false;
    let activeConv: Conversation | null = null;

    async function load() {
      try {
        const conv = await client!.getConversationBySid(conversationSid!);
        if (cancelled) return;

        activeConv = conv;
        setConversation(conv);

        const msgPaginator = await conv.getMessages(50);
        if (!cancelled) setMessages(msgPaginator.items);

        const parts = await conv.getParticipants();
        if (!cancelled) setParticipants(parts);

        await conv.setAllMessagesRead();

        conv.on('messageAdded', (msg) => {
          if (!cancelled) {
            setMessages((prev) => [...prev, msg]);
            conv.setAllMessagesRead();
          }
        });

        conv.on('typingStarted', (participant) => {
          if (!cancelled) {
            setIsTyping(true);
            setTypingParticipant(participant.identity ?? null);
          }
        });

        conv.on('typingEnded', () => {
          if (!cancelled) {
            setIsTyping(false);
            setTypingParticipant(null);
          }
        });
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    }

    load();

    return () => {
      cancelled = true;
      activeConv?.removeAllListeners();
    };
  }, [conversationSid, client]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!conversation) return;
      await conversation.sendMessage(body);
    },
    [conversation]
  );

  const sendTyping = useCallback(() => {
    conversation?.typing();
  }, [conversation]);

  return {
    conversation,
    messages,
    participants,
    isTyping,
    typingParticipant,
    sendMessage,
    sendTyping,
  };
}
