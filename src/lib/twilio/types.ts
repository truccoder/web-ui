export interface TwilioMessage {
  sid: string;
  author: string;
  body: string;
  dateCreated: Date;
  participantSid: string;
}

export interface TwilioConversation {
  sid: string;
  friendlyName: string | null;
  uniqueName: string | null;
  lastMessage?: {
    body: string;
    dateCreated: Date;
    author: string;
  };
  unreadCount: number;
}

export interface CallState {
  status: 'idle' | 'ringing' | 'connected' | 'ended';
  type: 'video' | 'voice' | null;
  remotePeer: {
    identity: string;
    name: string;
    avatar?: string;
  } | null;
  isMuted: boolean;
  isVideoOff: boolean;
  duration: number;
  roomName: string | null;
}

export interface ChatState {
  isOpen: boolean;
  activeConversationSid: string | null;
  openWindows: string[];
}
