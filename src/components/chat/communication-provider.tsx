'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { useProfile } from '@/lib/hooks/use-user';
import { useConversationsClient } from '@/lib/twilio/use-conversations';
import { useVideoCall } from '@/lib/twilio/use-video';
import { useVoiceCall } from '@/lib/twilio/use-voice';

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
  activeCallPeer: {
    identity: string;
    name: string;
    avatar?: string;
  } | null;
  callType: 'video' | 'voice' | null;
}

type Action =
  | { type: 'TOGGLE_CHAT_LIST' }
  | { type: 'OPEN_CHAT_WINDOW'; payload: ChatWindow }
  | { type: 'CLOSE_CHAT_WINDOW'; payload: string }
  | { type: 'MINIMIZE_CHAT_WINDOW'; payload: string }
  | {
      type: 'START_CALL';
      payload: { peer: CommunicationState['activeCallPeer']; callType: 'video' | 'voice' };
    }
  | { type: 'END_CALL' };

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

    case 'START_CALL':
      return {
        ...state,
        activeCallPeer: action.payload.peer,
        callType: action.payload.callType,
      };

    case 'END_CALL':
      return { ...state, activeCallPeer: null, callType: null };

    default:
      return state;
  }
}

export interface CommunicationContextType {
  state: CommunicationState;
  dispatch: React.Dispatch<Action>;
  conversationsClient: ReturnType<typeof useConversationsClient>;
  videoCall: ReturnType<typeof useVideoCall>;
  voiceCall: ReturnType<typeof useVoiceCall>;
  currentIdentity: string | null;
}

const CommunicationContext = createContext<CommunicationContextType | null>(null);

export function CommunicationProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const identity = profile?.id ?? null;

  const [state, dispatch] = useReducer(reducer, {
    isChatListOpen: false,
    openWindows: [],
    activeCallPeer: null,
    callType: null,
  });

  const conversationsClient = useConversationsClient(identity);
  const videoCall = useVideoCall(identity);
  const voiceCall = useVoiceCall(identity);

  return (
    <CommunicationContext.Provider
      value={{
        state,
        dispatch,
        conversationsClient,
        videoCall,
        voiceCall,
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
