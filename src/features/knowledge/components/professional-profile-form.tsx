'use client';

import * as React from 'react';
import { Badge, Button, Card, Input, Select, Skeleton } from '@/shared/components';
import { getErrorDetails, getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
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
 *
 * ── IT SITS IN A CARD NOW. ────────────────────────────────────────────────────────────────────
 * This was the one block on `/profile?tab=professional` with no container: seven fields stacked
 * straight onto the recessed page ground, directly above two neighbours (`MySkillsCard`,
 * `GithubStatsCard`) that ARE cards. Three sections, two contained and one spilled — which reads
 * as an unfinished screen rather than as a deliberate difference, because there is no difference
 * to express. The card is the fix, and the rest of this pass follows from having a container to
 * structure:
 *
 *  - TWO GROUPS WITH A RULE BETWEEN THEM, not seven equidistant fields. `space-y-3` put the job
 *    title exactly as far from the seniority as the seniority from the explanation style, so the
 *    form stated no relationship at all. `Vị trí hiện tại` is what you do; `Trình giải thích` is a
 *    preference about how the AI writes back. Two questions, and the rule says so.
 *  - THE THREE SHORT FIELDS ARE A GRID, NOT A WRAP. `flex flex-wrap` left three `w-full` wrappers
 *    to negotiate their own widths, which at this measure meant a row of uneven thirds that became
 *    a ragged two-and-one as soon as a label grew. `sm:grid-cols-3` fixes the columns.
 *  - THE COMMA LISTS SHOW WHAT THEY PARSED TO. `React,TypeScript , Go` is three tags, and until
 *    now the only way to find that out was to save and reload. The chips are a READOUT, not the
 *    tag editor the original note deferred — nothing is removable, the text field is still the
 *    only input, and they replace the `Ngăn cách bằng dấu phẩy` hint that said in words what they
 *    now show.
 *  - THE SAVE ERROR IS NO LONGER A FIELD ERROR ON `interestedDomains`. It was passed as that
 *    field's `error` prop, so a rejected `yearsOfExperience` painted the *domains* box red and
 *    printed the reason under it. It is a form-level alert now, beside the button that caused it.
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

/**
 * One question the form asks, with the fields that answer it.
 *
 * `h3` because the page's own `h2` already names this card. A card repeating its section heading
 * inside itself would print `Hồ sơ nghề nghiệp` twice — the mistake `/u/[username]` already
 * records against the reputation card.
 */
function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-[var(--nx-space-element)]">
      <div className="flex flex-col gap-[var(--nx-space-pair)]">
        <h3 className="text-nx-ui font-semibold text-nx-text-primary">{title}</h3>
        {description && <p className="text-nx-caption text-nx-text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * What a comma-separated field parsed to. Renders nothing while the field is empty, so an
 * untouched form is not a column of blank strips — the placeholder does the teaching at that point.
 *
 * `aria-hidden` BECAUSE THIS IS THE FIELD'S OWN VALUE, SAID TWICE. A screen reader already reads
 * `Java, Spring Boot, Kotlin` off the input it is attached to; announcing the same six words again
 * as a list adds no fact, and naming the list after the field gave the page two elements with one
 * accessible name. The chips answer a question only a sighted reader has — "where did my commas
 * land?" — and the authoritative value stays in the input.
 */
function ListPreview({ text }: { text: string }) {
  const items = textToList(text);
  if (items.length === 0) return null;

  return (
    <ul aria-hidden className="flex flex-wrap gap-[var(--nx-space-tight)]">
      {items.map((item) => (
        <li key={item}>
          <Badge mono>{item}</Badge>
        </li>
      ))}
    </ul>
  );
}

/** One fact in the read-only summary. Not `aria-hidden` like `ListPreview`: this IS the value,
    there is no input beside it carrying the same text to a screen reader first. */
function SummaryField({ label, value }: { label: string; value?: string | null }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-[var(--nx-space-pair)]">
      <span className="text-nx-caption text-nx-text-muted">{label}</span>
      <span className="text-nx-body-sm font-medium text-nx-text-primary">
        {value || t('knowledge.profile.unset')}
      </span>
    </div>
  );
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
  // A SET-UP PROFILE OPENS AS A READ-ONLY SUMMARY; THE SEVEN-FIELD FORM ONLY SHOWS ONCE SOMEONE
  // ASKS TO EDIT IT. A profile that has never been filled in has nothing to summarise, so `missing`
  // always forces the form open regardless of this flag.
  const [editing, setEditing] = React.useState(false);
  const missing = isError && isProfileMissing(error);
  const draft = edited ?? (profile ? toDraft(profile) : EMPTY_DRAFT);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setEdited({ ...draft, [key]: value });

  // Wrapped like the settled states below it, so the section does not change shape when the query
  // resolves: bare `Skeleton` lines here meant the card materialised around the content afterwards.
  if (isPending) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }

  // A real failure, as opposed to "no profile yet".
  if (isError && !missing) {
    return (
      <Card>
        <p className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(error, t('knowledge.profile.loadError'))}
        </p>
      </Card>
    );
  }

  // THE VIEW MODE. `!missing` guarantees `profile` is defined here: `isPending` and the real-error
  // case are both handled above, and `missing` is the only way `isError` can still be true.
  if (!editing && !missing && profile) {
    const techStack = profile.knownTechStack ?? [];
    const domains = profile.interestedDomains ?? [];

    return (
      <Card>
        <div className="flex flex-col gap-[var(--nx-space-block)]">
          <div className="flex items-start justify-between gap-[var(--nx-space-element)]">
            <div className="grid flex-1 gap-x-[var(--nx-space-element)] gap-y-[var(--nx-space-block)] sm:grid-cols-2">
              <SummaryField label={t('knowledge.profile.jobTitle')} value={profile.jobTitle} />
              <SummaryField
                label={t('knowledge.profile.seniority')}
                value={t(`knowledge.seniority.${profile.seniorityLevel}`)}
              />
              <SummaryField
                label={t('knowledge.profile.primaryRole')}
                value={
                  profile.primaryRole
                    ? t(`knowledge.primaryRole.${profile.primaryRole}`)
                    : undefined
                }
              />
              <SummaryField
                label={t('knowledge.profile.years')}
                value={
                  profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : undefined
                }
              />
              <SummaryField
                label={t('knowledge.profile.explanationStyle')}
                value={
                  profile.explanationStyle
                    ? t(`knowledge.explanationStyle.${profile.explanationStyle}`)
                    : undefined
                }
              />
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {t('knowledge.profile.edit')}
            </Button>
          </div>

          {(techStack.length > 0 || domains.length > 0) && (
            <div className="flex flex-col gap-[var(--nx-space-element)] border-t border-nx-border-subtle pt-4">
              {techStack.length > 0 && (
                <div className="flex flex-col gap-[var(--nx-space-tight)]">
                  <span className="text-nx-caption text-nx-text-muted">
                    {t('knowledge.profile.techStack')}
                  </span>
                  <ListPreview text={listToText(techStack)} />
                </div>
              )}
              {domains.length > 0 && (
                <div className="flex flex-col gap-[var(--nx-space-tight)]">
                  <span className="text-nx-caption text-nx-text-muted">
                    {t('knowledge.profile.domains')}
                  </span>
                  <ListPreview text={listToText(domains)} />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
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
      // rather than continuing to show what was typed, and close back to the summary — the form
      // was only open because someone asked to edit, and the edit is now done.
      onSuccess: () => {
        setEdited(null);
        setEditing(false);
      },
    });
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-[var(--nx-space-block)]">
        {missing && (
          <p className="rounded-nx-sm bg-nx-status-info-bg px-3 py-2 text-nx-body-sm text-nx-status-info-fg">
            {t('knowledge.profile.notSetUp')}
          </p>
        )}

        <FieldGroup title={t('knowledge.profile.groupRole')}>
          <Input
            label={t('knowledge.profile.jobTitle')}
            placeholder={t('knowledge.profile.jobTitlePlaceholder')}
            value={draft.jobTitle}
            onChange={(e) => set('jobTitle', e.target.value)}
          />

          {/* THREE COLUMNS, FIXED — see the header. They collapse to one below `sm`, where three
              selects side by side would be about 100px each. */}
          <div className="grid gap-[var(--nx-space-element)] sm:grid-cols-3">
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

          {/* Comma-separated rather than a chip editor: a tag input would be a fourth and fifth new
              component in a checkpoint capped at five, and these two fields are plain `string[]`
              with no ordering or validation rules to enforce. `ListPreview` is the cheap half of
              what a chip editor would have bought — you can see the parse — without the half that
              needs a new primitive. */}
          <div className="flex flex-col gap-[var(--nx-space-tight)]">
            <Input
              label={t('knowledge.profile.techStack')}
              placeholder={t('knowledge.profile.techStackPlaceholder')}
              value={draft.knownTechStack}
              onChange={(e) => set('knownTechStack', e.target.value)}
            />
            <ListPreview text={draft.knownTechStack} />
          </div>

          <div className="flex flex-col gap-[var(--nx-space-tight)]">
            <Input
              label={t('knowledge.profile.domains')}
              placeholder={t('knowledge.profile.domainsPlaceholder')}
              value={draft.interestedDomains}
              onChange={(e) => set('interestedDomains', e.target.value)}
            />
            <ListPreview text={draft.interestedDomains} />
          </div>
        </FieldGroup>

        {/* The rule IS the group boundary. `border-subtle` rather than `default`: inside a card it
            separates two parts of one thing, and the heavier line reads as two things. */}
        <hr className="border-nx-border-subtle" />

        <FieldGroup
          title={t('knowledge.profile.groupStyle')}
          // Was the select's own `hint`, which filed a sentence about the whole group under one
          // field. It says why the group exists, so it sits with the group's title.
          description={t('knowledge.profile.explanationStyleHint')}
        >
          {/* CAPPED, UNLIKE THE FIELDS ABOVE IT. A four-option enum stretched to the full 656
              measure is a control claiming an importance it does not have; the fields in the first
              group are free text and earn their width. */}
          <Select
            label={t('knowledge.profile.explanationStyle')}
            value={draft.explanationStyle}
            onChange={(e) => set('explanationStyle', e.target.value as ExplanationStyle | '')}
            options={[
              { value: '', label: t('knowledge.profile.unset') },
              ...EXPLANATION_STYLES.map((style) => ({
                value: style,
                label: t(`knowledge.explanationStyle.${style}`),
              })),
            ]}
            wrapperClassName="sm:max-w-xs"
          />
        </FieldGroup>

        {errorText && (
          <p
            role="alert"
            className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
          >
            {errorText}
          </p>
        )}

        {/* THE FOOTER IS A ROW, NOT A RIGHT-ALIGNED PAIR OF BUTTONS. The left slot answers "is
            there anything of mine in here the server has not seen?", which used to be legible only
            from the presence of the `Huỷ thay đổi` button — from a control's existence rather than
            from a sentence. */}
        <div className="flex flex-wrap items-center justify-between gap-[var(--nx-space-element)] border-t border-nx-border-subtle pt-4">
          <p aria-live="polite" className="text-nx-caption text-nx-text-muted">
            {edited
              ? t('knowledge.profile.unsaved')
              : update.isSuccess
                ? t('knowledge.profile.saved')
                : ''}
          </p>

          <div className="flex items-center gap-2">
            {missing ? (
              // No summary to fall back to yet — the only way out of an untouched blank form is
              // discarding what was typed into it, and that only means something once it is dirty.
              edited && (
                <Button type="button" variant="ghost" onClick={() => setEdited(null)}>
                  {t('knowledge.profile.discard')}
                </Button>
              )
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEdited(null);
                  setEditing(false);
                }}
              >
                {t('knowledge.profile.cancel')}
              </Button>
            )}
            <Button type="submit" loading={update.isPending} disabled={update.isPending}>
              {t('knowledge.profile.save')}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
