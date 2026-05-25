'use client';

import { useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { useCommunication } from '@/components/chat/communication-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function VoiceCallModal() {
  const { state, dispatch, voiceCall } = useCommunication();
  const peer = state.activeCallPeer;
  const { status: voiceStatus, makeCall } = voiceCall;

  useEffect(() => {
    if (peer && state.callType === 'voice' && voiceStatus === 'idle') {
      makeCall(peer.identity);
    }
  }, [peer, state.callType, voiceStatus, makeCall]);

  const handleEndCall = () => {
    voiceCall.hangUp();
    dispatch({ type: 'END_CALL' });
  };

  const handleAccept = () => {
    voiceCall.acceptCall();
  };

  const handleReject = () => {
    voiceCall.rejectCall();
    dispatch({ type: 'END_CALL' });
  };

  if (!peer || state.callType !== 'voice') return null;

  const isIncoming = voiceCall.isIncoming && voiceCall.status === 'ringing';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-8 w-80 flex flex-col items-center shadow-2xl">
        {/* Avatar */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          <Avatar className="h-24 w-24 relative">
            <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              {peer.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <h3 className="text-white text-xl font-semibold mb-1">{peer.name}</h3>

        {/* Status */}
        <p className="text-white/60 text-sm mb-8">
          {voiceCall.status === 'ringing' && !isIncoming && 'Calling...'}
          {voiceCall.status === 'ringing' && isIncoming && 'Incoming call...'}
          {voiceCall.status === 'connected' && formatDuration(voiceCall.duration)}
          {voiceCall.status === 'reconnecting' && 'Reconnecting...'}
          {voiceCall.status === 'idle' && 'Connecting...'}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {isIncoming ? (
            <>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 border-0"
                onClick={handleReject}
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </Button>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 border-0"
                onClick={handleAccept}
              >
                <Phone className="h-6 w-6 text-white" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 border-0"
                onClick={voiceCall.toggleMute}
              >
                {voiceCall.isMuted ? (
                  <MicOff className="h-5 w-5 text-white" />
                ) : (
                  <Mic className="h-5 w-5 text-white" />
                )}
              </Button>

              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 border-0"
                onClick={handleEndCall}
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
