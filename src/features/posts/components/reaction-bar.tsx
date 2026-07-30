'use client';

import { Angry, Frown, Heart, Laugh, ThumbsUp } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import { useMyReaction, useRemoveReaction, useUpsertReaction } from '../hooks/use-reaction';
import type { ReactionType } from '../types/reaction';

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
const REACTIONS = [
  { type: 'LIKE', Icon: ThumbsUp, labelKey: 'post.reaction.LIKE' },
  { type: 'LOVE', Icon: Heart, labelKey: 'post.reaction.LOVE' },
  { type: 'HAHA', Icon: Laugh, labelKey: 'post.reaction.HAHA' },
  { type: 'CRY', Icon: Frown, labelKey: 'post.reaction.CRY' },
  { type: 'ANGRY', Icon: Angry, labelKey: 'post.reaction.ANGRY' },
] as const satisfies ReadonlyArray<{ type: ReactionType; Icon: typeof ThumbsUp; labelKey: string }>;

export function ReactionBar({ postId, count, onChanged, className }: ReactionBarProps) {
  const t = useT();

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
      <div className="flex flex-wrap items-center gap-1">
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
              aria-label={t(labelKey)}
              title={t(labelKey)}
              onClick={() => pick(type)}
              className={cn(
                'inline-flex h-7 items-center justify-center rounded-nx-xs border px-2',
                'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                active
                  ? 'border-nx-accent bg-nx-accent-soft text-nx-text-accent'
                  : 'border-transparent text-nx-text-muted hover:bg-nx-surface-hover hover:text-nx-text-primary'
              )}
            >
              <Icon aria-hidden className="size-4" />
            </button>
          );
        })}

        {count !== undefined && (
          <span className="ml-1 font-mono text-nx-micro text-nx-text-muted">
            {t('post.reaction.count', { count })}
          </span>
        )}
      </div>

      {/* The optimistic highlight has already rolled back by the time this renders, so the
          message explains a state the user can already see reverted. */}
      {error && (
        <p role="status" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(error)}
        </p>
      )}
    </div>
  );
}
