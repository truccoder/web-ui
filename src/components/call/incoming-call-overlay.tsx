'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { useCommunication } from '@/components/chat/communication-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function IncomingCallOverlay() {
  const { voiceCall, dispatch } = useCommunication();

  if (!voiceCall.isIncoming || voiceCall.status !== 'ringing') return null;

  const callerName = voiceCall.callerIdentity ?? 'Unknown';

  const handleAccept = () => {
    voiceCall.acceptCall();
    dispatch({
      type: 'START_CALL',
      payload: {
        peer: {
          identity: voiceCall.callerIdentity ?? '',
          name: callerName,
        },
        callType: 'voice',
      },
    });
  };

  const handleReject = () => {
    voiceCall.rejectCall();
  };

  return (
    <div className="fixed top-4 right-4 z-[90] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-card border rounded-2xl shadow-2xl p-4 w-72 flex items-center gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            {callerName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{callerName}</p>
          <p className="text-xs text-muted-foreground">Incoming voice call</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-red-600 hover:bg-red-700 border-0"
            onClick={handleReject}
          >
            <PhoneOff className="h-4 w-4 text-white" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-green-600 hover:bg-green-700 border-0"
            onClick={handleAccept}
          >
            <Phone className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
