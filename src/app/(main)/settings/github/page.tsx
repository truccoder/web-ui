'use client';

import { Section } from '@/shared/components';
import { GithubStatsCard } from '@/features/github';
import { useMyProfile } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/settings/github` — connect / sync / unlink, plus the stats card as it will appear on the
 * profile. Owner mode (`readOnly` omitted): `POST /github/sync` and `DELETE /github/unlink` act
 * on the caller, so those controls only ever render here and on nobody else's page.
 *
 * The link OAuth callback (`/settings/github/callback`) returns here now, not to
 * `/profile?tab=professional`.
 */
export default function SettingsGithubPage() {
  const t = useT();
  const { data: profile } = useMyProfile();
  return (
    <Section title={t('settings.github.title')} description={t('settings.github.desc')}>
      <GithubStatsCard userId={profile?.id} />
    </Section>
  );
}
