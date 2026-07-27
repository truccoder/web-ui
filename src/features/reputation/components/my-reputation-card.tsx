'use client';

import { useMyProfile } from '@/features/security';
import { ReputationCard } from './reputation-card';

/**
 * `ReputationCard` for the signed-in user. The score is keyed by user id and the backend
 * has no "my reputation" endpoint, so the id has to come from `GET /profile/me` — owned by
 * security. Imported through that feature's public barrel, which is the one cross-feature
 * edge CLAUDE.md §4 allows.
 *
 * This wrapper exists so routes stay pure composition: `/profile` renders
 * `<MyReputationCard />` and never touches a query itself.
 */
export function MyReputationCard() {
  const { data: profile } = useMyProfile();
  return <ReputationCard userId={profile?.id} />;
}
