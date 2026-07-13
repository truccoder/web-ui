'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { useProfessionalProfile, useUpdateProfessionalProfile } from '@/lib/hooks/use-knowledge';
import type {
  SeniorityLevel,
  PrimaryRole,
  ExplanationStyle,
  ProfessionalProfile,
} from '@/lib/types';

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

const selectClass =
  'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring';

function parseCsv(value: string): string[] | undefined {
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export function ProfessionalProfileTab() {
  const t = useT();
  const { data: profile, isLoading, isError } = useProfessionalProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t('knowledge.profile.error')}
      </p>
    );
  }

  // Keyed by updatedAt so a successful save remounts the form seeded with the fresh
  // server state — avoids syncing props into state via an effect.
  return <ProfileForm key={profile?.updatedAt ?? 'new'} profile={profile ?? null} />;
}

function ProfileForm({ profile }: { profile: ProfessionalProfile | null }) {
  const t = useT();
  const { mutate: updateProfile, isPending } = useUpdateProfessionalProfile();

  const [jobTitle, setJobTitle] = useState(profile?.jobTitle ?? '');
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel>(
    profile?.seniorityLevel ?? 'JUNIOR'
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    profile?.yearsOfExperience != null ? String(profile.yearsOfExperience) : ''
  );
  const [primaryRole, setPrimaryRole] = useState<PrimaryRole | ''>(profile?.primaryRole ?? '');
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle | ''>(
    profile?.explanationStyle ?? ''
  );
  const [techStack, setTechStack] = useState((profile?.knownTechStack ?? []).join(', '));
  const [interestedDomains, setInterestedDomains] = useState(
    (profile?.interestedDomains ?? []).join(', ')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      jobTitle: jobTitle.trim() || undefined,
      seniorityLevel,
      yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
      primaryRole: primaryRole || undefined,
      explanationStyle: explanationStyle || undefined,
      knownTechStack: parseCsv(techStack),
      interestedDomains: parseCsv(interestedDomains),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('knowledge.tabs.profile')}</CardTitle>
        <CardDescription>{t('knowledge.profile.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kp-job-title">{t('knowledge.profile.jobTitle')}</Label>
              <Input
                id="kp-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t('knowledge.profile.jobTitlePlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kp-seniority">{t('knowledge.profile.seniority')}</Label>
              <select
                id="kp-seniority"
                className={selectClass}
                value={seniorityLevel}
                onChange={(e) => setSeniorityLevel(e.target.value as SeniorityLevel)}
              >
                {SENIORITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kp-years">{t('knowledge.profile.yearsOfExperience')}</Label>
              <Input
                id="kp-years"
                type="number"
                min={0}
                max={60}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kp-role">{t('knowledge.profile.primaryRole')}</Label>
              <select
                id="kp-role"
                className={selectClass}
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value as PrimaryRole | '')}
              >
                <option value="">—</option>
                {PRIMARY_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="kp-style">{t('knowledge.profile.explanationStyle')}</Label>
              <select
                id="kp-style"
                className={selectClass}
                value={explanationStyle}
                onChange={(e) => setExplanationStyle(e.target.value as ExplanationStyle | '')}
              >
                <option value="">—</option>
                {EXPLANATION_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kp-stack">{t('knowledge.profile.techStack')}</Label>
            <Input
              id="kp-stack"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder={t('knowledge.profile.techStackPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kp-domains">{t('knowledge.profile.interestedDomains')}</Label>
            <Input
              id="kp-domains"
              value={interestedDomains}
              onChange={(e) => setInterestedDomains(e.target.value)}
              placeholder={t('knowledge.profile.interestedDomainsPlaceholder')}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? t('knowledge.profile.saving') : t('knowledge.profile.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
