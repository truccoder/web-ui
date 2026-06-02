'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { eventsApi } from '@/lib/api/events';
import { getErrorMessage } from '@/lib/api/error';
import type { RsvpStatus } from '@/lib/types';

export function useEventAttendees(postId: number) {
  return useQuery({
    queryKey: ['events', postId, 'attendees'],
    queryFn: () => eventsApi.getAttendees(postId).then((r) => r.data),
    enabled: postId > 0,
  });
}

export function useEventAttendeeCount(postId: number) {
  return useQuery({
    queryKey: ['events', postId, 'attendee-count'],
    queryFn: () => eventsApi.getAttendeeCount(postId).then((r) => r.data.count),
    enabled: postId > 0,
  });
}

export function useEventRsvp() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, status }: { postId: number; status: RsvpStatus }) =>
      eventsApi.rsvp(postId, status).then((r) => r.data),
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ['events', postId] });
      toast.success('RSVP updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update RSVP'));
    },
  });
}

export function useAddToGoogleCalendar() {
  return useMutation({
    mutationFn: (postId: number) => eventsApi.addToGoogleCalendar(postId).then((r) => r.data),
    onSuccess: () => {
      toast.success('Event added to Google Calendar');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to add event to calendar'));
    },
  });
}

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: ['google-calendar', 'status'],
    queryFn: () => eventsApi.getCalendarStatus().then((r) => r.data.connected),
  });
}

export function useGoogleCalendarAuthUrl() {
  return useQuery({
    queryKey: ['google-calendar', 'auth-url'],
    queryFn: () => eventsApi.getGoogleAuthUrl().then((r) => r.data.authUrl),
    enabled: false,
  });
}
