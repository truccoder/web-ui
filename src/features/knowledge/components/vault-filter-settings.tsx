'use client';

import * as React from 'react';
import { Button, Disclosure, EmptyState, Skeleton } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useUpdateVaultContextSettings, useVaultContextSettings, useVaultTags } from '../hooks';

/**
 * Which of the reader's synced notes `/explain` is allowed to see.
 *
 * WHY THIS EXISTS. `ExplanationService.loadVaultContext` puts the filename, tags and links of up to
 * 50 notes into the prompt of every single `/explain` call. Before this panel the only control
 * anybody had over that was binary and lived somewhere else entirely — whether a personal access
 * token carried two-way permission. Someone who wanted the AI to see their technical notes but not
 * their journal had one option: stop syncing the whole vault.
 *
 * THE CHOICES ARE THE TAGS THE VAULT ACTUALLY CONTAINS, not a text box. A free-text rule that names
 * a tag existing nowhere matches nothing, and on the exclude side that failure is invisible —
 * "nothing was excluded" looks exactly like "the rule worked and nothing matched". Typing
 * `#Privte` would read as a filter in force while the journal kept going to the model.
 *
 * EXCLUDE WINS, AND THE UI SAYS SO IN WORDS. `applyTagFilter` drops a note carrying an excluded tag
 * even when an include also matches it. The alternative order would let a broad inclusion quietly
 * undo a deliberate exclusion; on a privacy control that is the mistake that matters, so it is
 * stated in the hint rather than left for a reader to discover from behaviour.
 *
 * A TAG MAY BE PICKED ON BOTH SIDES AND THAT IS NOT PREVENTED HERE. It is a coherent rule — "only
 * my work notes, but never the ones also marked private" — and the server resolves it the one way
 * that is safe. Blocking the combination in the UI would forbid a filter the backend understands.
 *
 * COLLAPSED BY DEFAULT, like the export template beside it: the default (no filter) is the
 * behaviour the product already had, and this is a preference, not a task waiting to be done.
 */
export function VaultFilterSettings() {
  const t = useT();
  const tags = useVaultTags();
  const settings = useVaultContextSettings();
  const update = useUpdateVaultContextSettings();

  /**
   * Local edit, null until something is touched.
   *
   * The same shape as `ProfessionalProfileForm`'s `edited`: null means "show the server's answer",
   * so a save elsewhere is not masked by a stale local copy, and there is no effect syncing query
   * data into state.
   */
  const [draft, setDraft] = React.useState<{ include: string[]; exclude: string[] } | null>(null);

  const saved = React.useMemo(
    () => ({
      include: settings.data?.includeTags ?? [],
      exclude: settings.data?.excludeTags ?? [],
    }),
    [settings.data]
  );

  const current = draft ?? saved;
  const dirty =
    draft != null &&
    (draft.include.join(' ') !== saved.include.join(' ') ||
      draft.exclude.join(' ') !== saved.exclude.join(' '));

  const toggle = (side: 'include' | 'exclude', tag: string) => {
    const next = { include: [...current.include], exclude: [...current.exclude] };
    const list = next[side];
    const at = list.indexOf(tag);
    if (at === -1) list.push(tag);
    else list.splice(at, 1);
    setDraft(next);
  };

  const save = () => {
    update.reset();
    update.mutate(
      { includeTags: current.include, excludeTags: current.exclude },
      // Drop the local copy on success so the panel goes back to rendering the server's own
      // normalised lists — a tag typed as `#Private` comes back as `private`, and keeping the
      // draft would show the rule the user meant instead of the rule that is in force.
      { onSuccess: () => setDraft(null) }
    );
  };

  const allTags = tags.data ?? [];
  const filtering = current.include.length > 0 || current.exclude.length > 0;

  return (
    <Disclosure
      title={t('knowledge.vaultFilter.title')}
      description={t('knowledge.vaultFilter.desc')}
    >
      {tags.isPending || settings.isPending ? (
        <Skeleton lines={3} />
      ) : tags.isError || settings.isError ? (
        <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(tags.error ?? settings.error, t('knowledge.vaultFilter.loadError'))}
        </p>
      ) : allTags.length === 0 ? (
        // No tags means no filter is expressible, so there is nothing to configure — and saying
        // that is more use than an empty pair of chip rows implying the vault has no notes.
        <EmptyState
          compact
          title={t('knowledge.vaultFilter.emptyTitle')}
          description={t('knowledge.vaultFilter.emptyDesc')}
        />
      ) : (
        <div className="space-y-4">
          <TagField
            label={t('knowledge.vaultFilter.includeLabel')}
            hint={t('knowledge.vaultFilter.includeHint')}
            tags={allTags}
            selected={current.include}
            onToggle={(tag) => toggle('include', tag)}
            toggleAria={(tag) => t('knowledge.vaultFilter.toggleAria', { tag })}
          />

          <TagField
            label={t('knowledge.vaultFilter.excludeLabel')}
            hint={t('knowledge.vaultFilter.excludeHint')}
            tags={allTags}
            selected={current.exclude}
            onToggle={(tag) => toggle('exclude', tag)}
            toggleAria={(tag) => t('knowledge.vaultFilter.toggleAria', { tag })}
            danger
          />

          {/* THE RULE IN A SENTENCE, because two rows of chips do not tell anybody what the model
              will end up seeing. `aria-live` so a screen reader hears the consequence change as
              chips are pressed, rather than only the pressed state of one chip. */}
          <p aria-live="polite" className="text-nx-caption text-nx-text-secondary">
            {!filtering
              ? t('knowledge.vaultFilter.allowAll')
              : [
                  current.include.length > 0 &&
                    t('knowledge.vaultFilter.summaryInclude', {
                      tags: current.include.join(', '),
                    }),
                  current.exclude.length > 0 &&
                    t('knowledge.vaultFilter.summaryExclude', {
                      tags: current.exclude.join(', '),
                    }),
                ]
                  .filter(Boolean)
                  .join(' ')}
          </p>

          {update.isError && (
            <p
              role="alert"
              className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
            >
              {getErrorMessage(update.error, t('knowledge.vaultFilter.saveError'))}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-[var(--nx-space-element)] border-t border-nx-border-subtle pt-3">
            <p aria-live="polite" className="text-nx-caption text-nx-text-muted">
              {dirty ? '' : update.isSuccess ? t('knowledge.vaultFilter.saved') : ''}
            </p>

            <div className="flex items-center gap-2">
              {filtering && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft({ include: [], exclude: [] })}
                >
                  {t('knowledge.vaultFilter.clear')}
                </Button>
              )}
              <Button
                size="sm"
                onClick={save}
                loading={update.isPending}
                disabled={!dirty || update.isPending}
              >
                {update.isPending
                  ? t('knowledge.vaultFilter.saving')
                  : t('knowledge.vaultFilter.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Disclosure>
  );
}

/**
 * One side of the filter: every tag in the vault, the selected ones pressed.
 *
 * `aria-pressed` on plain buttons rather than checkboxes, matching `CategoryChip` in
 * `trending-filters` — these are toggles that change a rule in place, and the pressed state is the
 * only thing distinguishing a selected chip for a screen reader, since colour alone would not.
 *
 * THE EXCLUDE SIDE IS TINTED DANGER, NOT ACCENT. Both rows show the same tags and differ only by
 * which heading they sit under; without a colour difference a glance cannot tell "use only these"
 * from "never use these", and those are opposite instructions.
 */
function TagField({
  label,
  hint,
  tags,
  selected,
  onToggle,
  toggleAria,
  danger = false,
}: {
  label: string;
  hint: string;
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  toggleAria: (tag: string) => string;
  danger?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-nx-body-sm font-medium text-nx-text-primary">{label}</legend>
      <p className="text-nx-caption text-nx-text-muted">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              aria-label={toggleAria(tag)}
              onClick={() => onToggle(tag)}
              className={cn(
                'inline-flex h-7 items-center whitespace-nowrap rounded-nx-full px-2.5',
                'font-mono text-nx-caption font-medium',
                'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                active
                  ? danger
                    ? 'bg-nx-status-danger-bg text-nx-status-danger-fg'
                    : 'bg-nx-accent-soft text-nx-text-accent'
                  : 'bg-nx-surface-sunken text-nx-text-secondary hover:text-nx-text-primary'
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
