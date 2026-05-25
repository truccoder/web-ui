'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { fetchTwilioToken } from './token';

interface VoiceCallState {
  device: Device | null;
  activeCall: Call | null;
  status: 'idle' | 'ringing' | 'connected' | 'reconnecting';
  isMuted: boolean;
  isIncoming: boolean;
  callerIdentity: string | null;
  duration: number;
  error: string | null;
}

export function useVoiceCall(identity: string | null) {
  const [state, setState] = useState<VoiceCallState>({
    device: null,
    activeCall: null,
    status: 'idle',
    isMuted: false,
    isIncoming: false,
    callerIdentity: null,
    duration: 0,
    error: null,
  });

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    setState((prev) => ({ ...prev, duration: 0 }));
    durationIntervalRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const cleanupCall = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    callRef.current = null;
    setState((prev) => ({
      ...prev,
      activeCall: null,
      status: 'idle',
      isMuted: false,
      isIncoming: false,
      callerIdentity: null,
      duration: 0,
    }));
  }, []);

  const setupCallListeners = useCallback(
    (call: Call) => {
      call.on('accept', () => {
        setState((prev) => ({ ...prev, status: 'connected' }));
        startDurationTimer();
      });

      call.on('disconnect', () => {
        cleanupCall();
      });

      call.on('cancel', () => {
        cleanupCall();
      });

      call.on('reject', () => {
        cleanupCall();
      });

      call.on('reconnecting', () => {
        setState((prev) => ({ ...prev, status: 'reconnecting' }));
      });

      call.on('reconnected', () => {
        setState((prev) => ({ ...prev, status: 'connected' }));
      });
    },
    [cleanupCall, startDurationTimer]
  );

  useEffect(() => {
    if (!identity) return;

    let cancelled = false;

    async function init() {
      try {
        const token = await fetchTwilioToken(identity!);
        const device = new Device(token, {
          logLevel: 1,
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        });

        device.on('tokenWillExpire', async () => {
          const newToken = await fetchTwilioToken(identity!);
          device.updateToken(newToken);
        });

        device.on('incoming', (call: Call) => {
          if (cancelled) return;
          callRef.current = call;
          setState((prev) => ({
            ...prev,
            activeCall: call,
            status: 'ringing',
            isIncoming: true,
            callerIdentity: call.parameters.From ?? null,
          }));

          setupCallListeners(call);
        });

        await device.register();

        deviceRef.current = device;
        if (!cancelled) setState((prev) => ({ ...prev, device }));
      } catch (err) {
        console.error('Failed to initialize Voice device:', err);
        if (!cancelled)
          setState((prev) => ({
            ...prev,
            error: 'Failed to initialize voice',
          }));
      }
    }

    init();

    return () => {
      cancelled = true;
      deviceRef.current?.destroy();
      deviceRef.current = null;
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [identity, setupCallListeners]);

  const makeCall = useCallback(
    async (to: string) => {
      if (!deviceRef.current) return;

      try {
        const call = await deviceRef.current.connect({
          params: { To: to },
        });

        callRef.current = call;
        setState((prev) => ({
          ...prev,
          activeCall: call,
          status: 'ringing',
          isIncoming: false,
          callerIdentity: to,
        }));

        setupCallListeners(call);
      } catch {
        setState((prev) => ({
          ...prev,
          error: 'Failed to make call',
        }));
      }
    },
    [setupCallListeners]
  );

  const acceptCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.accept();
    }
  }, []);

  const rejectCall = useCallback(() => {
    if (callRef.current) {
      callRef.current.reject();
      cleanupCall();
    }
  }, [cleanupCall]);

  const hangUp = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect();
      cleanupCall();
    }
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    if (callRef.current) {
      const newMuted = !callRef.current.isMuted();
      callRef.current.mute(newMuted);
      setState((prev) => ({ ...prev, isMuted: newMuted }));
    }
  }, []);

  return {
    ...state,
    makeCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
  };
}
