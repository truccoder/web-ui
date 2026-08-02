import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Teaches the Stream SDK about the one custom channel field we read.
 *
 * `name` is not part of Stream's built-in channel shape — v9 keeps custom data in an interface
 * (`CustomChannelData`) that starts empty and is meant to be augmented per application, so
 * `channel.data.name` does not type-check until it is declared here. Augmenting is better than
 * casting at each read: this way exactly one place says what our channels carry, and a typo in a
 * field name is a compile error rather than a silent `undefined`.
 *
 * WE NEVER SET IT. Conversations are created member-based and unnamed (see `startConversation`),
 * so in practice this is null for every channel this app makes; it is declared because a channel
 * created elsewhere — Stream's dashboard, a future group-chat feature — legitimately can have one,
 * and the UI should show it when it does rather than ignore it.
 */
declare module 'stream-chat' {
  interface CustomChannelData {
    name?: string;
  }
}

/**
 * Types for ChatController (`GET /v1/api/chat/token`), derived from `schema.gen.ts`.
 *
 * THE BACKEND'S ROLE IN CHAT IS EXACTLY ONE THING: minting a Stream Chat credential. Messages,
 * channels and membership all live in Stream's infrastructure and are reached from the browser
 * with the SDK — there is no `GET /messages` here to type. That is why a domain with 22 UI
 * components has a one-function API layer.
 */

/**
 * The chat credential.
 *
 * ALL FOUR FIELDS ALWAYS PRESENT. `ChatTokenResponse` is built in one place
 * (`StreamChatService.issueToken`) and that builder sets every field on every path; the endpoint
 * either returns all of them or throws (503 `MissingConfigurationException`). The generated type
 * marks them optional only because Java DTOs carry no nullability annotations.
 *
 * `apiKey` IS SUPPOSED TO BE HERE AND IS NOT A LEAK. Stream's API key is public by design — it
 * travels in every request the browser makes — and having the backend hand it over with the token
 * keeps one source of truth for which Stream app we are talking to. The secret that signs the
 * token never leaves the backend. (Requested as R3 in `findings/chat.md`; the alternative, a
 * `NEXT_PUBLIC_STREAM_API_KEY` on this side, would let the two drift apart and fail only in
 * production.)
 */
export type ChatToken = {
  [K in keyof Required<Schemas['ChatTokenResponse']>]: NonNullable<Schemas['ChatTokenResponse'][K]>;
};

/**
 * One conversation, as this feature's UI wants to read it.
 *
 * DELIBERATELY NOT STREAM'S `Channel`. Everything below is mapped out of the SDK in the hooks so
 * that no component ever imports `stream-chat`. Two reasons, and the first one is not
 * hypothetical: this project has just spent a checkpoint discovering that the frontend was built
 * against Twilio while the backend issued Stream credentials (`findings/chat.md` §0). A UI that
 * names `channel.state.messages` is a UI that has to be rewritten the next time that happens. The
 * second is the extraction test (CLAUDE.md §4) — the provider stays an implementation detail of
 * `features/chat`, not a shape the rest of the app learns.
 *
 * `name` is null for a channel created without one: Stream does not synthesise a title for
 * member-based channels, so the UI derives a label from `otherMemberName` instead.
 */
export type ChatConversation = {
  /** Stream's channel id (`channel.id`), unique within the `messaging` type. */
  id: string;
  name: string | null;
  /** The other participant in a 1:1 conversation — null in a group, or before members load. */
  otherMemberId: string | null;
  otherMemberName: string | null;
  otherMemberImage: string | null;
  lastMessage: string | null;
  /** ISO-8601. Null when the conversation has no messages yet. */
  lastMessageAt: string | null;
  unreadCount: number;
};

/** One message, mapped out of Stream's `MessageResponse`. */
export type ChatMessage = {
  id: string;
  text: string;
  /** Stream user id of the sender — the backend's numeric user id, as a string. */
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  /** ISO-8601. */
  createdAt: string;
};

/**
 * How far along the connection is.
 *
 * `unconfigured` IS ITS OWN STATE RATHER THAN AN ERROR, because it is the one failure the user can
 * do nothing about and the operator can: the backend answers 503 when `stream.chat.api-key` /
 * `api-secret` are unset, which is exactly the state this environment was in before P2.7. Folding
 * it into `error` would put "Thử lại" in front of someone whose retry can never succeed.
 */
export type ChatConnectionStatus = 'idle' | 'connecting' | 'connected' | 'unconfigured' | 'error';
