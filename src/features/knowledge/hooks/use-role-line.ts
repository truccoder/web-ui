'use client';

import { useT } from '@/core/i18n';
import type { PrimaryRole, SeniorityLevel } from '../types';

/**
 * The role line a profile hero prints under the name — `Backend Developer · Senior`.
 *
 * IT LIVES IN `knowledge` BECAUSE THE LABELS DO. `primaryRole` and `seniorityLevel` arrive as
 * enum members, and the Vietnamese for each is `knowledge.primaryRole.*` / `knowledge.seniority.*`
 * — keys this domain owns because it owns the form that writes them. A caller composing the line
 * itself would have to reach for this domain's translation keys anyway, which is the same coupling
 * without the single definition.
 *
 * IT TAKES THREE FIELDS, NOT A DTO, AND THAT IS THE WHOLE REASON IT CAN BE SHARED. The two heroes
 * read the same three facts out of two DIFFERENT payloads: `/profile` gets them from
 * `ProfessionalProfileResponseDto` (owner-facing, this domain), and `/u/{username}` from
 * `PublicProfileResponse` (the security domain's public record, which B21 widened to carry them).
 * Naming either type here would tie this function to one caller and force the other to convert.
 *
 * ── The composition, and why it is not `jobTitle · primaryRole` ────────────────────────────────
 * `jobTitle` is freeform and the most specific thing a person has said about themselves, so it
 * leads. `primaryRole` stands in only when they left the title blank — printing both risks
 * "Backend Developer · Backend", which says one thing twice.
 *
 * Seniority is the second part because a title and a level are ORTHOGONAL: whatever the first part
 * turned out to be, the level adds something it did not say.
 *
 * Returns the empty string when there is nothing to say — a profile that has never filled the form
 * in, which on `/profile` is a 404 from `useProfessionalProfile` and on `/u` is three nulls in the
 * payload. Callers pass it on as `subtitle={line || undefined}` so the hero drops the slot rather
 * than rendering an empty line.
 */
export interface RoleLineInput {
  jobTitle?: string | null;
  primaryRole?: PrimaryRole | null;
  seniorityLevel?: SeniorityLevel | null;
}

export function useRoleLine({ jobTitle, primaryRole, seniorityLevel }: RoleLineInput): string {
  const t = useT();

  return [
    jobTitle?.trim() || (primaryRole ? t(`knowledge.primaryRole.${primaryRole}`) : null),
    seniorityLevel ? t(`knowledge.seniority.${seniorityLevel}`) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
