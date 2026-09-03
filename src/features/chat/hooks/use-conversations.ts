'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Channel, StreamChat } from 'stream-chat';
import { chatApi } from '../api/chat';
import { useChatClient } from './use-chat-client';
import type { ChatConversation } from '../types/chat';

/**
 * The signed-in user's conversation list, kept live.
 *
 * NOT REACT QUERY. Stream pushes every change over the websocket it already holds open — a new
 * message, a read receipt, being added to a channel — and the SDK applies them to its own store.
 * Mirroring that into a query cache would mean two copies of the same data with different update
 * paths, and the stale one would win about half the time. So the list is derived from the SDK on
 * each event instead.
 */

/** How many conversations one query asks for. No paging surface exists yet. */
const CHANNEL_LIMIT = 30;

/**
 * Channel type. `messaging` is Stream's built-in type for 1:1 and small-group chat, and the one
 * the backend's token grants access to by default.
 */
const CHANNEL_TYPE = 'messaging';

/**
 * Maps Stream's `Channel` onto this feature's own shape.
 *
 * Everything the UI reads is decided here, so no component ever imports `stream-chat` (see the
 * note on `ChatConversation` for why that boundary is worth the mapping code).
 */
function toConversation(channel: Channel, myUserId: string): ChatConversation {
  const members = Object.values(channel.state.members);

  /**
   * "THE OTHER PERSON" ONLY EXISTS IN A TWO-PERSON CHANNEL. Above that, `find` returns whichever
   * member Stream happened to list first — an arbitrary answer that would then be shown as the
   * conversation's title, drawn as its avatar, and looked up for reputation in `ChatInfo`. Groups
   * report null instead, which is what makes the title fall through to the group's own name.
   */
  const other = members.length === 2 ? members.find((member) => member.user_id !== myUserId) : null;

  // `state.messages` is ordered oldest-first, so the newest is the last element.
  const lastMessage = channel.state.messages.at(-1);

  return {
    id: channel.id ?? '',
    name: channel.data?.name ?? null,
    otherMemberId: other?.user_id ?? null,
    otherMemberName: other?.user?.name ?? null,
    otherMemberImage: (other?.user?.image as string | undefined) ?? null,
    memberCount: members.length,
    members: members.map((member) => ({
      id: member.user_id ?? member.user?.id ?? '',
      name: member.user?.name ?? null,
      image: (member.user?.image as string | undefined) ?? null,
    })),
    lastMessage: lastMessage?.text ?? null,
    lastMessageAt: lastMessage?.created_at ? new Date(lastMessage.created_at).toISOString() : null,
    unreadCount: channel.countUnread(),
  };
}

/**
 * Events that change what the list should say.
 *
 * `notification.*` fire for channels the client is not currently watching, `message.new` and
 * `message.read` for the ones it is. Listening to only one half leaves the sidebar stale exactly
 * when a message arrives for a conversation the user does not have open — which is the case that
 * matters most.
 */
const LIST_EVENTS = [
  'message.new',
  'message.read',
  'notification.message_new',
  'notification.mark_read',
  'notification.added_to_channel',
] as const;

/**
 * Stable empty list for the disconnected case.
 *
 * A fresh `[]` on every render would be a new reference each time, which turns any consumer's
 * `useMemo`/`useEffect` over `conversations` into one that never settles.
 */
const NO_CONVERSATIONS: ChatConversation[] = [];

export function useConversations() {
  const { client, userId, status } = useChatClient();

  const [loaded, setLoaded] = useState<ChatConversation[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isConnected = Boolean(client && userId);

  /**
   * DERIVED, NOT STORED, for the disconnected case.
   *
   * The obvious shape is an effect that clears the list when the client goes away, but writing
   * state from an effect body is exactly what `react-hooks/set-state-in-effect` forbids — and the
   * rule is right: it schedules a second render to express something the first render already
   * knew. Masking the stale list behind `isConnected` says the same thing without the extra pass,
   * and it still guarantees a disconnect never leaves the previous user's conversations on screen.
   */
  const conversations = isConnected ? loaded : NO_CONVERSATIONS;
  const isLoading = isConnected ? isLoadingChannels : status === 'connecting';

  const load = useCallback(async (streamClient: StreamChat, myUserId: string) => {
    const channels = await streamClient.queryChannels(
      { type: CHANNEL_TYPE, members: { $in: [myUserId] } },
      // Newest conversation first, the ordering every messenger uses.
      [{ last_message_at: -1 }],
      // `watch` subscribes to updates for each channel; `state` fills in members and recent
      // messages so the row can show a preview without a second round trip per channel.
      { watch: true, state: true, limit: CHANNEL_LIMIT }
    );

    return channels.map((channel) => toConversation(channel, myUserId));
  }, []);

  useEffect(() => {
    if (!client || !userId) return;

    let cancelled = false;

    const refresh = async () => {
      try {
        const next = await load(client, userId);
        if (!cancelled) {
          setLoaded(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoadingChannels(false);
      }
    };

    refresh();

    // One listener per event, each re-deriving the whole list. Re-querying is cheap because
    // `queryChannels` is served from the SDK's local state for channels it already watches, and
    // correctness beats surgical patching here: an incremental update that misses a case leaves a
    // permanently wrong unread badge.
    const subscriptions = LIST_EVENTS.map((event) => client.on(event, refresh));

    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [client, userId, load]);

  /**
   * Opens the 1:1 conversation with another user, creating it on first use.
   *
   * DISTINCT-BY-MEMBERS, NOT BY ID: passing `members` without an id asks Stream for *the* channel
   * with exactly those two people, so both sides land in the same conversation and calling this
   * twice does not produce a duplicate. Making up an id (`dm-9001-9004`) would require both
   * clients to sort the ids identically forever.
   *
   * NOTHING GATES WHO MAY BE MESSAGED. Channel creation happens here on the client, so the
   * friendship graph is not consulted — decided as option (a) in `findings/chat.md` R6.
   *
   * AND NOW THE UI CAN ACTUALLY OFFER NON-FRIENDS, which it could not before. The note that used
   * to end this paragraph ("The UI only ever offers friends as targets") was not a convention — it
   * was a limit: `GET /token` upserts the caller and their FRIENDS into Stream, and Stream refuses
   * to create a channel containing a user it has never seen, so `watch()` failed for anyone else
   * with an error about the member rather than about the cause.
   *
   * `ensureParticipants` introduces the pair first. It is idempotent and safe for friends too, so
   * it runs unconditionally rather than after a check this hook would have to make against another
   * feature's data.
   */
  const startConversation = useCallback(
    async (otherUserId: string): Promise<string> => {
      if (!client || !userId) {
        throw new Error('Chat is not connected');
      }

      // Before the channel, not after: Stream rejects a member it has never seen, and the failure
      // reads as a channel error rather than a missing-user one.
      await chatApi.ensureParticipants(Number(otherUserId));

      const channel = client.channel(CHANNEL_TYPE, {
        members: [userId, otherUserId],
      });

      // `watch` both creates the channel if it does not exist and subscribes to it.
      await channel.watch();

      if (!channel.id) {
        throw new Error('Stream returned a channel without an id');
      }

      return channel.id;
    },
    [client, userId]
  );

  /**
   * Opens a named group conversation with two or more other people.
   *
   * THE BACKEND CREATES THE CHANNEL, NOT THIS CLIENT, and that is the whole difference from
   * `startConversation` above. `POST /chat/groups` names the caller as owner from the
   * authenticated principal, checks blocks across EVERY pair rather than only the pairs involving
   * the caller, and upserts all the members into Stream in one batch. A client-side version of
   * this would get the first two wrong and would cost one request per member for the third.
   *
   * SO `ensureParticipants` IS NOT CALLED HERE. That is not an oversight to be "fixed" by adding
   * it for symmetry — the group endpoint already did the upsert, and calling it per member would
   * reinstate exactly the n-request loop this endpoint exists to remove.
   *
   * WATCHED BY ID, NOT BY MEMBERS. A direct message is looked up by its membership so both sides
   * land in the same channel; a group is not distinct by membership at all — two people can want
   * two different groups with the same people, which is why the backend mints a random
   * `grp-<uuid>` rather than deriving one. Passing `members` here would ask Stream for a different
   * channel than the one just created.
   */
  const startGroupConversation = useCallback(
    async (name: string, otherUserIds: string[], imageUrl?: string): Promise<string> => {
      if (!client || !userId) {
        throw new Error('Chat is not connected');
      }

      const handle = await chatApi.createGroup({
        name,
        // Strings on the way in (they came from Stream ids and from the picker's keys), numbers on
        // the wire — `memberIds` is `List<Integer>` and a string id fails bean validation as a
        // 422 that names a field the caller never typed.
        memberIds: otherUserIds.map(Number),
        imageUrl,
      });

      const channel = client.channel(CHANNEL_TYPE, handle.channelId);
      await channel.watch();

      return handle.channelId;
    },
    [client, userId]
  );

  return { conversations, isLoading, error, startConversation, startGroupConversation };
}
