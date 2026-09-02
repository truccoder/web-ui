'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button, Input, ProgressBar, Select } from '@/shared/components';
import { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, useUploadMedia } from '@/features/media';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useSubmitVerification } from '../hooks/use-roadmap';
import type { RoadmapNode, VerificationTier } from '../types/roadmap';

/**
 * Claim one roadmap node, backed by a tier.
 *
 * THE SUCCESS MESSAGE REPORTS THE REAL OUTCOME NOW. `POST /skills/verify` returns the resulting
 * progress row (B21 closed), so the form can read `status` and say what actually happened rather
 * than "submitted": `SELF_VERIFIED` comes back `VERIFIED`, the two moderator tiers
 * `PENDING_APPROVAL`, and `AUTO_CERTIFIED` `VERIFIED` **or `REJECTED`** — the last one still a 200,
 * and finally visible instead of silent. The form does not auto-close on success for exactly this
 * reason: the outcome is the point, so the dialog stays until the user dismisses it.
 *
 * PROOF IMAGE, RESTORED. This form used to omit `SkillVerificationRequestDto.proofImageKey`
 * because nothing could fill it — `POST /v1/api/media` (B16) changed that. The picker uploads one
 * image to the media store and sends the returned URL as `proofImageKey`; the moderator queue
 * (`PendingVerificationDto`) surfaces that value as-is. It is independent of `proofUrl`, which
 * stays a link field — for `AUTO_CERTIFIED` the backend checks `proofUrl` against the user's
 * linked GitHub repo, so an image cannot stand in for it.
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
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMedia();

  // Deliberately does NOT call `onSubmitted` here — that closes the dialog, and the returned
  // `status` is what the user opened it to find out. The "Done" button below hands control back.
  const submit = useSubmitVerification({
    onSuccess: () => {
      setProofUrl('');
      setProofImageUrl(null);
    },
  });

  // Still images only, same restriction the cover picker uses — a screenshot of a certificate,
  // not an animation.
  const acceptedTypes = ACCEPTED_MEDIA_TYPES.filter((type) => type !== 'image/gif');

  const pickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!acceptedTypes.includes(file.type) || file.size > MAX_MEDIA_FILE_BYTES) {
      setImageError(t('roadmap.verify.proofImageInvalid'));
      return;
    }
    setImageError(null);
    upload.mutate([file], {
      onSuccess: (result) => {
        const url = result.urls[0];
        if (!url) {
          setImageError(t('roadmap.verify.proofImageInvalid'));
          return;
        }
        setProofImageUrl(url);
      },
      onError: () => setImageError(t('roadmap.verify.proofImageInvalid')),
    });
  };

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
        if (!canSubmit || submit.isPending || submit.isSuccess) return;
        submit.mutate({
          nodeId: node.id,
          tier,
          // Trimmed to undefined rather than sent as "": the backend treats blank as missing for
          // AUTO_CERTIFIED anyway, and storing an empty string as a proof is a lie in the row.
          proofUrl: proofUrl.trim() || undefined,
          proofImageKey: proofImageUrl ?? undefined,
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

      {/* Optional evidence a moderator will look at — a screenshot of a certificate, a dashboard,
          a commit. Not read by the AUTO_CERTIFIED check, which only trusts `proofUrl`. */}
      <div className="flex flex-col gap-2">
        <span className="text-nx-body-sm font-medium text-nx-text-primary">
          {t('roadmap.verify.proofImage')}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={pickImage}
          className="hidden"
        />
        {proofImageUrl ? (
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofImageUrl}
              alt=""
              className="size-20 rounded-nx-xs border border-nx-border-subtle object-cover"
            />
            <Button
              size="sm"
              variant="ghost"
              type="button"
              icon={<X />}
              onClick={() => setProofImageUrl(null)}
              aria-label={t('roadmap.verify.proofImageRemove')}
            />
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            type="button"
            icon={upload.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
          >
            {t('roadmap.verify.proofImageAdd')}
          </Button>
        )}
        {upload.isPending && (
          <ProgressBar value={upload.progress} label={t('roadmap.verify.proofImageAdd')} />
        )}
        <p className="text-nx-caption text-nx-text-muted">{t('roadmap.verify.proofImageHint')}</p>
        {imageError && <p className="text-nx-micro text-nx-status-danger-fg">{imageError}</p>}
      </div>

      {submit.isError && (
        <p role="status" className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(submit.error)}
        </p>
      )}

      {submit.isSuccess && submit.data && (
        <p
          role="status"
          className={cn(
            'text-nx-caption',
            submit.data.status === 'REJECTED'
              ? 'text-nx-status-danger-fg'
              : 'text-nx-text-secondary'
          )}
        >
          {t(`roadmap.verify.result.${RESULT_KEY[submit.data.status] ?? 'pending'}`)}
        </p>
      )}

      <div>
        {submit.isSuccess ? (
          <Button type="button" size="sm" onClick={() => onSubmitted?.()}>
            {t('roadmap.verify.done')}
          </Button>
        ) : (
          <Button type="submit" size="sm" loading={submit.isPending} disabled={!canSubmit}>
            {t('roadmap.verify.submit')}
          </Button>
        )}
      </div>
    </form>
  );
}

/** Result `status` → `roadmap.verify.result.*` leaf, spelled out for the same greppability. */
const RESULT_KEY: Record<string, string> = {
  VERIFIED: 'verified',
  PENDING_APPROVAL: 'pending',
  REJECTED: 'rejected',
};

/** Enum value → hint key leaf. Spelled out for the same greppability reason as `TIERS`. */
const TIER_HINT_KEY: Record<VerificationTier, string> = {
  SELF_VERIFIED: 'self',
  MOD_VERIFIED: 'mod',
  QUIZ_VERIFIED: 'quiz',
  AUTO_CERTIFIED: 'auto',
};
