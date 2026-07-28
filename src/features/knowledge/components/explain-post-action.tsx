'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/lib/i18n';
import { isProfileRequired, useExplainPost, useSaveExplanation } from '../hooks';
import { ExplanationCard } from './explanation-card';

/**
 * "Explain this post" — generate an explanation, then optionally keep it.
 *
 * EVERY PRESS SPENDS GEMINI QUOTA, and the whole design of this component follows from that:
 *
 *  - The button is disabled while a request is in flight, so a double-click cannot bill twice.
 *  - There is no automatic retry anywhere (`useExplainPost` sets `retry: 0`), and the error state
 *    offers a deliberate "try again" rather than retrying on the user's behalf.
 *  - Once a result exists the primary action becomes "save", not "regenerate" — regenerating is
 *    available but demoted, because the cheap thing to want is usually the answer already on screen.
 *
 * A 428 IS NOT A FAILURE TO RETRY. `explainPost` refuses to run without a professional profile
 * (that is what the prompt is built from) and answers `PRECONDITION_REQUIRED`. Retrying cannot fix
 * it; filling in the profile can, so that branch says so instead of showing an error and a retry
 * button. It costs nothing — the check precedes the model call.
 *
 * GENERATING DOES NOT SAVE. The backend persists nothing here, so an unsaved explanation is lost on
 * navigation. Saving is a second, explicit call — and saving the same post again creates a new
 * version rather than replacing the previous one.
 */
export interface ExplainPostActionProps {
  postId: number;
  /** Shown to the user as the thing being explained, and sent back on save. */
  postContent: string;
}

export function ExplainPostAction({ postId, postContent }: ExplainPostActionProps) {
  const t = useT();
  const explain = useExplainPost();
  const save = useSaveExplanation();
  const explanation = explain.data;

  const run = () => explain.mutate({ postId });

  if (explain.isPending) {
    return (
      <div className="space-y-2">
        <p className="text-nx-caption text-nx-text-muted">{t('knowledge.explain.working')}</p>
        <Skeleton lines={4} />
      </div>
    );
  }

  if (explain.isError) {
    return isProfileRequired(explain.error) ? (
      <p className="text-nx-caption text-nx-text-secondary">
        {t('knowledge.explain.profileRequired')}
      </p>
    ) : (
      <div className="space-y-2">
        <p className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(explain.error, t('knowledge.explain.error'))}
        </p>
        {/* Deliberate, user-initiated. An automatic retry here would bill a second generation for
            a request that may already have succeeded on the server. */}
        <Button size="sm" variant="secondary" onClick={run}>
          {t('knowledge.explain.retry')}
        </Button>
      </div>
    );
  }

  if (!explanation) {
    return (
      <Button
        size="sm"
        variant="secondary"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        onClick={run}
      >
        {t('knowledge.explain.action')}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <ExplanationCard
        explanation={explanation}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={run} disabled={save.isPending}>
              {t('knowledge.explain.regenerate')}
            </Button>
            <Button
              size="sm"
              loading={save.isPending}
              disabled={save.isPending || save.isSuccess}
              onClick={() =>
                save.mutate({
                  postId,
                  originalContent: explanation.originalContent ?? postContent,
                  explanationContent: explanation.explanationContent ?? '',
                  concepts: explanation.concepts ?? undefined,
                  prerequisites: explanation.prerequisites ?? undefined,
                  complexityScore: explanation.complexityScore ?? undefined,
                })
              }
            >
              {save.isSuccess ? t('knowledge.explain.saved') : t('knowledge.explain.save')}
            </Button>
          </>
        }
      />

      {/* Said plainly because the loss is silent otherwise: the save DTO has no field for
          `externalLinks` and the entity has no column, so the links on screen do not survive.
          Only shown when there is actually something to lose. */}
      {(explanation.externalLinks?.length ?? 0) > 0 && !save.isSuccess && (
        <p className="text-nx-caption text-nx-text-muted">{t('knowledge.explain.linksNotSaved')}</p>
      )}

      {save.isError && (
        <p className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(save.error, t('knowledge.explain.saveError'))}
        </p>
      )}
    </div>
  );
}
