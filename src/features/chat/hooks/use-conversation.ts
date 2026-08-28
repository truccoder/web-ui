'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Channel, LocalMessage, MessageResponse } from 'stream-chat';
import { useChatClient } from './use-chat-client';
import type { ChatConversation, ChatMessage } from '../types/chat';

/**
 * One open conversation: its messages, its header details, and sending.
 *
 * Same reasoning as `useConversations` for staying out of React Query — the message list is a
 * live view of the SDK's channel state, not a fetched snapshot.
 */

const CHANNEL_TYPE = 'messaging';

/** Maps Stream's message onto this feature's shape, so components never import `stream-chat`. */
function toMessage(message: LocalMessage | MessageResponse): ChatMessage {
  return {
    id: message.id,
    text: message.text ?? '',
    senderId: message.user?.id ?? '',
    senderName: message.user?.name ?? null,
    senderImage: (message.user?.image as string | undefined) ?? null,
    createdAt: message.created_at ? new Date(message.created_at).toISOString() : '',
  };
}

/** The header details for an open conversation, derived from its membership. */
function toHeader(
  channel: Channel,
  myUserId: string
): Pick<
  ChatConversation,
  'id' | 'name' | 'otherMemberId' | 'otherMemberName' | 'otherMemberImage' | 'memberCount'
> {
  const members = Object.values(channel.state.members);

  // Same rule as `toConversation`: there is no "other person" in a group, and picking the first
  // one would title the thread after an arbitrary member and send `ChatInfo` to look up their
  // reputation. See the note on `ChatConversation.otherMemberId`.
  const other = members.length === 2 ? members.find((member) => member.user_id !== myUserId) : null;

  return {
    id: channel.id ?? '',
    name: channel.data?.name ?? null,
    otherMemberId: other?.user_id ?? null,
    otherMemberName: other?.user?.name ?? null,
    otherMemberImage: (other?.user?.image as string | undefined) ?? null,
    memberCount: members.length,
  };
}

type ConversationHeader = ReturnType<typeof toHeader>;

/** Stable empty list — a fresh `[]` per render would break consumers' memo dependencies. */
const NO_MESSAGES: ChatMessage[] = [];

export function useConversation(conversationId: string | null) {
  const { client, userId } = useChatClient();

  /**
   * STATE IS TAGGED WITH THE CONVERSATION IT BELONGS TO, and everything the caller reads is
   * derived from that tag rather than reset when the id changes.
   *
   * The obvious version — an effect that clears messages at the top when `conversationId` changes
   * — is what `react-hooks/set-state-in-effect` rejects, and avoiding it fixes a real glitch as
   * well as a lint error: with a reset, switching conversations renders the *previous* thread for
   * one frame before the effect runs, so the wrong messages flash under the new header. Tagging
   * makes stale data unreadable by construction, and `isLoading` stops needing its own state at
   * all: "loading" is just "nothing loaded or failed for this id yet".
   */
  const [loaded, setLoaded] = useState<{
    forId: string;
    messages: ChatMessage[];
    header: ConversationHeader;
  } | null>(null);
  const [failure, setFailure] = useState<{ forId: string; message: string } | null>(null);

  const isCurrent = Boolean(conversationId) && loaded?.forId === conversationId;
  const messages = isCurrent ? loaded!.messages : NO_MESSAGES;
  const header = isCurrent ? loaded!.header : null;
  const error = failure?.forId === conversationId ? failure.message : null;
  const isLoading = Boolean(conversationId) && !isCurrent && error === null;

  /**
   * The watched channel, kept in a ref rather than state.
   *
   * `send` and `markRead` need it, but nothing renders from it — putting it in state would
   * re-render every consumer each time the SDK swapped the object, for no visible change.
   */
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    channelRef.current = null;

    if (!client || !userId || !conversationId) return;

    let cancelled = false;

    const channel = client.channel(CHANNEL_TYPE, conversationId);

    const sync = () => {
      if (cancelled) return;
      setLoaded({
        forId: conversationId,
        messages: channel.state.messages.map(toMessage),
        header: toHeader(channel, userId),
      });
    };

    const open = async () => {
      try {
        await channel.watch();
        if (cancelled) return;

        channelRef.current = channel;
        sync();

        /**
         * Marking read on open is what clears the unread badge. It is fire-and-forget: a failed
         * read receipt is not worth blocking the messages the user came to read, and the next
         * open will try again.
         */
        channel.markRead().catch(() => {});
      } catch (err) {
        if (!cancelled) {
          setFailure({
            forId: conversationId,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };

    open();

    /**
     * A message arriving while the conversation is open is read the moment it lands.
     *
     * FOUND BY LOOKING AT THE SCREEN, not by reading the code: marking read only on open leaves
     * the sidebar showing "1 unread" for a conversation the reader is staring at, because the
     * message arrived after the `markRead` on open had already run.
     *
     * Skipped for one's own messages — the echo of a send is not something to acknowledge, and
     * doing so would double the write traffic of every message sent.
     */
    const markIncomingRead = (event: { user?: { id?: string } }) => {
      if (cancelled || event.user?.id === userId) return;
      channel.markRead().catch(() => {});
    };

    // `message.updated`/`message.deleted` matter as much as `message.new`: without them an edited
    // message keeps its old text on screen until the conversation is reopened.
    const subscriptions = [
      channel.on('message.new', sync),
      channel.on('message.new', markIncomingRead),
      channel.on('message.updated', sync),
      channel.on('message.deleted', sync),
    ];

    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      // Deliberately NOT calling `channel.stopWatching()`: the conversation list watches the same
      // channels, and stopping here would silence its live updates too.
    };
  }, [client, userId, conversationId]);

  /**
   * Sends a message.
   *
   * NO OPTIMISTIC APPEND. The SDK echoes the sent message back through `message.new` within the
   * same round trip, and `sync` picks it up — adding a local copy first would show it twice for
   * that instant, then need reconciling by id. Empty and whitespace-only text is refused here
   * because Stream accepts it and it renders as a blank bubble nobody can delete.
   */
  const send = useCallback(async (text: string) => {
    const channel = channelRef.current;
    const trimmed = text.trim();

    if (!channel || !trimmed) return;

    await channel.sendMessage({ text: trimmed });
  }, []);

  return { messages, header, isLoading, error, send };
}
