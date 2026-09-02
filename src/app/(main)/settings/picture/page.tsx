'use client';

import { PictureSettings } from '@/features/security';

/**
 * `/settings/picture` — avatar and cover on a dedicated surface. `/profile`'s hero keeps its
 * inline editing too: a face is identity, not machinery, so this is an extra home rather than a
 * move.
 */
export default function SettingsPicturePage() {
  return <PictureSettings />;
}
