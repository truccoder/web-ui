'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Attachment, Channel, LocalMessage, MessageResponse } from 'stream-chat';
import { useChatClient } from './use-chat-client';
import type {
  ChatAttachment,
  ChatConversation,
  ChatMediaItem,
  ChatMessage,
  ChatSharedMedia,
} from '../types/chat';

/**
 * One open conversation: its messages, its header details, and sending.
 *
 * Same reasoning as `useConversations` for staying out of React Query — the message list is a
 * live view of the SDK's channel state, not a fetched snapshot.
 */

const CHANNEL_TYPE = 'messaging';

/** Attachment types the shared-media list collects — the same set `toChatAttachment` keeps. */
const MEDIA_ATTACHMENT_TYPES = ['image', 'file', 'video', 'audio'];

/** How far back the one-shot history search reaches. Newer items beyond it still arrive live. */
const SHARED_MEDIA_LIMIT = 60;

/**
 * Maps one Stream attachment onto this feature's shape, or drops it.
 *
 * `image` AND `file` ONLY. Stream tags an uploaded picture `image` and an uploaded document
 * `file`; `sendFile` on a video or audio clip comes back tagged `video`/`audio`, which render the
 * same download row here. Everything else — link previews Stream unfurled from a pasted URL, Giphy,
 * location — is returned `null` and filtered out, so a message that merely contains a link does not
 * sprout a broken thumbnail.
 */
function toChatAttachment(attachment: Attachment): ChatAttachment | null {
  const name = attachment.fallback ?? attachment.title ?? null;
  const mimeType = attachment.mime_type ?? null;
  const size = typeof attachment.file_size === 'number' ? attachment.file_size : null;

  if (attachment.type === 'image' && attachment.image_url) {
    return { kind: 'image', url: attachment.image_url, name, mimeType, size };
  }

  if (attachment.type === 'file' || attachment.type === 'video' || attachment.type === 'audio') {
    const url = attachment.asset_url ?? attachment.image_url;
    if (url) return { kind: 'file', url, name, mimeType, size };
  }

  return null;
}

/** The reverse: this feature's attachment as the payload `channel.sendMessage` wants. */
function toStreamAttachment(attachment: ChatAttachment): Attachment {
  if (attachment.kind === 'image') {
    return { type: 'image', image_url: attachment.url, fallback: attachment.name ?? undefined };
  }
  return {
    type: 'file',
    asset_url: attachment.url,
    title: attachment.name ?? undefined,
    mime_type: attachment.mimeType ?? undefined,
    file_size: attachment.size ?? undefined,
  };
}

/** The attachments on one message, each stamped with when the message was sent. */
function toMediaItems(message: LocalMessage | MessageResponse): ChatMediaItem[] {
  const sentAt = message.created_at ? new Date(message.created_at).toISOString() : '';
  return (message.attachments ?? [])
    .map(toChatAttachment)
    .filter((attachment): attachment is ChatAttachment => attachment !== null)
    .map((attachment) => ({ ...attachment, sentAt, messageId: message.id }));
}

/** Maps Stream's message onto this feature's shape, so components never import `stream-chat`. */
function toMessage(message: LocalMessage | MessageResponse): ChatMessage {
  return {
    id: message.id,
    text: message.text ?? '',
    senderId: message.user?.id ?? '',
    senderName: message.user?.name ?? null,
    senderImage: (message.user?.image as string | undefined) ?? null,
    attachments: (message.attachments ?? [])
      .map(toChatAttachment)
      .filter((attachment): attachment is ChatAttachment => attachment !== null),
    createdAt: message.created_at ? new Date(message.created_at).toISOString() : '',
  };
}

/** The header details for an open conversation, derived from its membership. */
function toHeader(
  channel: Channel,
  myUserId: string
): Pick<
  ChatConversation,
  | 'id'
  | 'name'
  | 'otherMemberId'
  | 'otherMemberName'
  | 'otherMemberImage'
  | 'memberCount'
  | 'members'
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
    members: members.map((member) => ({
      id: member.user_id ?? member.user?.id ?? '',
      name: member.user?.name ?? null,
      image: (member.user?.image as string | undefined) ?? null,
    })),
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

  /**
   * The history half of the shared-media list — one `channel.search` per open, tagged like
   * `loaded` so a stale conversation's results are never read. The live half is derived from
   * `messages` below and merged on render.
   */
  const [mediaHistory, setMediaHistory] = useState<{
    forId: string;
    items: ChatMediaItem[];
  } | null>(null);

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

        /**
         * THE SHARED-MEDIA HISTORY — one search on `attachments.type`, newest first. Best-effort:
         * an app with search disabled throws here, and the list falls back to whatever the
         * transcript has loaded rather than the pane erroring. Not awaited into the render path —
         * the messages are what the reader opened the conversation for.
         */
        channel
          .search(
            { 'attachments.type': { $in: MEDIA_ATTACHMENT_TYPES } },
            { limit: SHARED_MEDIA_LIMIT, sort: { created_at: -1 } }
          )
          .then((response) => {
            if (cancelled) return;
            setMediaHistory({
              forId: conversationId,
              items: response.results.flatMap((result) => toMediaItems(result.message)),
            });
          })
          .catch(() => {
            if (!cancelled) setMediaHistory({ forId: conversationId, items: [] });
          });
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
   * Sends a message — text, attachments, or both.
   *
   * NO OPTIMISTIC APPEND. The SDK echoes the sent message back through `message.new` within the
   * same round trip, and `sync` picks it up — adding a local copy first would show it twice for
   * that instant, then need reconciling by id. A message with neither text nor an attachment is
   * refused here because Stream accepts it and it renders as a blank bubble nobody can delete;
   * whitespace-only text with no attachment is the same case.
   */
  const send = useCallback(async (text: string, attachments: ChatAttachment[] = []) => {
    const channel = channelRef.current;
    const trimmed = text.trim();

    if (!channel) return;
    if (!trimmed && attachments.length === 0) return;

    await channel.sendMessage({
      text: trimmed,
      attachments: attachments.length > 0 ? attachments.map(toStreamAttachment) : undefined,
    });
  }, []);

  /**
   * Uploads one file to the channel's store and returns the attachment to hand back to `send`.
   *
   * TWO ENDPOINTS, PICKED BY MIME. `sendImage` puts the file through Stream's image pipeline —
   * resizing, a `thumb_url`, CDN delivery — which is only right for an actual image; everything
   * else goes through `sendFile` and comes back as a plain asset URL. Upload and send are separate
   * steps on purpose: the composer shows a thumbnail the moment the upload resolves and only
   * commits the message when the person hits send, so a change of mind costs nothing sent.
   *
   * The size ceiling and which types are offered are the composer's call — this just uploads what
   * it is given and lets a Stream rejection propagate.
   */
  const uploadAttachment = useCallback(async (file: File): Promise<ChatAttachment> => {
    const channel = channelRef.current;
    if (!channel) throw new Error('Chat is not connected');

    const isImage = file.type.startsWith('image/');
    const response = isImage ? await channel.sendImage(file) : await channel.sendFile(file);

    return {
      kind: isImage ? 'image' : 'file',
      url: response.file,
      name: file.name,
      mimeType: file.type || null,
      size: file.size,
    };
  }, []);

  /**
   * THE SHARED-MEDIA LIST — history from the search, merged with whatever is in the loaded
   * transcript so a file sent while the pane is open appears without a re-search. De-duped by
   * `messageId + url` (live copy wins), newest first.
   */
  const media = useMemo<ChatSharedMedia>(() => {
    const history = mediaHistory?.forId === conversationId ? mediaHistory.items : [];
    const live: ChatMediaItem[] = messages.flatMap((message) =>
      message.attachments.map((attachment) => ({
        ...attachment,
        sentAt: message.createdAt,
        messageId: message.id,
      }))
    );

    const seen = new Set<string>();
    const ordered: ChatMediaItem[] = [];
    for (const item of [...live, ...history]) {
      const key = `${item.messageId}:${item.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(item);
    }
    ordered.sort((a, b) => b.sentAt.localeCompare(a.sentAt));

    return {
      images: ordered.filter((item) => item.kind === 'image'),
      files: ordered.filter((item) => item.kind === 'file'),
    };
  }, [messages, mediaHistory, conversationId]);

  return { messages, header, media, isLoading, error, send, uploadAttachment };
}
