'use client';

import { FriendRequests } from '@/features/friendships';

/** Heading and tab strip live in `../layout.tsx` (P5.1). */
export default function FriendRequestsPage() {
  // `sm` so this strip reads as a level below the page tabs in `../layout.tsx`.
  return <FriendRequests tabSize="sm" />;
}
