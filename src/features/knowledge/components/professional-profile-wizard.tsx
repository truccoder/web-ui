'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { ApiErrorNotice, Button, Card, Input, ProgressBar, Select } from '@/shared/components';
import { useT } from '@/core/i18n';
import {
  useProfessionalProfile,
  useProfessionalProfileDraft,
  useUpdateProfessionalProfile,
} from '../hooks';
import type { ExplanationStyle, PrimaryRole, SeniorityLevel } from '../types/knowledge';

/**
 * The onboarding path onto the professional profile — the same fields as
 * `ProfessionalProfileForm`, walked one question at a time instead of stacked.
 *
 * WHY A WIZARD AND NOT THE FORM. The form opens as a read-only summary and reveals its seven
 * fields only on "Edit" — right for a profile that exists. A person arriving here has none: they
 * were bounced by a 428 (`onProfileRequired`) or sent by "set up your profile first". A blank
 * seven-field form is a wall; four short steps with a progress bar is a task. Both write through
 * `useProfessionalProfileDraft`, so the full-replace contract is defined once.
 *
 * IT IS NOT ON `/profile`. It has its own route (`/onboarding/professional`) that carries a
 * `?next=` back to whatever triggered the 428, so finishing returns the reader to the explanation
 * they were trying to generate rather than dropping them on a settings tab.
 */
export interface ProfessionalProfileWizardProps {
  /** Called once the profile has been saved. The route decides where that goes. */
  onDone: () => void;
  /** Where "skip for now" leads — usually the same `?next=` target. Omitted → no skip control. */
  nextHref?: string;
}

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

const STEP_COUNT = 4;

export function ProfessionalProfileWizard({ onDone, nextHref }: ProfessionalProfileWizardProps) {
  const t = useT();
  // A 404 here is the ordinary case (no profile yet); the draft hook falls back to EMPTY.
  const { data: profile } = useProfessionalProfile();
  const { draft, set, work, setWorkRow, addWorkRow, removeWorkRow, toPayload } =
    useProfessionalProfileDraft(profile);
  const update = useUpdateProfessionalProfile();

  const [step, setStep] = useState(1);
  const last = step === STEP_COUNT;

  const submit = () => update.mutate(toPayload(), { onSuccess: onDone });

  return (
    <Card>
      <div className="flex flex-col gap-[var(--nx-space-block)]">
        <div className="flex flex-col gap-[var(--nx-space-tight)]">
          <p className="font-mono text-nx-overline uppercase tracking-wide text-nx-text-muted">
            {t('onboarding.professional.stepOf', { step, total: STEP_COUNT })}
          </p>
          <h2 className="text-nx-title-sm font-semibold text-nx-text-primary">
            {t(`onboarding.professional.steps.${step}.title`)}
          </h2>
          <p className="text-nx-body-sm text-nx-text-secondary">
            {t(`onboarding.professional.steps.${step}.hint`)}
          </p>
          <ProgressBar
            className="mt-1"
            value={(step / STEP_COUNT) * 100}
            label={t('onboarding.professional.progressLabel')}
          />
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-[var(--nx-space-element)]">
            <Input
              label={t('knowledge.profile.jobTitle')}
              placeholder={t('knowledge.profile.jobTitlePlaceholder')}
              value={draft.jobTitle}
              onChange={(e) => set('jobTitle', e.target.value)}
            />
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
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-[var(--nx-space-element)]">
            <Input
              label={t('knowledge.profile.techStack')}
              placeholder={t('knowledge.profile.techStackPlaceholder')}
              value={draft.knownTechStack}
              onChange={(e) => set('knownTechStack', e.target.value)}
            />
            <Input
              label={t('knowledge.profile.domains')}
              placeholder={t('knowledge.profile.domainsPlaceholder')}
              value={draft.interestedDomains}
              onChange={(e) => set('interestedDomains', e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
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
            wrapperClassName="sm:max-w-xs"
          />
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            {work.map((row, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    wrapperClassName="flex-1"
                    value={row.company ?? ''}
                    onChange={(e) => setWorkRow(index, { company: e.target.value || null })}
                    placeholder={t('knowledge.profile.work.company')}
                    aria-label={t('knowledge.profile.work.company')}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={<X />}
                    aria-label={t('knowledge.profile.work.remove')}
                    onClick={() => removeWorkRow(index)}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={row.role ?? ''}
                    onChange={(e) => setWorkRow(index, { role: e.target.value || null })}
                    placeholder={t('knowledge.profile.work.role')}
                    aria-label={t('knowledge.profile.work.role')}
                  />
                  <Input
                    value={row.domain ?? ''}
                    onChange={(e) => setWorkRow(index, { domain: e.target.value || null })}
                    placeholder={t('knowledge.profile.work.domain')}
                    aria-label={t('knowledge.profile.work.domain')}
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  value={row.durationMonths == null ? '' : String(row.durationMonths)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setWorkRow(index, {
                      durationMonths: e.target.value === '' || !Number.isFinite(n) ? null : n,
                    });
                  }}
                  label={t('knowledge.profile.work.durationMonths')}
                  wrapperClassName="w-40"
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<Plus />}
              className="self-start"
              onClick={addWorkRow}
            >
              {t('knowledge.profile.work.add')}
            </Button>
          </div>
        )}

        {update.isError && <ApiErrorNotice variant="inline" error={update.error} />}

        <div className="flex flex-wrap items-center justify-between gap-[var(--nx-space-element)] border-t border-nx-border-subtle pt-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              icon={<ArrowLeft />}
              onClick={() => setStep((s) => s - 1)}
            >
              {t('onboarding.professional.back')}
            </Button>
          ) : nextHref ? (
            <Link
              href={nextHref}
              className="text-nx-body-sm text-nx-text-muted hover:text-nx-text-primary"
            >
              {t('onboarding.professional.skip')}
            </Link>
          ) : (
            <span />
          )}

          {last ? (
            <Button
              type="button"
              icon={<Check />}
              loading={update.isPending}
              disabled={update.isPending}
              onClick={submit}
            >
              {t('onboarding.professional.finish')}
            </Button>
          ) : (
            <Button type="button" icon={<ArrowRight />} onClick={() => setStep((s) => s + 1)}>
              {t('onboarding.professional.next')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
