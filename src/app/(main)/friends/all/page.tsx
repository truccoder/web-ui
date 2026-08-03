'use client';

import { FriendsList } from '@/features/friendships';

/**
 * Heading and tab strip live in `../layout.tsx` (P5.1) — this page is now only its own surface.
 */
export default function AllFriendsPage() {
  return <FriendsList />;
}
