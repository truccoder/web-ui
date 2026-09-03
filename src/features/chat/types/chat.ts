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
 * WE SET IT ON GROUPS AND NEVER ON DIRECT MESSAGES, and that split is the product's own line
 * rather than a convention: `POST /chat/groups` requires a `@NotBlank name`, and the backend
 * treats "has a name" as what makes a channel a group at all. Direct messages stay member-based
 * and unnamed (see `startConversation`), so `name` is null for every 1:1 this app creates and set
 * for every group. The paragraph that used to stand here said "WE NEVER SET IT ... a future
 * group-chat feature" — that future arrived with BE `ba1cfc9`.
 */
declare module 'stream-chat' {
  interface CustomChannelData {
    name?: string;
  }
}

/**
 * Types for ChatController (`/v1/api/chat`), derived from `schema.gen.ts`.
 *
 * THE BACKEND'S ROLE IN CHAT IS ALMOST ENTIRELY ONE THING: minting a Stream Chat credential.
 * Messages, membership and 1:1 channels live in Stream's infrastructure and are reached from the
 * browser with the SDK — there is no `GET /messages` here to type. That is why a domain with 22 UI
 * components has a three-function API layer.
 *
 * THE ONE EXCEPTION IS A GROUP CHANNEL, and it is an exception for two reasons the browser cannot
 * cover (BE `ba1cfc9`): a channel's owner is whatever `created_by_id` the client sends, and a
 * block between two INVITED members is invisible to a client that can only check pairs involving
 * itself — which is precisely the case that would put two people who blocked each other in one
 * room. So `POST /chat/groups` settles the whole membership server-side and hands back a handle.
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
/**
 * One channel member, mapped out of Stream's membership.
 *
 * NAME AND IMAGE COME FROM STREAM, NOT THE BACKEND. `GET /chat/token` upserts a user's name and
 * avatar into Stream as a side effect, so a member Stream has seen carries both; one it has not
 * falls back to the id as a name and no image. There is no handle here — Stream members do not
 * carry one — which is why `ChatInfo` resolves it through `useReputations` for the profile link.
 */
export type ChatMember = {
  /** Stream user id — the backend's numeric user id, as a string. */
  id: string;
  name: string | null;
  image: string | null;
};

export type ChatConversation = {
  /** Stream's channel id (`channel.id`), unique within the `messaging` type. */
  id: string;
  name: string | null;
  /**
   * The other participant in a 1:1 conversation.
   *
   * NULL FOR A GROUP, AND THE MAPPERS ENFORCE THAT RATHER THAN LEAVING IT TO CHANCE. "The first
   * member who is not me" is a meaningful answer in a two-person channel and an arbitrary one in a
   * five-person channel — it would put whichever member Stream happened to list first into the
   * title bar, the avatar and `ChatInfo`'s reputation lookup, all of them silently wrong. So
   * `toConversation`/`toHeader` null these three out above `memberCount === 2`, which is what makes
   * every `name ?? otherMemberName` fall through to the group's own name.
   */
  otherMemberId: string | null;
  otherMemberName: string | null;
  otherMemberImage: string | null;
  /**
   * How many people are in the channel, caller included. `2` is a direct message; more is a group.
   *
   * From Stream's own membership rather than from `GroupChatResponse.memberIds`, so it stays right
   * after somebody is added or leaves — and so a channel this client did not create still reports
   * it.
   */
  memberCount: number;
  /**
   * Every member of the channel, caller included — populated once the channel is watched (the
   * list query and `useConversation` both watch, so it is filled wherever the UI reads it).
   * `ChatInfo` shows this for a group in place of the bare count; a direct message ignores it.
   */
  members: ChatMember[];
  lastMessage: string | null;
  /** ISO-8601. Null when the conversation has no messages yet. */
  lastMessageAt: string | null;
  unreadCount: number;
};

/**
 * Body for `POST /v1/api/chat/groups`.
 *
 * `memberIds` IS EVERYONE EXCEPT THE CALLER, who is added as a member and named as owner from the
 * authenticated principal. Including yourself is harmless — the backend removes your id along with
 * any duplicates — but the count the UI enforces is of OTHER people.
 *
 * THE FLOOR IS TWO OTHERS, NOT ONE, and it is a product rule rather than a limit: caller + one
 * other is a direct message wearing a name, and routing it through here would create a SECOND
 * channel between two people who already have one, splitting their unread badge across the two.
 *
 * The ceiling of 99 is Stream's 100-member `messaging` channel minus the caller's seat. Over it,
 * the whole request is rejected rather than silently truncated — a group missing three people
 * looks like a bug in the member picker and nobody would think to count.
 */
export type CreateGroupChatInput = {
  name: NonNullable<Schemas['CreateGroupChatRequest']['name']>;
  memberIds: NonNullable<Schemas['CreateGroupChatRequest']['memberIds']>;
  imageUrl?: Schemas['CreateGroupChatRequest']['imageUrl'];
};

/**
 * What `POST /v1/api/chat/groups` hands back — a HANDLE, not a channel.
 *
 * DELIBERATELY NOT THE CHANNEL'S STATE. The client holds a Stream token and calls
 * `channel.watch()` itself, which returns members, read state and history in the shape the SDK
 * expects; mirroring any of that through the backend would be a second copy that goes stale the
 * moment somebody sends a message. So the only thing this feature does with the response is read
 * `channelId` and watch it.
 *
 * Every field is set on every path the builder takes, hence `NonNullable` — the generated type
 * marks them optional only because Java DTOs carry no nullability annotations. `memberIds` are
 * STRINGS here (Stream user ids are strings) while the request sends numbers; that asymmetry is
 * the backend's, and it is the right way round for a caller that hands them straight to the SDK.
 */
export type GroupChatHandle = {
  [K in keyof Required<Schemas['GroupChatResponse']>]: NonNullable<Schemas['GroupChatResponse'][K]>;
};

/**
 * One attachment on a message.
 *
 * TWO KINDS, DECIDED BY HOW IT RENDERS. `image` draws inline as a thumbnail; `file` draws as a
 * download row with a name and a size. Stream keeps far more attachment types (`video`, `audio`,
 * Giphy, location, link previews) — the mapper folds media into `file` and drops the rest, so a
 * URL Stream auto-unfurled does not turn into a broken `<img>`.
 */
export type ChatAttachment = {
  kind: 'image' | 'file';
  /** `image_url` for an image, `asset_url` for a file. */
  url: string;
  /** Original filename when Stream kept it (`fallback` / `title`). */
  name: string | null;
  mimeType: string | null;
  /** Bytes, when Stream reported it — only shown for files. */
  size: number | null;
};

/** An attachment plus the moment its message was sent — what the shared-media list sorts on. */
export type ChatMediaItem = ChatAttachment & {
  /** ISO-8601. */
  sentAt: string;
  /** The message it belongs to — half of the de-dup key alongside `url`. */
  messageId: string;
};

/**
 * Every picture and file exchanged in one conversation, newest first.
 *
 * PART HISTORY, PART LIVE. The history comes from one `channel.search` on `attachments.type` when
 * the pane opens; the live half is whatever is in the watched channel's loaded messages, so a file
 * sent while the pane is open shows without a re-search. The two are merged and de-duped by
 * `messageId + url`. When a Stream app has search disabled the history half is simply empty and
 * the list is whatever the transcript has loaded.
 */
export type ChatSharedMedia = {
  images: ChatMediaItem[];
  files: ChatMediaItem[];
};

/** One message, mapped out of Stream's `MessageResponse`. */
export type ChatMessage = {
  id: string;
  text: string;
  /** Stream user id of the sender — the backend's numeric user id, as a string. */
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  /** Empty for a plain text message. */
  attachments: ChatAttachment[];
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
