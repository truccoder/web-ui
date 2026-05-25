'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import type { RemoteVideoTrack, RemoteAudioTrack } from 'twilio-video';
import { useCommunication } from '@/components/chat/communication-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function VideoCallModal() {
  const { state, dispatch, videoCall } = useCommunication();
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const peer = state.activeCallPeer;
  const roomName = peer
    ? [state.activeCallPeer?.identity, 'video'].filter(Boolean).sort().join('_')
    : null;

  const { isConnected, isConnecting, joinRoom } = videoCall;

  useEffect(() => {
    if (peer && roomName && !isConnected && !isConnecting) {
      joinRoom(roomName);
    }
  }, [peer, roomName, isConnected, isConnecting, joinRoom]);

  // Attach local video
  useEffect(() => {
    if (videoCall.localVideoTrack && localVideoRef.current) {
      const el = videoCall.localVideoTrack.attach();
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.objectFit = 'cover';
      el.style.transform = 'scaleX(-1)';
      localVideoRef.current.innerHTML = '';
      localVideoRef.current.appendChild(el);

      return () => {
        videoCall.localVideoTrack?.detach().forEach((e) => e.remove());
      };
    }
  }, [videoCall.localVideoTrack]);

  // Attach remote video
  useEffect(() => {
    if (videoCall.remoteVideoTrack && remoteVideoRef.current) {
      const track = videoCall.remoteVideoTrack as RemoteVideoTrack;
      const el = track.attach();
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.objectFit = 'cover';
      remoteVideoRef.current.innerHTML = '';
      remoteVideoRef.current.appendChild(el);

      return () => {
        track.detach().forEach((e) => e.remove());
      };
    }
  }, [videoCall.remoteVideoTrack]);

  // Attach remote audio
  useEffect(() => {
    if (videoCall.remoteAudioTrack) {
      const track = videoCall.remoteAudioTrack as RemoteAudioTrack;
      const el = track.attach();
      document.body.appendChild(el);
      return () => {
        track.detach().forEach((e) => e.remove());
      };
    }
  }, [videoCall.remoteAudioTrack]);

  const handleEndCall = () => {
    videoCall.leaveRoom();
    dispatch({ type: 'END_CALL' });
  };

  if (!peer || state.callType !== 'video') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Remote video (full screen) */}
      <div ref={remoteVideoRef} className="flex-1 bg-slate-900 relative">
        {!videoCall.remoteVideoTrack && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarFallback className="text-3xl bg-slate-700 text-white">
                {peer.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-lg font-medium">{peer.name}</p>
            <p className="text-white/60 text-sm mt-1">
              {videoCall.isConnecting
                ? 'Connecting...'
                : videoCall.isConnected
                  ? 'Waiting for video...'
                  : 'Initializing...'}
            </p>
          </div>
        )}
      </div>

      {/* Local video (PiP) */}
      <div
        ref={localVideoRef}
        className="absolute top-4 right-4 w-40 h-28 rounded-lg overflow-hidden border-2 border-white/20 bg-slate-800 shadow-xl"
      >
        {videoCall.isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <VideoOff className="h-6 w-6 text-white/60" />
          </div>
        )}
      </div>

      {/* Peer name overlay */}
      <div className="absolute top-4 left-4">
        <p className="text-white text-sm font-medium bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
          {peer.name}
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
          onClick={videoCall.toggleMute}
        >
          {videoCall.isMuted ? (
            <MicOff className="h-5 w-5 text-white" />
          ) : (
            <Mic className="h-5 w-5 text-white" />
          )}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
          onClick={videoCall.toggleVideo}
        >
          {videoCall.isVideoOff ? (
            <VideoOff className="h-5 w-5 text-white" />
          ) : (
            <Video className="h-5 w-5 text-white" />
          )}
        </Button>

        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 border-0"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-6 w-6 text-white" />
        </Button>
      </div>
    </div>
  );
}
