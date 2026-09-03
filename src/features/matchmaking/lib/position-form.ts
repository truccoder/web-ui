import type { CreatePositionInput, ProjectPosition, SeniorityLevel } from '../types/matchmaking';

/**
 * The rules `ProjectPositionRequestDTO` enforces server-side (BE `V105`, `docs/FEPlanJobDescription.md`),
 * lifted out of the form so the form can stop a submit BEFORE the request and so the numbers live
 * in one place instead of being retyped in three dialogs.
 *
 * WHY A PURE MODULE AND NOT VALIDATION INSIDE THE COMPONENT: `vitest.config.mts` runs node-only,
 * `.test.ts` only — no jsdom, no component tests — and the four-home rule keeps a slice's logic in
 * its own `lib/`. So the checks the JD spec asks to be tested ("under 40 chars, one line, no
 * skills") are a plain function here with a `.test.ts` beside it; `position-form-fields.tsx` only
 * renders what this returns.
 */
export const POSITION_LIMITS = {
  /** `title` — `@Size(max = 255)`. */
  titleMax: 255,
  /** `roleSummary` — `@Size(min = 40, max = 2000)`. */
  roleSummaryMin: 40,
  roleSummaryMax: 2000,
  /** `responsibilities` / `requirements` — 2–15 items, each `@Size(max = 300)`. */
  listMin: 2,
  listMax: 15,
  listItemMax: 300,
  /** `niceToHave` — up to 10 items; does not affect matching. */
  niceToHaveMax: 10,
  /** `requiredSkills` — 1–20 items, each `@Size(max = 60)`. */
  skillsMin: 1,
  skillsMax: 20,
  skillMax: 60,
  /** `minYearsExperience` — 0–50 when present. */
  yearsMin: 0,
  yearsMax: 50,
} as const;

export const SENIORITY_LEVELS: readonly SeniorityLevel[] = [
  'JUNIOR',
  'MID',
  'SENIOR',
  'LEAD',
  'PRINCIPAL',
];

/**
 * The editable shape behind the position form. Every list is a plain `string[]` of rows — one
 * input per row — so add / remove is `.slice`, and `minYearsExperience` stays a string because an
 * empty input means "unset", not 0.
 */
export interface PositionDraft {
  title: string;
  roleSummary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  requiredSkills: string[];
  minYearsExperience: string;
  seniorityLevel: '' | SeniorityLevel;
  quantity: number;
}

export function emptyPositionDraft(): PositionDraft {
  return {
    title: '',
    roleSummary: '',
    responsibilities: ['', ''],
    requirements: ['', ''],
    niceToHave: [],
    requiredSkills: [],
    minYearsExperience: '',
    seniorityLevel: '',
    quantity: 1,
  };
}

/** Seed the editor from an existing role. Short lists are padded to the 2-row minimum. */
export function positionToDraft(position: ProjectPosition): PositionDraft {
  const rows = (value: string[] | undefined, min: number) => {
    const filled = (value ?? []).filter((item) => item.trim().length > 0);
    while (filled.length < min) filled.push('');
    return filled;
  };
  return {
    title: position.title ?? '',
    roleSummary: position.roleSummary ?? '',
    responsibilities: rows(position.responsibilities, POSITION_LIMITS.listMin),
    requirements: rows(position.requirements, POSITION_LIMITS.listMin),
    niceToHave: (position.niceToHave ?? []).filter((item) => item.trim().length > 0),
    requiredSkills: position.requiredSkills ?? [],
    minYearsExperience:
      position.minYearsExperience != null ? String(position.minYearsExperience) : '',
    seniorityLevel: position.seniorityLevel ?? '',
    quantity: position.quantity ?? 1,
  };
}

export type PositionErrorCode =
  | 'titleRequired'
  | 'titleTooLong'
  | 'summaryRequired'
  | 'summaryTooShort'
  | 'summaryTooLong'
  | 'listTooFew'
  | 'listTooMany'
  | 'listItemTooLong'
  | 'skillsRequired'
  | 'skillsTooMany'
  | 'skillTooLong'
  | 'niceToHaveTooMany'
  | 'yearsRange';

export type PositionField =
  | 'title'
  | 'roleSummary'
  | 'responsibilities'
  | 'requirements'
  | 'niceToHave'
  | 'requiredSkills'
  | 'minYearsExperience';

export type PositionErrors = Partial<Record<PositionField, PositionErrorCode>>;

const cleanList = (rows: string[]) => rows.map((row) => row.trim()).filter(Boolean);

function validateList(rows: string[], required: boolean): PositionErrorCode | undefined {
  const items = cleanList(rows);
  if (items.some((item) => item.length > POSITION_LIMITS.listItemMax)) return 'listItemTooLong';
  if (items.length > POSITION_LIMITS.listMax) return 'listTooMany';
  if (required && items.length < POSITION_LIMITS.listMin) return 'listTooFew';
  return undefined;
}

/**
 * Every rule the server would answer 422 for, checked against the draft as typed. An empty object
 * means the draft is safe to send.
 */
export function validatePositionDraft(draft: PositionDraft): PositionErrors {
  const errors: PositionErrors = {};

  const title = draft.title.trim();
  if (title.length === 0) errors.title = 'titleRequired';
  else if (title.length > POSITION_LIMITS.titleMax) errors.title = 'titleTooLong';

  const summary = draft.roleSummary.trim();
  if (summary.length === 0) errors.roleSummary = 'summaryRequired';
  else if (summary.length < POSITION_LIMITS.roleSummaryMin) errors.roleSummary = 'summaryTooShort';
  else if (summary.length > POSITION_LIMITS.roleSummaryMax) errors.roleSummary = 'summaryTooLong';

  const responsibilities = validateList(draft.responsibilities, true);
  if (responsibilities) errors.responsibilities = responsibilities;

  const requirements = validateList(draft.requirements, true);
  if (requirements) errors.requirements = requirements;

  const niceToHave = cleanList(draft.niceToHave);
  if (niceToHave.some((item) => item.length > POSITION_LIMITS.listItemMax))
    errors.niceToHave = 'listItemTooLong';
  else if (niceToHave.length > POSITION_LIMITS.niceToHaveMax)
    errors.niceToHave = 'niceToHaveTooMany';

  const skills = cleanList(draft.requiredSkills);
  if (skills.length < POSITION_LIMITS.skillsMin) errors.requiredSkills = 'skillsRequired';
  else if (skills.length > POSITION_LIMITS.skillsMax) errors.requiredSkills = 'skillsTooMany';
  else if (skills.some((skill) => skill.length > POSITION_LIMITS.skillMax))
    errors.requiredSkills = 'skillTooLong';

  const years = draft.minYearsExperience.trim();
  if (years.length > 0) {
    const parsed = Number(years);
    if (
      !Number.isFinite(parsed) ||
      parsed < POSITION_LIMITS.yearsMin ||
      parsed > POSITION_LIMITS.yearsMax
    ) {
      errors.minYearsExperience = 'yearsRange';
    }
  }

  return errors;
}

export function isPositionDraftValid(draft: PositionDraft): boolean {
  return Object.keys(validatePositionDraft(draft)).length === 0;
}

/**
 * An untouched row in `CreateProjectDialog`'s list — dropped before submit rather than validated,
 * so adding a blank row and never filling it does not block the form.
 */
export function isPositionDraftEmpty(draft: PositionDraft): boolean {
  return (
    draft.title.trim() === '' &&
    draft.roleSummary.trim() === '' &&
    cleanList(draft.responsibilities).length === 0 &&
    cleanList(draft.requirements).length === 0 &&
    cleanList(draft.niceToHave).length === 0 &&
    cleanList(draft.requiredSkills).length === 0
  );
}

/** Draft → request body. Assumes the draft has passed {@link validatePositionDraft}. */
export function toPositionRequest(draft: PositionDraft): CreatePositionInput {
  const years = draft.minYearsExperience.trim();
  const parsedYears = years === '' ? undefined : Number(years);
  return {
    title: draft.title.trim(),
    roleSummary: draft.roleSummary.trim(),
    responsibilities: cleanList(draft.responsibilities),
    requirements: cleanList(draft.requirements),
    niceToHave: cleanList(draft.niceToHave),
    requiredSkills: cleanList(draft.requiredSkills),
    minYearsExperience:
      parsedYears != null && Number.isFinite(parsedYears) ? Math.floor(parsedYears) : undefined,
    seniorityLevel: draft.seniorityLevel || undefined,
    quantity: draft.quantity >= 1 ? Math.floor(draft.quantity) : undefined,
  };
}
