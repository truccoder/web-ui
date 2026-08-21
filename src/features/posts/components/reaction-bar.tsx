'use client';

import { useState } from 'react';
import { Angry, Frown, HandHeart, Heart, Laugh, Lightbulb, ThumbsUp } from 'lucide-react';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useMyReaction, useRemoveReaction, useUpsertReaction } from '../hooks/use-reaction';
import type { ReactionType } from '../types/reaction';
import { ReactorDialog } from './reactor-dialog';

/**
 * The reaction row for a post — fills `PostCard`'s `actions` slot.
 *
 * FIVE INLINE TOGGLES, NOT A HOVER PICKER. The familiar social pattern is one button with a
 * floating tray of emoji, but the design system has no popover/floating-panel spec at all
 * (only Dialog, Menu, Tooltip, Toast), and inventing one for this would be a new primitive
 * built from a guess — the same reasoning that made `LocationPicker` an inline panel. Five
 * toggles need no floating layer and make the current state visible without hovering.
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

export function ReactionBar({ postId, count, onChanged, className }: ReactionBarProps) {
  const t = useT();

  const [reactorsOpen, setReactorsOpen] = useState(false);

  const myReaction = useMyReaction(postId);
  const upsert = useUpsertReaction({ onSuccess: () => onChanged?.() });
  const remove = useRemoveReaction({ onSuccess: () => onChanged?.() });

  const current = myReaction.data?.reactionType ?? null;
  const error = upsert.error ?? remove.error;

  const pick = (type: ReactionType) => {
    // GATE, not a convenience: `removeReaction` throws 404 when there is no reaction to
    // remove, so it may only fire for the one that is currently active. Everything else is
    // an upsert, including switching LIKE → LOVE (one row per user+post, so no delete first).
    if (current === type) remove.mutate(postId);
    else upsert.mutate({ postId, reactionType: type });
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* ONE ROW: verbs left, counts right. The DS's acting row reads as a sentence — what you can
          do, then what has already been done — and pushing the counts to the far end is what makes
          the two halves legible as different kinds of thing rather than a run of six chips. */}
      <div className="flex flex-wrap items-center gap-[var(--nx-space-pair)]">
        {REACTIONS.map(({ type, Icon, labelKey }) => {
          const active = current === type;
          return (
            <button
              key={type}
              type="button"
              // `aria-pressed` is what makes these toggles rather than five separate
              // actions, and it is the part a screen reader uses to announce the state
              // the border communicates visually.
              aria-pressed={active}
              onClick={() => pick(type)}
              className={cn(
                // Kit: height 28, `gap: var(--nx-space-pair)` between glyph and label,
                // `padding: 0 10px` — the inset split. Was `gap-2 px-2`, which read the
                // glyph and its label as two separate elements rather than one control.
                'inline-flex h-7 items-center gap-1 rounded-nx-xs border px-2.5',
                'text-nx-body-sm',
                'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                active
                  ? 'border-nx-accent bg-nx-accent-soft text-nx-text-accent'
                  : 'border-transparent text-nx-text-muted hover:bg-nx-surface-hover hover:text-nx-text-primary'
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {/* THE LABEL IS VISIBLE NOW, not just an `aria-label`. Five unlabelled glyphs made
                  the reader guess which face meant what, and the guess is not obvious for `CRY`
                  versus `ANGRY` at 16px. With the word present the icon stops carrying meaning on
                  its own, which is what the DS's `Hữu ích · Sáng tỏ · Ghi nhận` row does too. */}
              <span>{t(labelKey)}</span>
            </button>
          );
        })}

        {/* THE COUNT IS A BUTTON NOW. It used to be a dead number: it said something had happened
            and not who it happened with, which on a product whose reactions are meant to be
            credibility signals is most of the information missing. `GET /posts/{id}/reactions`
            existed with no caller.

            IT STAYS A COUNT AT ZERO AND STOPS BEING A CONTROL — opening a list of nobody is a
            worse answer than the number already given. */}
        {count !== undefined &&
          (count > 0 ? (
            <button
              type="button"
              onClick={() => setReactorsOpen(true)}
              className={cn(
                'ml-auto pl-[var(--nx-space-element)] font-mono text-nx-micro text-nx-text-muted',
                'hover:text-nx-text-primary hover:underline',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
              )}
            >
              {t('post.reaction.count', { count })}
            </button>
          ) : (
            <span className="ml-auto pl-[var(--nx-space-element)] font-mono text-nx-micro text-nx-text-muted">
              {t('post.reaction.count', { count })}
            </span>
          ))}
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
