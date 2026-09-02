'use client';

import { Section } from '@/shared/components';
import { ExportTemplateSettings, VaultPanel } from '@/features/knowledge';
import { useT } from '@/core/i18n';

/**
 * `/settings/vault` — the notes the Obsidian client has synced, the tag filter over them, and
 * the explanation-download template. Was the `Ghi chú đã đồng bộ` + part of `Cài đặt` on
 * `/knowledge`. The export template sits here because it, too, is plugin-adjacent machinery and
 * the atlas's settings list has no separate slot for it.
 */
export default function SettingsVaultPage() {
  const t = useT();
  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <Section title={t('settings.vault.title')} description={t('settings.vault.desc')}>
        <VaultPanel />
      </Section>
      <Section
        title={t('settings.exportTemplate.title')}
        description={t('settings.exportTemplate.desc')}
      >
        <ExportTemplateSettings />
      </Section>
    </div>
  );
}
