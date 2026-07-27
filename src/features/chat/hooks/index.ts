/**
 * Chat state layer.
 *
 * NO QUERY KEY NAMESPACE HERE, and that is not an omission. The per-domain exit criteria ask for
 * one, but this domain has no React Query query to key: the single endpoint is consumed
 * imperatively by the connection lifecycle (twice — once to connect, once per token refresh), and
 * everything a screen renders comes over Stream's websocket into the SDK's own store. A key
 * namespace with no query under it would be decoration. Server state still stays out of Redux.
 */
export { ChatClientProvider, useChatClient, type ChatClientProviderProps } from './use-chat-client';
export { useConversations } from './use-conversations';
export { useConversation } from './use-conversation';
