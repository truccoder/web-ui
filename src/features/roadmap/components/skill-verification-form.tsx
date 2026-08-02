'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useSubmitVerification } from '../hooks/use-roadmap';
import type { RoadmapNode, VerificationTier } from '../types/roadmap';

/**
 * Claim one roadmap node, backed by a tier.
 *
 * THE SUCCESS MESSAGE SAYS "SUBMITTED", NEVER "VERIFIED", and that is a correctness requirement
 * rather than a wording preference. `POST /skills/verify` returns `void` and the four tiers do
 * four different things behind it: `SELF_VERIFIED` verifies on the spot, the two moderator tiers
 * queue for review, and `AUTO_CERTIFIED` is checked immediately and **may be rejected** — still
 * answering 200. A 200 therefore means "the backend accepted the request", which is the most this
 * form can truthfully report. Compounding it, nothing reads progress back (B21), so the form
 * cannot follow up with the real outcome either.
 *
 * NO PROOF-IMAGE FIELD. `SkillVerificationRequestDto.proofImageKey` exists and there is no way to
 * fill it: the whole API has exactly three multipart endpoints (register, book posts, profile
 * picture) and none of them uploads a skill proof, so a key could only be typed from memory. An
 * input for a value the user cannot obtain is the same defect as the `bountyPoints` box
 * (ds-deviation #12). Cut, recorded as ds-deviation #25, restore when an upload endpoint exists.
 */
export interface SkillVerificationFormProps {
  node: RoadmapNode;
  /** Fired after a successful submission, e.g. to close the surface holding this form. */
  onSubmitted?: () => void;
  className?: string;
}

/**
 * Order is the Java enum's (`VerificationTier`), so the list never silently reshuffles, and the
 * keys are spelled out rather than interpolated so they stay greppable — the same two rules
 * `EventRsvpBar` and `TrendingFilters` follow.
 */
const TIERS = [
  { value: 'SELF_VERIFIED', labelKey: 'roadmap.verify.tier.self' },
  { value: 'MOD_VERIFIED', labelKey: 'roadmap.verify.tier.mod' },
  { value: 'QUIZ_VERIFIED', labelKey: 'roadmap.verify.tier.quiz' },
  { value: 'AUTO_CERTIFIED', labelKey: 'roadmap.verify.tier.auto' },
] as const satisfies ReadonlyArray<{ value: VerificationTier; labelKey: string }>;

export function SkillVerificationForm({
  node,
  onSubmitted,
  className,
}: SkillVerificationFormProps) {
  const t = useT();

  const [tier, setTier] = useState<VerificationTier>('SELF_VERIFIED');
  const [proofUrl, setProofUrl] = useState('');

  const submit = useSubmitVerification({
    onSuccess: () => {
      setProofUrl('');
      onSubmitted?.();
    },
  });

  // `AUTO_CERTIFIED` is the one tier whose proof is load-bearing: `verifyViaExternalApi` returns
  // false outright when `proofUrl` is blank, which would be a silent rejection the user never
  // sees. Required here so the failure is a form message instead. The other three ignore it.
  const isAuto = tier === 'AUTO_CERTIFIED';
  const canSubmit = !isAuto || proofUrl.trim().length > 0;

  return (
    <form
      className={cn('flex flex-col gap-3', className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit || submit.isPending) return;
        submit.mutate({
          nodeId: node.id,
          tier,
          // Trimmed to undefined rather than sent as "": the backend treats blank as missing for
          // AUTO_CERTIFIED anyway, and storing an empty string as a proof is a lie in the row.
          proofUrl: proofUrl.trim() || undefined,
        });
      }}
    >
      <p className="text-nx-body-sm text-nx-text-secondary">
        {t('roadmap.verify.claiming', { node: node.name })}
      </p>

      <Select
        label={t('roadmap.verify.tierLabel')}
        value={tier}
        onChange={(event) => setTier(event.target.value as VerificationTier)}
        options={TIERS.map((item) => ({ value: item.value, label: t(item.labelKey) }))}
        hint={t(`roadmap.verify.tierHint.${TIER_HINT_KEY[tier]}`)}
      />

      <Input
        mono
        label={t('roadmap.verify.proofUrl')}
        placeholder="https://github.com/…"
        value={proofUrl}
        onChange={(event) => setProofUrl(event.target.value)}
        // The hint changes with the tier because the field's meaning does: for AUTO_CERTIFIED it
        // is checked against the user's linked GitHub account, for the others it is only evidence
        // a human will read.
        hint={isAuto ? t('roadmap.verify.proofUrlAutoHint') : t('roadmap.verify.proofUrlHint')}
      />

      {submit.isError && (
        <p role="status" className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(submit.error)}
        </p>
      )}

      {submit.isSuccess && (
        <p role="status" className="text-nx-caption text-nx-text-secondary">
          {t('roadmap.verify.submitted')}
        </p>
      )}

      <div>
        <Button type="submit" size="sm" loading={submit.isPending} disabled={!canSubmit}>
          {t('roadmap.verify.submit')}
        </Button>
      </div>
    </form>
  );
}

/** Enum value → hint key leaf. Spelled out for the same greppability reason as `TIERS`. */
const TIER_HINT_KEY: Record<VerificationTier, string> = {
  SELF_VERIFIED: 'self',
  MOD_VERIFIED: 'mod',
  QUIZ_VERIFIED: 'quiz',
  AUTO_CERTIFIED: 'auto',
};
