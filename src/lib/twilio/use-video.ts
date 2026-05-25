'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Video, {
  Room,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteParticipant,
  RemoteTrack,
} from 'twilio-video';
import { fetchTwilioToken } from './token';

interface VideoCallState {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  localVideoTrack: LocalVideoTrack | null;
  localAudioTrack: LocalAudioTrack | null;
  remoteParticipant: RemoteParticipant | null;
  remoteVideoTrack: RemoteTrack | null;
  remoteAudioTrack: RemoteTrack | null;
  isMuted: boolean;
  isVideoOff: boolean;
  error: string | null;
}

export function useVideoCall(identity: string | null) {
  const [state, setState] = useState<VideoCallState>({
    room: null,
    isConnected: false,
    isConnecting: false,
    localVideoTrack: null,
    localAudioTrack: null,
    remoteParticipant: null,
    remoteVideoTrack: null,
    remoteAudioTrack: null,
    isMuted: false,
    isVideoOff: false,
    error: null,
  });

  const roomRef = useRef<Room | null>(null);

  const handleTrackSubscribed = useCallback((track: RemoteTrack) => {
    if (track.kind === 'video') {
      setState((prev) => ({ ...prev, remoteVideoTrack: track }));
    } else if (track.kind === 'audio') {
      setState((prev) => ({ ...prev, remoteAudioTrack: track }));
    }
  }, []);

  const handleTrackUnsubscribed = useCallback((track: RemoteTrack) => {
    if (track.kind === 'video') {
      setState((prev) => ({ ...prev, remoteVideoTrack: null }));
    } else if (track.kind === 'audio') {
      setState((prev) => ({ ...prev, remoteAudioTrack: null }));
    }
  }, []);

  const handleParticipantConnected = useCallback(
    (participant: RemoteParticipant) => {
      setState((prev) => ({ ...prev, remoteParticipant: participant }));

      participant.tracks.forEach((publication) => {
        if (publication.isSubscribed && publication.track) {
          handleTrackSubscribed(publication.track as RemoteTrack);
        }
      });

      participant.on('trackSubscribed', handleTrackSubscribed);
      participant.on('trackUnsubscribed', handleTrackUnsubscribed);
    },
    [handleTrackSubscribed, handleTrackUnsubscribed]
  );

  const joinRoom = useCallback(
    async (roomName: string) => {
      if (!identity) return;

      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        const token = await fetchTwilioToken(identity);

        const room = await Video.connect(token, {
          name: roomName,
          audio: true,
          video: { width: 640, height: 480 },
          dominantSpeaker: true,
        });

        roomRef.current = room;

        const localVideoTrack = Array.from(room.localParticipant.videoTracks.values())[0]?.track as
          | LocalVideoTrack
          | undefined;

        const localAudioTrack = Array.from(room.localParticipant.audioTracks.values())[0]?.track as
          | LocalAudioTrack
          | undefined;

        setState((prev) => ({
          ...prev,
          room,
          isConnected: true,
          isConnecting: false,
          localVideoTrack: localVideoTrack ?? null,
          localAudioTrack: localAudioTrack ?? null,
        }));

        room.participants.forEach(handleParticipantConnected);
        room.on('participantConnected', handleParticipantConnected);

        room.on('participantDisconnected', () => {
          setState((prev) => ({
            ...prev,
            remoteParticipant: null,
            remoteVideoTrack: null,
            remoteAudioTrack: null,
          }));
        });

        room.on('disconnected', () => {
          setState((prev) => ({
            ...prev,
            room: null,
            isConnected: false,
            localVideoTrack: null,
            localAudioTrack: null,
            remoteParticipant: null,
            remoteVideoTrack: null,
            remoteAudioTrack: null,
          }));
          roomRef.current = null;
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Failed to join room',
        }));
      }
    },
    [identity, handleParticipantConnected]
  );

  const leaveRoom = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.localParticipant.tracks.forEach((publication) => {
        if (publication.track.kind === 'video' || publication.track.kind === 'audio') {
          (publication.track as LocalVideoTrack | LocalAudioTrack).stop();
        }
      });
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      room: null,
      isConnected: false,
      localVideoTrack: null,
      localAudioTrack: null,
      remoteParticipant: null,
      remoteVideoTrack: null,
      remoteAudioTrack: null,
      isMuted: false,
      isVideoOff: false,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    if (!roomRef.current) return;
    const localParticipant = roomRef.current.localParticipant;

    localParticipant.audioTracks.forEach((publication) => {
      if (publication.track.isEnabled) {
        publication.track.disable();
      } else {
        publication.track.enable();
      }
    });

    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleVideo = useCallback(() => {
    if (!roomRef.current) return;
    const localParticipant = roomRef.current.localParticipant;

    localParticipant.videoTracks.forEach((publication) => {
      if (publication.track.isEnabled) {
        publication.track.disable();
      } else {
        publication.track.enable();
      }
    });

    setState((prev) => ({ ...prev, isVideoOff: !prev.isVideoOff }));
  }, []);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.localParticipant.tracks.forEach((publication) => {
          if (publication.track.kind === 'video' || publication.track.kind === 'audio') {
            (publication.track as LocalVideoTrack | LocalAudioTrack).stop();
          }
        });
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
  };
}
