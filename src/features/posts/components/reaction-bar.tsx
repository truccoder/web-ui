'use client';

import { useState } from 'react';
import { Angry, Frown, HandHeart, Heart, Laugh, Lightbulb, ThumbsUp } from 'lucide-react';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useMyReaction, useRemoveReaction, useUpsertReaction } from '../hooks/use-reaction';
import type { ReactionType } from '../types/reaction';
import { ReactionTray } from './reaction-tray';
import { ReactorDialog } from './reactor-dialog';

/**
 * The reaction row for a post — fills `PostCard`'s `actions` slot.
 *
 * ONE BUTTON PLUS A HOVER TRAY, AND THIS FILE ARGUED THE OTHER WAY UNTIL THE OWNER CALLED IT.
 * The note that stood here said seven inline toggles were right because the design system has no
 * popover spec (only Dialog, Menu, Tooltip, Toast) and inventing one would be a primitive built
 * from a guess. The objection was real and is answered rather than dropped: the primitive is
 * `ReactionTray`, it lives in this feature rather than in `shared/`, and its own header says why
 * it is not a sanctioned DS component.
 *
 * WHAT THE INLINE ROW ACTUALLY COST, measured on a 672 card: seven labelled toggles wrapped onto
 * two lines and took 64px of every post — more vertical space than the post's own byline — to
 * offer six things almost nobody picks. The row also put `Không đồng tình` at the same weight as
 * `Hữu ích`, which reads as an invitation to use it.
 *
 * WHAT IS NOT LOST. All seven types are still reachable, from three inputs (hover, keyboard,
 * long-press) rather than one, and the current pick is still on screen without hovering — it is
 * what the single button shows. `aria-pressed` still carries the state.
 *
 * MONOCHROME ICONS, NOT EMOJI. Reaction sets are usually colour emoji; nothing else in this
 * product renders one, and the palette is deliberately ink + one blue + amber-for-reputation
 * (constitution §1). Lucide glyphs at currentColor keep the row on-palette, and the active
 * state is carried by a border plus `aria-pressed` rather than colour alone (§12).
 *
 * THE COUNT DOES NOT MOVE WHEN YOU CLICK, and that is a backend fact, not a bug to fix here:
 * `PostReactionController` has no endpoint for a post's totals — it only answers "what did I
 * pick". `count` comes from the feed/search payload the caller already holds, so it only
 * changes when that payload is refetched. `onChanged` exists for exactly that: the composing
 * screen decides whether a reaction is worth re-fetching the feed for. Do not fake the
 * increment locally — the highlight is honest, an invented total is not.
 */
export interface ReactionBarProps {
  postId: number;
  /**
   * Total reactions from the feed/search payload (`likeCount`). Undefined hides the number
   * rather than showing 0 for "not supplied".
   */
  count?: number;
  /**
   * Comment total from the same payload, printed beside the reaction total.
   *
   * IT IS HERE RATHER THAN ON ITS OWN LINE because the two numbers answer the same question —
   * how much has happened to this post — and stacking them put one at the card's left edge and
   * the other at its right, two rows apart. Undefined or zero prints nothing, so a post with no
   * discussion does not carry a "0 bình luận".
   */
  commentCount?: number;
  /**
   * Controls that belong beside the reaction trigger — the comment button, today.
   *
   * A SLOT RATHER THAN A SIBLING, AND THE REASON IS THE COUNTS. They are pinned right with
   * `ml-auto`, and `ml-auto` reaches the right edge of whatever box it is inside. While the
   * comment button sat next to this component in the CALLER's row, this component was only as
   * wide as its own content, so "1 bình luận · 0 cảm xúc" stopped in the middle of the card with
   * the button after it. Taking the full row and accepting the neighbour here is what lets the
   * numbers reach the card's edge.
   */
  actions?: React.ReactNode;
  /** Fired after a successful add/change/remove, so the caller can refresh its own payload. */
  onChanged?: () => void;
  className?: string;
}

/**
 * Order is the Java enum's order (`ReactionType`), so the row never silently reshuffles.
 *
 * Keys are written out rather than built as `post.reaction.${type}` so they stay greppable
 * in the translation files — an interpolated key looks unused to the next person tidying up.
 */
/**
 * THE THREE KNOWLEDGE REACTIONS THE DESIGN SYSTEM ASKED FOR, PLUS THE FOUR THAT PREDATE THEM.
 *
 * The kit's row is `Hữu ích · Sáng tỏ · Ghi nhận` — reactions that judge a technical contribution
 * rather than perform a mood, and one of the reasons the product does not read as a generic
 * social network. They could not be sent: `ReactionType` was the Facebook set. The backend added
 * `INSIGHT` and `CLAP` (B5) as ADDITIONS, so every reaction already stored is still valid.
 *
 * ORDER PUTS THE KIT'S THREE FIRST, and that is the whole point of the change. `LIKE` carries the
 * kit's `Hữu ích`; `INSIGHT` and `CLAP` are the two that were missing. The Facebook four follow,
 * because deleting them would orphan rows that exist in the database today.
 *
 * The Vietnamese labels also revert here: they were retuned to a technical register as a stopgap
 * while only five slots existed, and that workaround is over — `HAHA` can go back to meaning
 * `Haha` now that `Sáng tỏ` has a slot of its own.
 */
const REACTIONS = [
  { type: 'LIKE', Icon: ThumbsUp, labelKey: 'post.reaction.LIKE' },
  { type: 'INSIGHT', Icon: Lightbulb, labelKey: 'post.reaction.INSIGHT' },
  { type: 'CLAP', Icon: HandHeart, labelKey: 'post.reaction.CLAP' },
  { type: 'LOVE', Icon: Heart, labelKey: 'post.reaction.LOVE' },
  { type: 'HAHA', Icon: Laugh, labelKey: 'post.reaction.HAHA' },
  { type: 'CRY', Icon: Frown, labelKey: 'post.reaction.CRY' },
  { type: 'ANGRY', Icon: Angry, labelKey: 'post.reaction.ANGRY' },
] as const satisfies ReadonlyArray<{ type: ReactionType; Icon: typeof ThumbsUp; labelKey: string }>;

/**
 * The five types in the order this bar shows them, for anything that has to list them the same
 * way — the reactor dialog's tabs. Exported from here rather than duplicated so the two can never
 * disagree about the order or drop a value when the enum grows.
 */
export const REACTION_ORDER = REACTIONS.map((reaction) => reaction.type);

export function ReactionBar({
  postId,
  count,
  commentCount,
  actions,
  onChanged,
  className,
}: ReactionBarProps) {
  const t = useT();

  const [reactorsOpen, setReactorsOpen] = useState(false);

  const myReaction = useMyReaction(postId);
  const upsert = useUpsertReaction({ onSuccess: () => onChanged?.() });
  const remove = useRemoveReaction({ onSuccess: () => onChanged?.() });

  const current = myReaction.data?.reactionType ?? null;
  const error = upsert.error ?? remove.error;

  /**
   * What the single button wears. Falls back to `LIKE` — the DS's `Hữu ích` — when nothing is
   * picked, which is both the default action and the reaction this product is built around.
   */
  const active = REACTIONS.find((reaction) => reaction.type === current);
  const TriggerIcon = active?.Icon ?? ThumbsUp;
  const triggerLabelKey = active?.labelKey ?? 'post.reaction.LIKE';

  const pick = (type: ReactionType) => {
    // GATE, not a convenience: `removeReaction` throws 404 when there is no reaction to
    // remove, so it may only fire for the one that is currently active. Everything else is
    // an upsert, including switching LIKE → LOVE (one row per user+post, so no delete first).
    if (current === type) remove.mutate(postId);
    else upsert.mutate({ postId, reactionType: type });
  };

  return (
    // `w-full`: see `actions`. Without it the row shrinks to its content and the counts never
    // reach the card's edge.
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {/* ONE ROW: verbs left, counts right. The DS's acting row reads as a sentence — what you can
          do, then what has already been done — and pushing the counts to the far end is what makes
          the two halves legible as different kinds of thing rather than a run of six chips. */}
      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        {/**
         * THE TRIGGER SHOWS WHAT YOU PICKED, not a generic "Like". A single button that always
         * reads `Hữu ích` would hide the one piece of state the seven-toggle row made obvious —
         * which of them is yours — and a reader would have to open the tray to find out.
         *
         * CLICKING IT IS THE SHORTCUT, not a second menu: with nothing picked it sends `LIKE`,
         * which is the DS's `Hữu ích` and the reaction this product is actually about; with
         * something picked it removes that one. Everything else is one hover away.
         */}
        <ReactionTray
          label={t('post.reaction.pick')}
          trigger={
            <button
              type="button"
              aria-pressed={current !== null}
              onClick={() => pick(current ?? 'LIKE')}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-nx-xs border px-2.5 text-nx-body-sm',
                'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                current
                  ? 'border-nx-accent bg-nx-accent-soft text-nx-text-accent'
                  : 'border-transparent text-nx-text-muted hover:bg-nx-surface-hover hover:text-nx-text-primary'
              )}
            >
              <TriggerIcon aria-hidden className="size-4 shrink-0" />
              <span>{t(triggerLabelKey)}</span>
            </button>
          }
        >
          {REACTIONS.map(({ type, Icon, labelKey }) => (
            <button
              key={type}
              type="button"
              aria-pressed={current === type}
              // The label is the accessible name here: the tray is a row of glyphs, and at 16px
              // `CRY` and `ANGRY` are not distinguishable without one. `title` gives the same
              // string to a mouse as a native tooltip, which is what the DS's Tooltip would
              // have done if this row were not already a floating layer.
              aria-label={t(labelKey)}
              title={t(labelKey)}
              onClick={() => pick(type)}
              className={cn(
                'grid size-8 place-items-center rounded-nx-full',
                'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
                current === type
                  ? 'bg-nx-accent-soft text-nx-text-accent'
                  : 'text-nx-text-muted hover:bg-nx-surface-hover hover:text-nx-text-primary'
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
            </button>
          ))}
        </ReactionTray>

        {/* THE COUNT IS A BUTTON NOW. It used to be a dead number: it said something had happened
            and not who it happened with, which on a product whose reactions are meant to be
            credibility signals is most of the information missing. `GET /posts/{id}/reactions`
            existed with no caller.

            IT STAYS A COUNT AT ZERO AND STOPS BEING A CONTROL — opening a list of nobody is a
            worse answer than the number already given. */}
        {actions}

        {/* BOTH TOTALS, ONE ROW, PINNED RIGHT. `ml-auto` on the group rather than on each number
            so the separator between them cannot drift apart from the pair. */}
        <div className="ml-auto flex items-center gap-2 pl-[var(--nx-space-element)]">
          {!!commentCount && (
            <>
              <span className="font-mono text-nx-micro text-nx-text-muted">
                {t('post.commentCount', { count: commentCount })}
              </span>
              {count !== undefined && (
                <span className="text-nx-micro text-nx-text-faint" aria-hidden>
                  ·
                </span>
              )}
            </>
          )}

          {count !== undefined &&
            (count > 0 ? (
              <button
                type="button"
                onClick={() => setReactorsOpen(true)}
                className={cn(
                  'font-mono text-nx-micro text-nx-text-muted',
                  'hover:text-nx-text-primary hover:underline',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
                )}
              >
                {t('post.reaction.count', { count })}
              </button>
            ) : (
              <span className="font-mono text-nx-micro text-nx-text-muted">
                {t('post.reaction.count', { count })}
              </span>
            ))}
        </div>
      </div>

      {/* The optimistic highlight has already rolled back by the time this renders, so the
          message explains a state the user can already see reverted. */}
      {error && (
        <p role="status" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(error)}
        </p>
      )}

      <ReactorDialog postId={postId} open={reactorsOpen} onClose={() => setReactorsOpen(false)} />
    </div>
  );
}
