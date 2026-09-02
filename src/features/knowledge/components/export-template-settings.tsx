'use client';

import { Button, Disclosure, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useExportTemplate } from '../hooks';
import { EXPORT_PLACEHOLDERS } from '../lib/markdown-export';

/**
 * The template applied to `.md` files downloaded from an `ExplanationCard`.
 *
 * COLLAPSED BY DEFAULT because it is a preference, not a task. The download works without anyone
 * opening this — the default template is a complete answer — and a page that leads with a
 * configuration box for a button most readers have not pressed yet has its priorities backwards.
 *
 * This is the surviving half of the "custom Obsidian frontmatter" idea. The other half — storing a
 * template server-side for the plugin to apply on pull — was dropped: `/knowledge/sync/pull`
 * returns JSON, the plugin assembles the markdown, and the plugin is in another repository. A
 * setting that changes nothing until work happens somewhere unreachable is worse than no setting.
 */
export function ExportTemplateSettings() {
  const t = useT();
  const { template, setTemplate, reset } = useExportTemplate();

  return (
    <Disclosure title={t('knowledge.export.title')} description={t('knowledge.export.desc')}>
      <div className="space-y-2">
        <Textarea
          label={t('knowledge.export.templateLabel')}
          // Listed from the single source the renderer reads, so a placeholder added there can
          // never quietly go undocumented here.
          hint={t('knowledge.export.templateHint', {
            placeholders: EXPORT_PLACEHOLDERS.map((name) => `{{${name}}}`).join(', '),
          })}
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
          rows={10}
          className="font-mono text-nx-body-sm"
          spellCheck={false}
        />
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={reset}>
            {t('knowledge.export.reset')}
          </Button>
        </div>
      </div>
    </Disclosure>
  );
}
