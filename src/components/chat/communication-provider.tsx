'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { useProfile } from '@/lib/hooks/use-user';
import { useConversationsClient } from '@/lib/twilio/use-conversations';

interface ChatWindow {
  conversationSid: string;
  peerName: string;
  peerAvatar?: string;
  peerIdentity: string;
  isMinimized: boolean;
}

interface CommunicationState {
  isChatListOpen: boolean;
  openWindows: ChatWindow[];
}

type Action =
  | { type: 'TOGGLE_CHAT_LIST' }
  | { type: 'OPEN_CHAT_WINDOW'; payload: ChatWindow }
  | { type: 'CLOSE_CHAT_WINDOW'; payload: string }
  | { type: 'MINIMIZE_CHAT_WINDOW'; payload: string };

function reducer(state: CommunicationState, action: Action): CommunicationState {
  switch (action.type) {
    case 'TOGGLE_CHAT_LIST':
      return { ...state, isChatListOpen: !state.isChatListOpen };

    case 'OPEN_CHAT_WINDOW': {
      const exists = state.openWindows.find(
        (w) => w.conversationSid === action.payload.conversationSid
      );
      if (exists) {
        return {
          ...state,
          openWindows: state.openWindows.map((w) =>
            w.conversationSid === action.payload.conversationSid ? { ...w, isMinimized: false } : w
          ),
        };
      }
      const windows = [...state.openWindows, action.payload].slice(-3);
      return { ...state, openWindows: windows, isChatListOpen: false };
    }

    case 'CLOSE_CHAT_WINDOW':
      return {
        ...state,
        openWindows: state.openWindows.filter((w) => w.conversationSid !== action.payload),
      };

    case 'MINIMIZE_CHAT_WINDOW':
      return {
        ...state,
        openWindows: state.openWindows.map((w) =>
          w.conversationSid === action.payload ? { ...w, isMinimized: !w.isMinimized } : w
        ),
      };

    default:
      return state;
  }
}

export interface CommunicationContextType {
  state: CommunicationState;
  dispatch: React.Dispatch<Action>;
  conversationsClient: ReturnType<typeof useConversationsClient>;
  currentIdentity: string | null;
}

const CommunicationContext = createContext<CommunicationContextType | null>(null);

export function CommunicationProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const identity = profile?.id ?? null;

  const [state, dispatch] = useReducer(reducer, {
    isChatListOpen: false,
    openWindows: [],
  });

  const conversationsClient = useConversationsClient(identity);

  return (
    <CommunicationContext.Provider
      value={{
        state,
        dispatch,
        conversationsClient,
        currentIdentity: identity,
      }}
    >
      {children}
    </CommunicationContext.Provider>
  );
}

export function useCommunication() {
  const ctx = useContext(CommunicationContext);
  if (!ctx) {
    throw new Error('useCommunication must be used within CommunicationProvider');
  }
  return ctx;
}
