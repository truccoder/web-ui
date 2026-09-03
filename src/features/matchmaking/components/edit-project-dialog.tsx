'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button, Dialog, Input, ProgressBar, Textarea } from '@/shared/components';
import { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, useUploadMedia } from '@/features/media';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import type { Project } from '../types/matchmaking';
import { useUpdateProject } from '../hooks/use-matchmaking';

const COMPANY_TEXT_MAX = 4000;

/**
 * Edit a project's title, description, company copy, banner and tags — `PUT /v1/api/projects/{id}`.
 *
 * ROLES ARE NOT HERE. The backend has a separate per-position surface (add / edit / close /
 * delete), and `UpdateProjectRequestDTO` deliberately carries no `positions` — so this dialog
 * mirrors the top half of `CreateProjectDialog` and nothing else. Kept on plain `useState` for the
 * same reason that dialog is: it is the shape the feature already uses, and matching it keeps the
 * two forms readable side by side.
 *
 * `companyOverview` / `companyCulture` (BE `V105`) edit here too — the backend rebuilds every
 * role's JD PDF when the project changes, so a fix to the company blurb reaches all of them.
 *
 * A `COMPLETED` PROJECT IS FROZEN — the backend answers 409 — so the surrounding controls hide the
 * edit button in that state; if one slips through, the mutation error is shown in the dialog.
 */
export interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
}

export function EditProjectDialog({ project, open, onClose }: EditProjectDialogProps) {
  const t = useT();
  const [title, setTitle] = useState(project.title ?? '');
  const [description, setDescription] = useState(project.description ?? '');
  const [companyOverview, setCompanyOverview] = useState(project.companyOverview ?? '');
  const [companyCulture, setCompanyCulture] = useState(project.companyCulture ?? '');
  const [tags, setTags] = useState((project.tags ?? []).join(', '));
  const [bannerUrl, setBannerUrl] = useState<string | null>(project.bannerUrl ?? null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const update = useUpdateProject();
  const bannerUpload = useUploadMedia();
  const bannerTypes = ACCEPTED_MEDIA_TYPES.filter((type) => type !== 'image/gif');

  // Re-seed on each opening, so a cancelled edit does not linger into the next one and an external
  // change to the project shows through. The "adjust state while rendering on a prop change"
  // pattern React documents for exactly this — no effect, no cascading render.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setTitle(project.title ?? '');
    setDescription(project.description ?? '');
    setCompanyOverview(project.companyOverview ?? '');
    setCompanyCulture(project.companyCulture ?? '');
    setTags((project.tags ?? []).join(', '));
    setBannerUrl(project.bannerUrl ?? null);
    setBannerError(null);
    update.reset();
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

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

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    companyOverview.length <= COMPANY_TEXT_MAX &&
    companyCulture.length <= COMPANY_TEXT_MAX &&
    !update.isPending &&
    !bannerUpload.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={560}
      maxHeight="80vh"
      title={t('projects.manage.editTitle')}
      description={t('projects.manage.editDesc')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('projects.cancel')}
          </Button>
          <Button
            loading={update.isPending}
            disabled={!canSubmit}
            onClick={() => {
              if (project.id == null) return;
              update.mutate(
                {
                  projectId: project.id,
                  payload: {
                    title: title.trim(),
                    description: description.trim(),
                    companyOverview: companyOverview.trim() || undefined,
                    companyCulture: companyCulture.trim() || undefined,
                    bannerUrl: bannerUrl ?? undefined,
                    tags: tags
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  },
                },
                { onSuccess: () => onClose() }
              );
            }}
          >
            {t('projects.manage.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label={t('projects.create.projectTitle')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('projects.create.projectTitlePlaceholder')}
        />

        <Textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('projects.create.descriptionPlaceholder')}
          aria-label={t('projects.create.description')}
        />

        <Input
          label={t('projects.create.tags')}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder={t('projects.create.tagsPlaceholder')}
        />

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

        {update.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(update.error, t('projects.manage.editError'))}
          </p>
        )}
      </div>
    </Dialog>
  );
}
