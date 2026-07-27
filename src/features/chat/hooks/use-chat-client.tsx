'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StreamChat } from 'stream-chat';
import { isAxiosError } from 'axios';
import { chatApi } from '../api';
import type { ChatConnectionStatus } from '../types/chat';

/**
 * Owns the one Stream Chat connection the app has, and hands it to whoever asks.
 *
 * A CONTEXT RATHER THAN REACT QUERY, and rather than Redux. The thing being shared is not a value
 * fetched from a server — it is a live websocket client with `connect`/`disconnect` semantics and
 * an internal store the SDK mutates. React Query caches immutable snapshots and would refetch it;
 * Redux wants serialisable state and this object is neither. What React Query *does* own here is
 * the credential (`useChatToken`), which really is a fetched value.
 *
 * ONE CONNECTION PER APP, NOT PER SCREEN. `/chats` and the floating chat window both need the
 * client; connecting twice would open two websockets, double every event and race on read state.
 * That is why this is a provider mounted once rather than a hook each surface calls.
 */

interface ChatClientContextValue {
  /** Null until connected — never hand a half-connected client to a caller. */
  client: StreamChat | null;
  /** Stream user id of the signed-in user (the backend's numeric id, as a string). */
  userId: string | null;
  status: ChatConnectionStatus;
  /** Set only when `status === 'error'`. */
  error: string | null;
}

const ChatClientContext = createContext<ChatClientContextValue | null>(null);

export interface ChatClientProviderProps {
  children: ReactNode;
  /**
   * Skip connecting entirely — for logged-out shells. Passing `false` after a connection exists
   * tears it down, which is what logout needs.
   */
  enabled?: boolean;
}

export function ChatClientProvider({ children, enabled = true }: ChatClientProviderProps) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  /**
   * Guards against React 18 Strict Mode running this effect twice in development. Without it the
   * second run calls `connectUser` while the first is still in flight, and the SDK throws
   * "connectUser called twice" — a bug that only ever appears in dev and looks like a real
   * connection failure.
   */
  const connectingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (connectingRef.current) return;
    connectingRef.current = true;

    let cancelled = false;
    let connected: StreamChat | null = null;

    async function connect() {
      setStatus('connecting');
      setError(null);

      try {
        const credential = await chatApi.getToken();
        if (cancelled) return;

        const streamClient = StreamChat.getInstance(credential.apiKey);

        /**
         * A TOKEN *PROVIDER*, NOT A TOKEN STRING. Handing over the raw JWT would work until it
         * expires (24h, per `expiresAt`) and then drop the socket with no way back short of a
         * reload. Given a function, the SDK calls it again whenever it needs a fresh credential,
         * and our endpoint mints one on demand.
         */
        await streamClient.connectUser({ id: credential.userId }, () =>
          chatApi.getToken().then((fresh) => fresh.streamToken)
        );

        if (cancelled) {
          await streamClient.disconnectUser();
          return;
        }

        connected = streamClient;
        setClient(streamClient);
        setUserId(credential.userId);
        setStatus('connected');
      } catch (err) {
        if (cancelled) return;

        /**
         * 503 is the backend saying Stream is not configured, which no amount of retrying fixes —
         * it needs `STREAM_API_KEY`/`STREAM_API_SECRET` set on the server. Keeping it distinct
         * from `error` is what lets the UI say so instead of offering a retry button that cannot
         * work. See `findings/chat.md` R1.
         */
        if (isAxiosError(err) && err.response?.status === 503) {
          setStatus('unconfigured');
          return;
        }

        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    connect();

    return () => {
      cancelled = true;
      connectingRef.current = false;
      // Disconnect the instance we actually connected, not `client` from state: on a fast
      // unmount the state write may never have happened.
      connected?.disconnectUser();
      setClient(null);
      setUserId(null);
      setStatus('idle');
    };
  }, [enabled]);

  const value = useMemo(() => ({ client, userId, status, error }), [client, userId, status, error]);

  return <ChatClientContext.Provider value={value}>{children}</ChatClientContext.Provider>;
}

/**
 * The connected Stream client, or nulls while it is not ready.
 *
 * Throws when used outside the provider, deliberately: a silently-null client would look exactly
 * like "still connecting" and the missing provider would be found by whoever debugs the empty
 * conversation list, hours later.
 */
export function useChatClient(): ChatClientContextValue {
  const context = useContext(ChatClientContext);
  if (!context) {
    throw new Error('useChatClient must be used inside <ChatClientProvider>');
  }
  return context;
}
