'use client';

import { Section } from '@/shared/components';
import { TokenList } from '@/features/knowledge';
import { useT } from '@/core/i18n';

/**
 * `/settings/tokens` — personal access tokens for the Obsidian vault client. `TokenList` owns
 * the create dialog (with its mandatory copy-now-you-won't-see-it-again modal) and the
 * WRITE_ONLY vs BIDIRECTIONAL explanation. Was the `Cài đặt` tab of `/knowledge`.
 */
export default function SettingsTokensPage() {
  const t = useT();
  return (
    <Section title={t('settings.tokens.title')} description={t('settings.tokens.desc')}>
      <TokenList />
    </Section>
  );
}
