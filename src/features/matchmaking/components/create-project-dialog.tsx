'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { Button, Dialog, Input, ProgressBar, Textarea } from '@/shared/components';
import { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, useUploadMedia } from '@/features/media';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import {
  emptyPositionDraft,
  isPositionDraftEmpty,
  isPositionDraftValid,
  toPositionRequest,
  type PositionDraft,
} from '../lib/position-form';
import { useCreateProject } from '../hooks/use-matchmaking';
import { PositionFormFields } from './position-form-fields';

/**
 * Create a project and its roles, in one shot.
 *
 * EACH ROLE IS NOW A FULL JOB DESCRIPTION (BE `V105`). `roleSummary`, two multi-line lists and at
 * least one skill are required server-side — a role with no skills is a 422, not a silently empty
 * shortlist — so the per-role block is `PositionFormFields` (shared with the edit surfaces) and the
 * form validates against the same rules before it will submit.
 *
 * COMPANY-LEVEL COPY IS WRITTEN ONCE. `companyOverview` / `companyCulture` sit at the project level
 * and every role's generated JD reuses them, which is why they are their own section here with that
 * said in as many words.
 *
 * SKILLS DRIVE THE MATCH. `requiredSkills` is what `suggestCandidates` runs against; there is no
 * skill catalogue on the backend, so the chip field invents nothing — it just captures strings.
 */
export interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectId: number) => void;
}

const COMPANY_TEXT_MAX = 4000;

export function CreateProjectDialog({ open, onClose, onCreated }: CreateProjectDialogProps) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [companyOverview, setCompanyOverview] = useState('');
  const [companyCulture, setCompanyCulture] = useState('');
  const [tags, setTags] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionDraft[]>([emptyPositionDraft()]);
  const [showErrors, setShowErrors] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const create = useCreateProject();
  const bannerUpload = useUploadMedia();
  const bannerTypes = ACCEPTED_MEDIA_TYPES.filter((type) => type !== 'image/gif');

  const pickBanner = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (bannerInputRef.current) bannerInputRef.current.value = '';
    if (!file) return;
    if (!bannerTypes.includes(file.type) || file.size > MAX_MEDIA_FILE_BYTES) {
      setBannerError(t('projects.create.bannerInvalid'));
      return;
    }
    setBannerError(null);
    bannerUpload.mutate([file], {
      onSuccess: (result) => {
        const url = result.urls[0];
        if (!url) {
          setBannerError(t('projects.create.bannerInvalid'));
          return;
        }
        setBannerUrl(url);
      },
      onError: () => setBannerError(t('projects.create.bannerInvalid')),
    });
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setCompanyOverview('');
    setCompanyCulture('');
    setTags('');
    setBannerUrl(null);
    setBannerError(null);
    setPositions([emptyPositionDraft()]);
    setShowErrors(false);
    create.reset();
  };

  const close = () => {
    onClose();
    reset();
  };

  const updatePosition = (index: number, next: PositionDraft) =>
    setPositions((prev) => prev.map((row, i) => (i === index ? next : row)));

  // An untouched row is dropped rather than validated; every row someone actually started must be
  // complete before the form will send.
  const startedPositions = positions.filter((position) => !isPositionDraftEmpty(position));
  const positionsOk = startedPositions.every(isPositionDraftValid);
  const companyOk =
    companyOverview.length <= COMPANY_TEXT_MAX && companyCulture.length <= COMPANY_TEXT_MAX;

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    companyOk &&
    positionsOk &&
    !create.isPending &&
    !bannerUpload.isPending;

  const submit = () => {
    setShowErrors(true);
    if (!canSubmit) return;
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        companyOverview: companyOverview.trim() || undefined,
        companyCulture: companyCulture.trim() || undefined,
        bannerUrl: bannerUrl ?? undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        positions: startedPositions.map(toPositionRequest),
      },
      {
        onSuccess: (project) => {
          close();
          if (project.id != null) onCreated?.(project.id);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      width={640}
      maxHeight="85vh"
      title={t('projects.create.title')}
      description={t('projects.create.desc')}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t('projects.cancel')}
          </Button>
          <Button
            loading={create.isPending}
            disabled={(showErrors && !canSubmit) || create.isPending || bannerUpload.isPending}
            onClick={submit}
          >
            {t('projects.create.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Input
          label={t('projects.create.projectTitle')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('projects.create.projectTitlePlaceholder')}
          error={
            showErrors && title.trim().length === 0 ? t('projects.create.titleRequired') : undefined
          }
        />

        <Textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('projects.create.descriptionPlaceholder')}
          aria-label={t('projects.create.description')}
          error={
            showErrors && description.trim().length === 0
              ? t('projects.create.descriptionRequired')
              : undefined
          }
        />

        <Input
          label={t('projects.create.tags')}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder={t('projects.create.tagsPlaceholder')}
        />

        <div className="flex flex-col gap-2">
          <span className="text-nx-body-sm font-medium text-nx-text-primary">
            {t('projects.create.banner')}
          </span>
          <input
            ref={bannerInputRef}
            type="file"
            accept={bannerTypes.join(',')}
            onChange={pickBanner}
            className="hidden"
          />
          {bannerUrl ? (
            <div className="flex items-start gap-2">
              {/* Arbitrary MinIO host — `next/image` would need it declared. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt=""
                className="h-20 w-36 rounded-nx-xs border border-nx-border-subtle object-cover"
              />
              <Button
                size="sm"
                variant="ghost"
                type="button"
                icon={<X />}
                aria-label={t('projects.create.bannerRemove')}
                onClick={() => setBannerUrl(null)}
              />
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              type="button"
              icon={bannerUpload.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUpload.isPending}
            >
              {t('projects.create.bannerAdd')}
            </Button>
          )}
          {bannerUpload.isPending && (
            <ProgressBar value={bannerUpload.progress} label={t('projects.create.bannerAdd')} />
          )}
          {bannerError && <p className="text-nx-micro text-nx-status-danger-fg">{bannerError}</p>}
        </div>

        {/* ── Company-level copy, reused by every role's JD. ──────────────────────────────── */}
        <section className="flex flex-col gap-[var(--nx-space-element)] rounded-nx-sm border border-nx-border-subtle bg-nx-surface-sunken p-4">
          <div className="flex flex-col gap-[var(--nx-space-pair)]">
            <h3 className="text-nx-ui font-semibold text-nx-text-primary">
              {t('projects.create.team.heading')}
            </h3>
            <p className="text-nx-caption text-nx-text-muted">{t('projects.create.team.note')}</p>
          </div>
          <Textarea
            rows={3}
            label={t('projects.create.team.overviewLabel')}
            value={companyOverview}
            onChange={(event) => setCompanyOverview(event.target.value)}
            placeholder={t('projects.create.team.overviewPlaceholder')}
            maxLength={COMPANY_TEXT_MAX}
            error={
              companyOverview.length > COMPANY_TEXT_MAX
                ? t('projects.create.team.tooLong')
                : undefined
            }
          />
          <Textarea
            rows={3}
            label={t('projects.create.team.cultureLabel')}
            value={companyCulture}
            onChange={(event) => setCompanyCulture(event.target.value)}
            placeholder={t('projects.create.team.culturePlaceholder')}
            maxLength={COMPANY_TEXT_MAX}
            error={
              companyCulture.length > COMPANY_TEXT_MAX
                ? t('projects.create.team.tooLong')
                : undefined
            }
          />
        </section>

        <div className="flex flex-col gap-3">
          <p className="text-nx-body-sm font-medium text-nx-text-primary">
            {t('projects.create.positions')}
          </p>
          <p className="text-nx-caption text-nx-text-muted">{t('projects.create.positionsNote')}</p>

          {positions.map((position, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-nx-caption font-medium text-nx-text-muted">
                  {t('projects.create.roleN', { n: index + 1 })}
                </span>
                {positions.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<X />}
                    aria-label={t('projects.create.removePosition')}
                    onClick={() => setPositions((prev) => prev.filter((_, i) => i !== index))}
                  />
                )}
              </div>

              <PositionFormFields
                value={position}
                onChange={(next) => updatePosition(index, next)}
                showErrors={showErrors && !isPositionDraftEmpty(position)}
              />
            </div>
          ))}

          <Button
            size="sm"
            variant="secondary"
            icon={<Plus />}
            className="self-start"
            onClick={() => setPositions((prev) => [...prev, emptyPositionDraft()])}
          >
            {t('projects.create.addPosition')}
          </Button>
        </div>

        {create.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(create.error, t('projects.create.error'))}
          </p>
        )}
      </div>
    </Dialog>
  );
}
