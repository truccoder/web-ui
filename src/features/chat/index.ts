/**
 * `features/chat` — mirrors the backend package `com.socialapp.chat`
 * (ChatController: 3 endpoints).
 *
 * MOSTLY A DOORWAY. `GET /v1/api/chat/token` mints a Stream Chat credential; messages, direct
 * channels and membership live in Stream's infrastructure and are reached from the browser. So the
 * API layer is three functions while the UI is among the largest in the app — the endpoint count
 * says nothing about the work, exactly as the ledger warns.
 *
 * THE PROVIDER IS AN IMPLEMENTATION DETAIL. Nothing outside this folder imports `stream-chat`:
 * hooks map the SDK's channels and messages onto `ChatConversation` / `ChatMessage` first. That
 * boundary is not theoretical — this project shipped a frontend built against Twilio while the
 * backend issued Stream credentials (`findings/chat.md`), and a UI written against SDK shapes is
 * a UI that has to be rewritten when that is discovered.
 *
 * WHO MAY MESSAGE WHOM IS STILL NOT ENFORCED FOR A DIRECT MESSAGE. That channel is created
 * client-side, so the friendship graph is a UI convention there rather than a server rule —
 * decided as option (a) in `findings/chat.md` R6.
 *
 * A GROUP IS THE EXCEPTION, and the reason is not friendship but BLOCKING. `POST /chat/groups`
 * refuses a membership with a block standing between ANY two of its members, including two people
 * the caller invited who have blocked each other — a pair a client checking only its own
 * relationships cannot see. That is why group creation is the one channel this backend makes
 * itself, and why the client must not fall back to creating one when the call fails.
 */

export { chatApi } from './api';

export {
  ChatClientProvider,
  type ChatClientProviderProps,
  useChatClient,
  useConversations,
  useConversation,
} from './hooks';

export {
  MessageUserButton,
  type MessageUserButtonProps,
  ChatMessenger,
  type ChatMessengerProps,
  ConversationSidebar,
  type ConversationSidebarProps,
  ConversationView,
  ConversationEmpty,
  type ConversationViewProps,
  type ConversationHeaderData,
  ConversationRow,
  type ConversationRowProps,
  MessageBubble,
  type MessageBubbleProps,
  MessageComposer,
  type MessageComposerProps,
} from './components';

export type {
  ChatToken,
  ChatConversation,
  ChatMessage,
  ChatConnectionStatus,
  CreateGroupChatInput,
  GroupChatHandle,
} from './types';
