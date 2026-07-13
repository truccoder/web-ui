import api from './axios';
import type {
  RsvpStatus,
  EventRsvp,
  AttendeeCountResponse,
  AuthUrlResponse,
  CalendarStatusResponse,
} from '@/lib/types';

export const eventsApi = {
  rsvp: (postId: number, status: RsvpStatus) =>
    api.post<void>(`/v1/api/events/${postId}/rsvp`, null, {
      params: { status },
    }),

  getAttendees: (postId: number) => api.get<EventRsvp[]>(`/v1/api/events/${postId}/attendees`),

  getAttendeeCount: (postId: number) =>
    api.get<AttendeeCountResponse>(`/v1/api/events/${postId}/attendees/count`),

  addToGoogleCalendar: (postId: number) =>
    api.post<void>(`/v1/api/events/${postId}/add-to-calendar`),

  // The endpoint requires the session JWT, so a plain <a href> can't reach it —
  // fetch as a blob through the authenticated axios instance instead.
  exportIcs: (postId: number) =>
    api.get<Blob>(`/v1/api/events/${postId}/export.ics`, { responseType: 'blob' }),

  getGoogleAuthUrl: () => api.get<AuthUrlResponse>('/v1/api/events/google/auth-url'),

  getCalendarStatus: () => api.get<CalendarStatusResponse>('/v1/api/events/google/status'),
};
