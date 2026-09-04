'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import {
  POSITION_LIMITS,
  SENIORITY_LEVELS,
  validatePositionDraft,
  type PositionDraft,
  type PositionErrors,
} from '../lib/position-form';

/**
 * ONE ROLE EDITOR, SHARED BY EVERY PLACE A ROLE IS ENTERED — the create dialog's repeating list,
 * `AddPositionButton` and `PositionOwnerControls`. The JD spec asks for this by name: "if two
 * copies validate separately they drift apart on the first edit."
 *
 * The rules themselves are in `../lib/position-form` (pure, tested). This component only renders
 * `PositionDraft` and reports edits back through `onChange`; `showErrors` turns the field-level
 * messages on once the parent has had a submit attempt, so nothing is red before it is touched.
 *
 * PLACEHOLDERS ARE THE TEMPLATE. Every field carries a real worked example rather than "Nhập nội
 * dung…", because a blank JD form is the thing a first-time poster cannot fill in well.
 */
export interface PositionFormFieldsProps {
  value: PositionDraft;
  onChange: (next: PositionDraft) => void;
  /** Show the field-level validation messages (after a submit attempt). @default false */
  showErrors?: boolean;
  /** Pre-computed errors; falls back to validating `value` when omitted. */
  errors?: PositionErrors;
}

const ROLE_SUMMARY_ROWS = 4;

export function PositionFormFields({
  value,
  onChange,
  showErrors = false,
  errors,
}: PositionFormFieldsProps) {
  const t = useT();
  const resolved = errors ?? validatePositionDraft(value);
  const err = (field: keyof PositionErrors) =>
    showErrors && resolved[field] ? t(`projects.position.errors.${resolved[field]}`) : undefined;

  const patch = (next: Partial<PositionDraft>) => onChange({ ...value, ...next });

  const summaryLength = value.roleSummary.trim().length;

  return (
    <div className="flex flex-col gap-[var(--nx-space-element)]">
      <Input
        label={t('projects.position.titleLabel')}
        value={value.title}
        onChange={(event) => patch({ title: event.target.value })}
        placeholder={t('projects.position.titlePlaceholder')}
        error={err('title')}
        maxLength={POSITION_LIMITS.titleMax + 20}
      />

      <div className="flex flex-col gap-[var(--nx-space-pair)]">
        <Textarea
          rows={ROLE_SUMMARY_ROWS}
          label={t('projects.position.summaryLabel')}
          value={value.roleSummary}
          onChange={(event) => patch({ roleSummary: event.target.value })}
          placeholder={t('projects.position.summaryPlaceholder')}
          error={err('roleSummary')}
        />
        {/* Counts up to the 40-char floor, then just shows the length — the floor is the part a
            person is working towards. */}
        <p
          className={
            summaryLength > 0 && summaryLength < POSITION_LIMITS.roleSummaryMin
              ? 'text-nx-caption text-nx-text-muted'
              : 'text-nx-caption text-nx-text-faint'
          }
        >
          {summaryLength < POSITION_LIMITS.roleSummaryMin
            ? t('projects.position.summaryCounter', {
                count: summaryLength,
                min: POSITION_LIMITS.roleSummaryMin,
              })
            : t('projects.position.summaryCounterOk', { count: summaryLength })}
        </p>
      </div>

      <LineList
        label={t('projects.position.responsibilitiesLabel')}
        hint={t('projects.position.responsibilitiesHint')}
        placeholder={t('projects.position.responsibilityPlaceholder')}
        addLabel={t('projects.position.addLine')}
        removeLabel={t('projects.position.removeLine')}
        rows={value.responsibilities}
        onChange={(responsibilities) => patch({ responsibilities })}
        error={err('responsibilities')}
      />

      <LineList
        label={t('projects.position.requirementsLabel')}
        hint={t('projects.position.requirementsHint')}
        placeholder={t('projects.position.requirementPlaceholder')}
        addLabel={t('projects.position.addLine')}
        removeLabel={t('projects.position.removeLine')}
        rows={value.requirements}
        onChange={(requirements) => patch({ requirements })}
        error={err('requirements')}
      />

      <LineList
        label={t('projects.position.niceToHaveLabel')}
        hint={t('projects.position.niceToHaveHint')}
        placeholder={t('projects.position.niceToHavePlaceholder')}
        addLabel={t('projects.position.addLine')}
        removeLabel={t('projects.position.removeLine')}
        rows={value.niceToHave}
        onChange={(niceToHave) => patch({ niceToHave })}
        error={err('niceToHave')}
        allowEmpty
      />

      <SkillChips
        value={value.requiredSkills}
        onChange={(requiredSkills) => patch({ requiredSkills })}
        error={err('requiredSkills')}
      />

      <div className="grid gap-[var(--nx-space-element)] sm:grid-cols-3">
        <Input
          type="number"
          min={POSITION_LIMITS.yearsMin}
          max={POSITION_LIMITS.yearsMax}
          label={t('projects.position.minYearsLabel')}
          hint={t('projects.position.minYearsHint')}
          value={value.minYearsExperience}
          onChange={(event) => patch({ minYearsExperience: event.target.value })}
          error={err('minYearsExperience')}
        />
        <Select
          label={t('projects.position.seniorityLabel')}
          hint={t('projects.position.seniorityHint')}
          value={value.seniorityLevel}
          onChange={(event) =>
            patch({ seniorityLevel: event.target.value as PositionDraft['seniorityLevel'] })
          }
          options={[
            { value: '', label: t('projects.position.seniorityAny') },
            ...SENIORITY_LEVELS.map((level) => ({
              value: level,
              label: t(`knowledge.seniority.${level}`),
            })),
          ]}
        />
        <Input
          type="number"
          min={1}
          label={t('projects.position.quantityLabel')}
          hint={t('projects.position.quantityHint')}
          value={String(value.quantity)}
          onChange={(event) => {
            const n = Number(event.target.value);
            patch({ quantity: Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1 });
          }}
        />
      </div>
    </div>
  );
}

/**
 * A repeating list of one-line inputs — one `<input>` per row, add / remove, a minimum of two rows
 * kept on screen for `responsibilities` / `requirements` (`allowEmpty` drops that for `niceToHave`).
 */
function LineList({
  label,
  hint,
  placeholder,
  addLabel,
  removeLabel,
  rows,
  onChange,
  error,
  allowEmpty = false,
}: {
  label: string;
  hint: string;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  rows: string[];
  onChange: (rows: string[]) => void;
  error?: string;
  allowEmpty?: boolean;
}) {
  const minRows = allowEmpty ? 0 : POSITION_LIMITS.listMin;
  const visible = rows.length > 0 || allowEmpty ? rows : ['', ''];

  const setRow = (index: number, text: string) =>
    onChange(visible.map((row, i) => (i === index ? text : row)));
  const removeRow = (index: number) => onChange(visible.filter((_, i) => i !== index));
  const addRow = () => onChange([...visible, '']);

  return (
    <fieldset className="flex flex-col gap-[var(--nx-space-pair)]">
      <legend className="text-nx-body-sm font-medium text-nx-text-primary">{label}</legend>
      <p className="text-nx-caption text-nx-text-muted">{hint}</p>

      <div className="flex flex-col gap-[var(--nx-space-pair)]">
        {visible.map((row, index) => (
          <div key={index} className="flex items-center gap-[var(--nx-space-pair)]">
            <Input
              wrapperClassName="flex-1"
              value={row}
              onChange={(event) => setRow(index, event.target.value)}
              placeholder={placeholder}
              aria-label={`${label} ${index + 1}`}
              maxLength={POSITION_LIMITS.listItemMax + 20}
            />
            {visible.length > minRows && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                icon={<X />}
                aria-label={removeLabel}
                onClick={() => removeRow(index)}
              />
            )}
          </div>
        ))}
      </div>

      {visible.length < POSITION_LIMITS.listMax && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<Plus />}
          className="self-start"
          onClick={addRow}
        >
          {addLabel}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Skills as chips — the one field the JD spec asks to be a chip editor rather than a comma list,
 * because `requiredSkills` is what the candidate match runs on. Enter or comma commits the pending
 * text; Backspace on an empty field removes the last chip.
 */
function SkillChips({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (skills: string[]) => void;
  error?: string;
}) {
  const t = useT();
  const [pending, setPending] = React.useState('');

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const part of parts) {
      if (!next.some((skill) => skill.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    onChange(next);
    setPending('');
  };

  return (
    <div className="flex flex-col gap-[var(--nx-space-pair)]">
      <span className="text-nx-body-sm font-medium text-nx-text-primary">
        {t('projects.position.skillsLabel')}
      </span>
      <p className="text-nx-caption text-nx-text-muted">{t('projects.position.skillsHint')}</p>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-[var(--nx-space-tight)]">
          {value.map((skill) => (
            <li key={skill}>
              <span className="inline-flex items-center gap-1 rounded-nx-full bg-nx-accent-soft py-0.5 pl-2.5 pr-1 text-nx-caption text-nx-text-accent">
                {skill}
                <button
                  type="button"
                  aria-label={t('projects.position.removeSkill', { skill })}
                  className="rounded-nx-full p-0.5 hover:bg-nx-accent/20"
                  onClick={() => onChange(value.filter((item) => item !== skill))}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Input
        value={pending}
        onChange={(event) => {
          const text = event.target.value;
          if (text.includes(',')) commit(text);
          else setPending(text);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(pending);
          } else if (event.key === 'Backspace' && pending === '' && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(pending)}
        placeholder={t('projects.position.skillsPlaceholder')}
        aria-label={t('projects.position.skillsLabel')}
        error={error}
      />
    </div>
  );
}
