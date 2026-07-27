/**
 * `features/chat` — mirrors the backend package `com.socialapp.chat`
 * (ChatController: 1 endpoint).
 *
 * ONE ENDPOINT, AND IT IS ONLY A DOORWAY. `GET /v1/api/chat/token` mints a Stream Chat
 * credential; messages, channels and membership live in Stream's infrastructure and are reached
 * from the browser. So the API layer is one function while the UI is among the largest in the
 * app — the endpoint count says nothing about the work, exactly as the ledger warns.
 *
 * THE PROVIDER IS AN IMPLEMENTATION DETAIL. Nothing outside this folder imports `stream-chat`:
 * hooks map the SDK's channels and messages onto `ChatConversation` / `ChatMessage` first. That
 * boundary is not theoretical — this project shipped a frontend built against Twilio while the
 * backend issued Stream credentials (`findings/chat.md`), and a UI written against SDK shapes is
 * a UI that has to be rewritten when that is discovered.
 *
 * WHO MAY MESSAGE WHOM IS NOT ENFORCED. Channels are created client-side, so the friendship graph
 * is a UI convention here rather than a server rule — decided as option (a) in `findings/chat.md`
 * R6.
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

export type { ChatToken, ChatConversation, ChatMessage, ChatConnectionStatus } from './types';
