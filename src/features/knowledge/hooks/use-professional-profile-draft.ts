'use client';

import { useState } from 'react';
import type {
  ExplanationStyle,
  PrimaryRole,
  ProfessionalProfile,
  SeniorityLevel,
  UpdateProfessionalProfileInput,
  WorkExperience,
} from '../types/knowledge';

/**
 * The professional-profile draft — its shape, its serialization, and the edit helpers — pulled
 * out of `ProfessionalProfileForm` so the in-place form and the onboarding wizard cannot drift
 * apart on the one thing that matters here.
 *
 * THE ENDPOINT IS A FULL REPLACE. `PUT /v1/api/profile/professional` nulls every key it is not
 * sent (measured at P2.11a — a three-field PUT destroyed a job title and a four-entry stack). So
 * `toPayload()` always emits all eight keys, `workHistory` included, whichever surface built the
 * draft. Both the form and the wizard consume this; neither re-derives the rule.
 *
 * DERIVE, DO NOT COPY. `draft` is `edited ?? toDraft(profile)` — the displayed values fall back to
 * whatever the query currently holds until the reader touches a field, so there is no
 * copy-server-state-into-an-effect (which `react-hooks/set-state-in-effect` rejects and which
 * would go stale the moment the mutation writes a fresh profile into the cache).
 */
export interface ProfessionalProfileDraft {
  jobTitle: string;
  seniorityLevel: SeniorityLevel;
  yearsOfExperience: string;
  primaryRole: PrimaryRole | '';
  explanationStyle: ExplanationStyle | '';
  knownTechStack: string;
  interestedDomains: string;
  workHistory: WorkExperience[] | null;
}

/** `seniorityLevel` is the one `@NotNull` field, so a blank profile still needs a starting value. */
export const EMPTY_PROFESSIONAL_DRAFT: ProfessionalProfileDraft = {
  jobTitle: '',
  seniorityLevel: 'MID',
  yearsOfExperience: '',
  primaryRole: '',
  explanationStyle: '',
  knownTechStack: '',
  interestedDomains: '',
  workHistory: null,
};

/** Comma-separated text is how the two `string[]` fields are edited — see `ListPreview` in the form. */
export const listToText = (list: string[] | null) => (list ?? []).join(', ');
export const textToList = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export function toProfessionalDraft(profile: ProfessionalProfile): ProfessionalProfileDraft {
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

/** Every key present — the type demands it and the endpoint destroys whatever is absent. */
export function professionalDraftToPayload(
  draft: ProfessionalProfileDraft
): UpdateProfessionalProfileInput {
  const years = draft.yearsOfExperience.trim();
  return {
    jobTitle: draft.jobTitle.trim() || null,
    seniorityLevel: draft.seniorityLevel,
    yearsOfExperience: years === '' ? null : Number(years),
    primaryRole: draft.primaryRole === '' ? null : draft.primaryRole,
    explanationStyle: draft.explanationStyle === '' ? null : draft.explanationStyle,
    knownTechStack: textToList(draft.knownTechStack),
    interestedDomains: textToList(draft.interestedDomains),
    workHistory: draft.workHistory,
  };
}

export interface ProfessionalProfileDraftControls {
  draft: ProfessionalProfileDraft;
  /** True once the reader has changed anything — nothing of theirs is unsaved otherwise. */
  dirty: boolean;
  set: <K extends keyof ProfessionalProfileDraft>(
    key: K,
    value: ProfessionalProfileDraft[K]
  ) => void;
  /** Drop the local copy so the fields re-derive from the query. */
  reset: () => void;
  work: WorkExperience[];
  setWorkRow: (index: number, patch: Partial<WorkExperience>) => void;
  addWorkRow: () => void;
  removeWorkRow: (index: number) => void;
  toPayload: () => UpdateProfessionalProfileInput;
}

export function useProfessionalProfileDraft(
  profile?: ProfessionalProfile
): ProfessionalProfileDraftControls {
  const [edited, setEdited] = useState<ProfessionalProfileDraft | null>(null);
  const draft = edited ?? (profile ? toProfessionalDraft(profile) : EMPTY_PROFESSIONAL_DRAFT);

  // Spreads the DERIVED draft, not `edited` — the first edit captures the current server values.
  const set = <K extends keyof ProfessionalProfileDraft>(
    key: K,
    value: ProfessionalProfileDraft[K]
  ) => setEdited({ ...draft, [key]: value });

  const work = draft.workHistory ?? [];
  const setWorkRow = (index: number, patch: Partial<WorkExperience>) =>
    set(
      'workHistory',
      work.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  const addWorkRow = () =>
    set('workHistory', [
      ...work,
      { company: null, role: null, domain: null, durationMonths: null },
    ]);
  const removeWorkRow = (index: number) => {
    const next = work.filter((_, i) => i !== index);
    set('workHistory', next.length > 0 ? next : null);
  };

  return {
    draft,
    dirty: edited !== null,
    set,
    reset: () => setEdited(null),
    work,
    setWorkRow,
    addWorkRow,
    removeWorkRow,
    toPayload: () => professionalDraftToPayload(draft),
  };
}
