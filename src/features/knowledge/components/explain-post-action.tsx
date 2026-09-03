'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button, Skeleton, Switch, Textarea } from '@/shared/components';
import { getErrorMessage, getErrorStatus } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import {
  isProfileRequired,
  useExplainPost,
  usePersonalAccessTokens,
  useSaveExplanation,
} from '../hooks';
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
  // REGENERATING ASKS WHAT WAS WRONG FIRST. The button used to fire a bare `run()`, which spends
  // Gemini quota to ask the identical question and get back a near-identical answer — the reader
  // presses it precisely because the last answer missed, and had no way to say how.
  // `feedbackNote` has been on `ExplainRequestDto` from the start with nothing sending it.
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');

  /**
   * WHETHER THE MODEL MAY LOOK AT THE READER'S VAULT, FOR THIS ONE POST.
   *
   * The decision is not new — `loadVaultContext` has always taken it, using "does this user hold
   * a BIDIRECTIONAL token?" as the answer. That is the wrong grain and the wrong place: a
   * permission picked once in a token dialog, possibly months ago, silently deciding every
   * explanation afterwards. Reading up on something you have notes about and reading outside your
   * field want opposite answers.
   *
   * Defaults ON so the switch changes nothing until somebody touches it, and only an explicit
   * OFF is sent — the backend reads an absent field as "no preference", which it must keep
   * meaning for every other client.
   */
  const [useVault, setUseVault] = React.useState(true);

  /*
   * The switch is only shown to readers it can do something for. Vault context requires a
   * BIDIRECTIONAL token to exist at all, so for everyone else this control would sit there
   * offering to turn off something that was never on — which reads as a broken feature rather than
   * an inapplicable one.
   *
   * The cost is one `/tokens` request per session, not per post: every rendered card shares the
   * query key, and the component is already hidden from guests by `feed-post`.
   */
  const { data: tokens } = usePersonalAccessTokens();
  const vaultAvailable = (tokens ?? []).some((t) => t.vaultPermission === 'BIDIRECTIONAL');

  const run = (feedbackNote?: string) => {
    setFeedbackOpen(false);
    setFeedback('');
    explain.mutate({
      postId,
      feedbackNote: feedbackNote?.trim() || undefined,
      useVaultContext: vaultAvailable && !useVault ? false : undefined,
    });
  };

  if (explain.isPending) {
    return (
      <div className="space-y-2">
        <p className="text-nx-caption text-nx-text-muted">{t('knowledge.explain.working')}</p>
        <Skeleton lines={4} />
      </div>
    );
  }

  if (explain.isError) {
    if (isProfileRequired(explain.error)) {
      // A 428 cannot be retried — the explainer is built from the professional profile, so the fix
      // is to fill one in. Straight to the onboarding wizard, carrying a `?next=` back to this post
      // so finishing returns the reader to the explanation they were after.
      return (
        <p className="text-nx-caption text-nx-text-secondary">
          {t('knowledge.explain.profileRequired')}{' '}
          <Link
            href={`/onboarding/professional?next=/posts/${postId}`}
            className="font-medium text-nx-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            {t('knowledge.explain.profileRequiredCta')}
          </Link>
        </p>
      );
    }

    /**
     * THE MODEL CALL FAILED UPSTREAM, and the two ways it does are worth telling apart — matched
     * on STATUS, never on message text (`getErrorStatus`, and the note it carries in `api-error`).
     *
     * B32 (BE, 30/08): the endpoint used to answer a flat 500 "Failed to generate content from
     * Gemini" for every Gemini failure, so a Vietnamese reader got an English sentence that named
     * the vendor and nothing actionable. It now separates the quota wall from a one-off blip:
     *
     *  - 429 — quota or rate limit. Retrying spends whatever allowance is left to fail the same
     *    way, so this branch has NO retry button: waiting is the only fix, and the copy says so.
     *  - 503 — Gemini timed out or refused this one completion. Transient, so the manual retry
     *    stays.
     *
     * Anything else keeps the backend's own words + retry: inventing copy for failures we have not
     * seen would be guessing, the same rule `BookLibrary` follows for its 503.
     */
    const status = getErrorStatus(explain.error);
    const rateLimited = status === 429;
    const message = rateLimited
      ? t('knowledge.explain.rateLimited')
      : status === 503
        ? t('knowledge.explain.unavailable')
        : getErrorMessage(explain.error, t('knowledge.explain.error'));

    return (
      <div className="space-y-2">
        <p className="text-nx-caption text-nx-status-danger-fg">{message}</p>
        {/* Deliberate, user-initiated. An automatic retry here would bill a second generation for
            a request that may already have succeeded on the server — and against a 429 it cannot
            help at all, so it is withheld on that branch. */}
        {!rateLimited && (
          <Button size="sm" variant="secondary" onClick={() => run()}>
            {t('knowledge.explain.retry')}
          </Button>
        )}
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="space-y-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => run()}
        >
          {t('knowledge.explain.action')}
        </Button>

        {vaultAvailable && (
          <Switch
            checked={useVault}
            onChange={setUseVault}
            label={t('knowledge.explain.useVault')}
            // The description tracks the switch, so what the choice costs is on screen at the
            // moment it is made. It also states the limit plainly: filenames, tags and links go
            // to the model, note bodies never do.
            description={
              useVault ? t('knowledge.explain.useVaultOn') : t('knowledge.explain.useVaultOff')
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ExplanationCard
        explanation={explanation}
        /**
         * IT STAYS ON SCREEN ONCE GENERATED — the owner's call, and it is what the component
         * already did; what was missing was a way to get it out of the way without losing it.
         * The chevron folds it, the `X` throws it away.
         *
         * `explain.reset()` IS THE HONEST DISMISS. The backend persisted nothing (see the header
         * note), so there is no server state to undo: clearing the mutation puts the screen back
         * exactly where it was before the button was pressed, generate button and all. Hiding the
         * card while keeping the result would leave quota already spent and no way to see what it
         * bought.
         */
        collapsible
        onDismiss={() => explain.reset()}
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFeedbackOpen((open) => !open)}
              disabled={save.isPending}
              aria-expanded={feedbackOpen}
            >
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
                  // Nulls are stripped rather than passed through: the feature type widens
                  // every `ExternalLink` field to `| null` (Jackson sends the key regardless),
                  // but the request DTO wants the field absent when there is no value.
                  externalLinks: explanation.externalLinks?.map((link) => ({
                    title: link.title ?? undefined,
                    url: link.url ?? undefined,
                  })),
                  // THE TOPIC THE MODEL PICKED, HANDED STRAIGHT BACK. `saveExplanation` reads
                  // `category` off the request and the column defaults to `OTHER`, so dropping it
                  // here would file every explanation in the Archive's catch-all tab while the
                  // generated card on screen showed the real topic — a mismatch nobody would think
                  // to look for.
                  category: explanation.category ?? undefined,
                })
              }
            >
              {save.isSuccess ? t('knowledge.explain.saved') : t('knowledge.explain.save')}
            </Button>
          </>
        }
      />

      {/**
       * THE NOTE IS OPTIONAL BUT THE PROMPT FOR IT IS NOT SKIPPABLE-BY-ACCIDENT.
       *
       * Opening a small form rather than firing straight away is the only friction on a control
       * that spends money, and it is friction that buys something: the second generation gets to
       * be a different question. "Regenerate" with an empty box is still one click away for
       * someone who really does just want another roll of the dice.
       */}
      {feedbackOpen && (
        <div className="space-y-2 rounded-nx-md border border-nx-border-subtle py-[var(--nx-space-pad-y)] px-[var(--nx-space-pad)]">
          <Textarea
            label={t('knowledge.explain.feedbackLabel')}
            hint={t('knowledge.explain.feedbackHint')}
            placeholder={t('knowledge.explain.feedbackPlaceholder')}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            autoResize
          />
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setFeedbackOpen(false)}>
              {t('knowledge.explain.feedbackCancel')}
            </Button>
            <Button size="sm" onClick={() => run(feedback)}>
              {t('knowledge.explain.feedbackSubmit')}
            </Button>
          </div>
        </div>
      )}

      {/* A warning used to sit here saying the further-reading links would be dropped on save,
          because `SaveExplanationRequestDto` had no field for them. It has one now (verified in
          the spec at F-B), so the warning would be a lie about a limit that no longer exists —
          and a stale warning is worse than none: it teaches the reader to distrust a save that
          actually works. */}
      {save.isError && (
        <p className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(save.error, t('knowledge.explain.saveError'))}
        </p>
      )}
    </div>
  );
}
