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
  const [connectionError, setConnectionError] = useState<string | null>(null);
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
      console.error('[Twilio] Failed to fetch conversations:', err);
    }
  }, []);

  useEffect(() => {
    if (!identity) return;

    let cancelled = false;

    async function init() {
      // Reset error state for fresh connection attempt (inside async fn – not synchronous in effect body)
      if (!cancelled) setConnectionError(null);

      try {
        console.log('[Twilio] Fetching token for identity:', identity);
        const token = await fetchTwilioToken(identity!);

        const newClient = new ConversationsClient(token);

        // Calling setState from event callbacks is fine per react-hooks/set-state-in-effect
        newClient.on('connectionStateChanged', (state) => {
          if (cancelled) return;
          console.log('[Twilio] Connection state:', state);
          setIsConnected(state === 'connected');
          if (state === 'connected') {
            // Trigger initial list load from the event callback, not the effect body
            updateConversationList(newClient);
          }
          if (state === 'denied' || state === 'error') {
            setConnectionError(`Connection ${state}`);
          }
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
          try {
            const newToken = await fetchTwilioToken(identity!);
            newClient.updateToken(newToken);
          } catch (err) {
            console.error('[Twilio] Token refresh failed:', err);
          }
        });

        clientRef.current = newClient;
        if (!cancelled) setClient(newClient);
      } catch (err) {
        console.error('[Twilio] Initialization failed:', err);
        if (!cancelled) {
          setConnectionError(err instanceof Error ? err.message : 'Connection failed');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      clientRef.current?.shutdown();
      clientRef.current = null;
    };
  }, [identity, updateConversationList]);

  const createOrGetConversation = useCallback(
    async (participantIdentity: string, friendlyName?: string): Promise<Conversation> => {
      if (!client) throw new Error('Twilio client not connected. Please wait and try again.');
      if (!identity) throw new Error('User identity not available.');

      const uniqueName = [identity, participantIdentity].sort().join('_');
      console.log('[Twilio] createOrGetConversation', { uniqueName, friendlyName });

      // ── Step 1: Get or create the conversation ──────────────────────────────
      let conv: Conversation;
      try {
        conv = await client.getConversationByUniqueName(uniqueName);
        console.log('[Twilio] Found existing conversation:', conv.sid);
      } catch {
        // Doesn't exist — create it
        try {
          conv = await client.createConversation({
            uniqueName,
            friendlyName: friendlyName ?? participantIdentity,
          });
          console.log('[Twilio] Created new conversation:', conv.sid);
        } catch (createErr: unknown) {
          // Race condition: someone else created it between our check and create
          const msg = String(createErr);
          if (
            msg.toLowerCase().includes('already exists') ||
            msg.includes('50433') ||
            msg.includes('50107')
          ) {
            console.log('[Twilio] Race condition — fetching existing conversation');
            conv = await client.getConversationByUniqueName(uniqueName);
          } else {
            console.error('[Twilio] createConversation failed:', createErr);
            throw createErr;
          }
        }
      }

      // ── Step 2: Ensure current user has joined ──────────────────────────────
      try {
        await conv.join();
        console.log('[Twilio] Joined conversation');
      } catch (joinErr: unknown) {
        // "already a participant" / "already joined" errors are expected — ignore them
        const msg = String(joinErr).toLowerCase();
        if (!msg.includes('already') && !msg.includes('participant') && !msg.includes('50408')) {
          console.warn('[Twilio] join() unexpected error:', joinErr);
        }
      }

      // ── Step 3: Ensure peer is a participant ────────────────────────────────
      try {
        const participants = await conv.getParticipants();
        console.log('[Twilio] Participants:', participants.map((p) => p.identity));

        const peerExists = participants.some((p) => p.identity === participantIdentity);
        if (!peerExists) {
          console.log('[Twilio] Adding peer participant:', participantIdentity);
          await conv.add(participantIdentity);
          console.log('[Twilio] Peer added successfully');
        } else {
          console.log('[Twilio] Peer already a participant');
        }
      } catch (addErr: unknown) {
        // Log but don't throw — the conversation still works for the creator.
        // The peer will see it once they connect.
        console.warn('[Twilio] add() peer warning:', addErr);
      }

      return conv;
    },
    [client, identity]
  );

  return {
    client,
    isConnected,
    connectionError,
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
    if (!conversationSid || !client) return;

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
        console.error('[Twilio] Failed to load conversation:', err);
      }
    }

    load();

    return () => {
      cancelled = true;
      activeConv?.removeAllListeners();
      // Reset state in cleanup (dependency changed or component unmounted) – not in effect body
      setConversation(null);
      setMessages([]);
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
