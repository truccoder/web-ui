/**
 * Query keys for `features/notifications`, all under one namespace.
 *
 * THE THREE READS ARE SIBLINGS, NOT NESTED, and that matters for invalidation. The legacy
 * `lib/hooks/use-notifications.ts` keyed the list as the bare `['notifications']`, which made it
 * a prefix of `['notifications', 'preferences']` — so every mark-as-read refetched the
 * preferences too. Giving the list its own `'list'` segment means `all` is the only key that
 * sweeps the whole domain, and each mutation can name exactly what it invalidated.
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
  preferences: () => ['notifications', 'preferences'] as const,
};
