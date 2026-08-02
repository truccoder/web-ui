'use client';

import * as React from 'react';
import { Button, Input, Select, Skeleton } from '@/shared/components';
import { getErrorDetails, getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/lib/i18n';
import { isProfileMissing, useProfessionalProfile, useUpdateProfessionalProfile } from '../hooks';
import type {
  ExplanationStyle,
  PrimaryRole,
  ProfessionalProfile,
  SeniorityLevel,
  UpdateProfessionalProfileInput,
  WorkExperience,
} from '../types/knowledge';

/**
 * The professional profile that steers the AI explainer.
 *
 * THE ENDPOINT IS A FULL REPLACE, SO THIS FORM ALWAYS SUBMITS THE WHOLE OBJECT. Measured at
 * P2.11a: a `PUT` carrying three fields nulled the four it omitted, destroying a job title and a
 * four-entry tech stack. Everything below follows from that one fact — the form will not render
 * until the current profile has loaded, and it sends back every key including the ones it does not
 * let you edit.
 *
 * `workHistory` IS PASSED THROUGH UNTOUCHED RATHER THAN EDITED. A repeating sub-form for it would
 * be a fourth and fifth component in a checkpoint capped at five, and the value has to be sent back
 * regardless or the replace destroys it. Carrying it verbatim keeps the data safe today and leaves
 * the editor to a later checkpoint; the alternative — omitting it — is precisely the bug this file
 * is written around. Recorded as a known gap in `findings/knowledge.md`.
 *
 * A 404 IS THE EMPTY STATE, NOT AN ERROR. `GET` is `orElseThrow` with no get-or-create, so a user
 * who has never filled this in gets a 404 forever; the form opens blank and the same `PUT` creates
 * the row.
 */

const SENIORITY_LEVELS: SeniorityLevel[] = ['JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL'];
const PRIMARY_ROLES: PrimaryRole[] = [
  'BACKEND',
  'FRONTEND',
  'FULLSTACK',
  'MOBILE',
  'DEVOPS',
  'DATA_ML',
  'SECURITY',
  'QA',
  'OTHER',
];
const EXPLANATION_STYLES: ExplanationStyle[] = [
  'CONCISE',
  'DETAILED',
  'CODE_HEAVY',
  'ANALOGY_HEAVY',
];

/** What the form edits. `workHistory` rides along so the replace cannot drop it. */
interface Draft {
  jobTitle: string;
  seniorityLevel: SeniorityLevel;
  yearsOfExperience: string;
  primaryRole: PrimaryRole | '';
  explanationStyle: ExplanationStyle | '';
  knownTechStack: string;
  interestedDomains: string;
  workHistory: WorkExperience[] | null;
}

const EMPTY_DRAFT: Draft = {
  jobTitle: '',
  // `seniorityLevel` is the one `@NotNull` field, so a blank profile still needs a starting value.
  seniorityLevel: 'MID',
  yearsOfExperience: '',
  primaryRole: '',
  explanationStyle: '',
  knownTechStack: '',
  interestedDomains: '',
  workHistory: null,
};

/** Comma-separated text is how the two `string[]` fields are edited — see the note in the form. */
const listToText = (list: string[] | null) => (list ?? []).join(', ');
const textToList = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

function toDraft(profile: ProfessionalProfile): Draft {
  return {
    jobTitle: profile.jobTitle ?? '',
    seniorityLevel: profile.seniorityLevel ?? 'MID',
    yearsOfExperience: profile.yearsOfExperience == null ? '' : String(profile.yearsOfExperience),
    primaryRole: profile.primaryRole ?? '',
    explanationStyle: profile.explanationStyle ?? '',
    knownTechStack: listToText(profile.knownTechStack),
    interestedDomains: listToText(profile.interestedDomains),
    workHistory: profile.workHistory,
  };
}

export function ProfessionalProfileForm() {
  const t = useT();
  const { data: profile, isPending, isError, error } = useProfessionalProfile();
  const update = useUpdateProfessionalProfile();

  // The edited copy is null until the user touches something, so the displayed values are DERIVED
  // from whatever the query currently holds. That is what keeps this effect-free: no "copy server
  // state into local state on load", which `react-hooks/set-state-in-effect` rejects and which
  // would also go stale the moment the mutation writes a fresh profile into the cache.
  const [edited, setEdited] = React.useState<Draft | null>(null);
  const missing = isError && isProfileMissing(error);
  const draft = edited ?? (profile ? toDraft(profile) : EMPTY_DRAFT);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setEdited({ ...draft, [key]: value });

  if (isPending) return <Skeleton lines={6} />;

  // A real failure, as opposed to "no profile yet".
  if (isError && !missing) {
    return (
      <p className="text-nx-caption text-nx-status-danger-fg">
        {getErrorMessage(error, t('knowledge.profile.loadError'))}
      </p>
    );
  }

  const details = update.isError ? getErrorDetails(update.error) : [];
  const errorText = update.isError
    ? details.length > 0
      ? details.join(' · ')
      : getErrorMessage(update.error, t('knowledge.profile.saveError'))
    : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const years = draft.yearsOfExperience.trim();
    // Every key is present — the type demands it, and the endpoint destroys whatever is absent.
    const payload: UpdateProfessionalProfileInput = {
      jobTitle: draft.jobTitle.trim() || null,
      seniorityLevel: draft.seniorityLevel,
      yearsOfExperience: years === '' ? null : Number(years),
      primaryRole: draft.primaryRole === '' ? null : draft.primaryRole,
      explanationStyle: draft.explanationStyle === '' ? null : draft.explanationStyle,
      knownTechStack: textToList(draft.knownTechStack),
      interestedDomains: textToList(draft.interestedDomains),
      workHistory: draft.workHistory,
    };
    update.mutate(payload, {
      // Drop the local copy so the fields re-derive from the profile the server just returned,
      // rather than continuing to show what was typed.
      onSuccess: () => setEdited(null),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {missing && (
        <p className="text-nx-caption text-nx-text-secondary">{t('knowledge.profile.notSetUp')}</p>
      )}

      <Input
        label={t('knowledge.profile.jobTitle')}
        value={draft.jobTitle}
        onChange={(e) => set('jobTitle', e.target.value)}
      />

      <div className="flex flex-wrap gap-3">
        <Select
          label={t('knowledge.profile.seniority')}
          value={draft.seniorityLevel}
          onChange={(e) => set('seniorityLevel', e.target.value as SeniorityLevel)}
          options={SENIORITY_LEVELS.map((level) => ({
            value: level,
            label: t(`knowledge.seniority.${level}`),
          }))}
        />
        <Select
          label={t('knowledge.profile.primaryRole')}
          value={draft.primaryRole}
          onChange={(e) => set('primaryRole', e.target.value as PrimaryRole | '')}
          options={[
            { value: '', label: t('knowledge.profile.unset') },
            ...PRIMARY_ROLES.map((role) => ({
              value: role,
              label: t(`knowledge.primaryRole.${role}`),
            })),
          ]}
        />
        <Input
          label={t('knowledge.profile.years')}
          type="number"
          min={0}
          max={50}
          value={draft.yearsOfExperience}
          onChange={(e) => set('yearsOfExperience', e.target.value)}
        />
      </div>

      <Select
        label={t('knowledge.profile.explanationStyle')}
        hint={t('knowledge.profile.explanationStyleHint')}
        value={draft.explanationStyle}
        onChange={(e) => set('explanationStyle', e.target.value as ExplanationStyle | '')}
        options={[
          { value: '', label: t('knowledge.profile.unset') },
          ...EXPLANATION_STYLES.map((style) => ({
            value: style,
            label: t(`knowledge.explanationStyle.${style}`),
          })),
        ]}
      />

      {/* Comma-separated rather than a chip editor: a tag input would be a fourth and fifth new
          component in a checkpoint capped at five, and these two fields are plain `string[]` with
          no ordering or validation rules to enforce. Revisit if the DS `Tag` specimen earns a
          consumer that needs more. */}
      <Input
        label={t('knowledge.profile.techStack')}
        hint={t('knowledge.profile.commaSeparated')}
        value={draft.knownTechStack}
        onChange={(e) => set('knownTechStack', e.target.value)}
      />
      <Input
        label={t('knowledge.profile.domains')}
        hint={t('knowledge.profile.commaSeparated')}
        value={draft.interestedDomains}
        onChange={(e) => set('interestedDomains', e.target.value)}
        error={errorText}
      />

      <div className="flex items-center justify-end gap-2">
        {edited && (
          <Button type="button" variant="ghost" onClick={() => setEdited(null)}>
            {t('knowledge.profile.discard')}
          </Button>
        )}
        <Button type="submit" loading={update.isPending} disabled={update.isPending}>
          {t('knowledge.profile.save')}
        </Button>
      </div>
    </form>
  );
}
