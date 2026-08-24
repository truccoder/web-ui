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
 * state is carried by the glyph FILLING plus `aria-pressed` rather than colour alone (§12).
 *
 * THE PICKED STATE IS A FILLED GLYPH, AND THIS FILE HAS NOW TRIED TWO OTHER THINGS. It shipped
 * `border-nx-accent bg-nx-accent-soft` — a bordered, filled box around the word — and the owner's
 * objection to that is a geometry fact, not a taste one: the row carries a negative margin so the
 * *ink* of the control lands on the post's text column (see the note on it), which means the
 * button's BOX starts 10px to the LEFT of it. While the box was invisible that was the correct
 * trade. The moment it gained a border and a fill it became the widest visible edge in the card
 * and hung 10px outside the column every other element — byline, prose, hashtags — lines up on.
 * The replacement was an accent underline on the label; the owner did not want a rule under the
 * word, which is fair — it borrows a link's shape for something that is not one.
 *
 * SO THE STATE MOVED INTO THE GLYPH, where it costs no box and no layout at all. A hollow icon
 * becomes a filled one, which is the oldest signal in this control's vocabulary and the one every
 * reader already knows from a heart.
 *
 * IT IS A 20% TINT, NOT A SOLID, AND THAT IS A LUCIDE CONSTRAINT WORTH KNOWING BEFORE ANYONE
 * "FIXES" IT. Lucide ships no filled variants — every glyph is one stroked path — so a true
 * `fill-current` solid works on `ThumbsUp` and `Heart` and DESTROYS the three faces: `Laugh`,
 * `Frown` and `Angry` are a circle whose eyes and mouth are strokes in the same colour, so filling
 * the circle with that colour leaves a featureless disc. A tint at the ink's own hue fills every
 * one of the seven and keeps the features legible. If a filled icon set is ever added to the
 * project, this is the line that becomes a solid.
 *
 * THE COUNT DOES NOT MOVE WHEN YOU CLICK, and the reason has changed since this note was
 * written. It used to be that `PostReactionController` had no endpoint for a post's totals at
 * all; `/reactions/summary` exists now and `reactionsApi.getSummary` wraps it. What has not
 * changed is that the summary is PER POST, while `count` arrives embedded in the feed/search
 * payload the caller already holds — so buying a live number costs one extra request per card,
 * which is the trade B19 in `docs/backend-plan.md` asks the backend to remove by putting the
 * breakdown in the list response. Until then `onChanged` is the honest lever: the composing
 * screen decides whether a reaction is worth re-fetching the feed for. Do not fake the increment
 * locally — the highlight is honest, an invented total is not.
 */
export interface ReactionBarProps {
  postId: number;
  /**
   * Total reactions from the feed/search payload (`likeCount`). Undefined hides the number
   * rather than showing 0 for "not supplied".
   */
  count?: number;
  /**
   * Controls that belong beside the reaction trigger — the comment glyph and its count, today.
   *
   * `commentCount` USED TO BE A PROP HERE AND IS NOT ANY MORE. This component printed the two
   * totals together at the row's right edge, so it needed both numbers even though it owned only
   * one of them. Now that each number sits beside the glyph it counts, the comment total belongs
   * to whoever builds the comment glyph — the same caller, one node, no prop that this component
   * takes and never acts on.
   *
   * A SLOT RATHER THAN A SIBLING. The reason used to be `ml-auto`: the counts were pinned to the
   * right edge of whatever box they were in, so this component had to BE the full row or the
   * numbers stopped mid-card. That is gone with the pinning, and the slot survives on the weaker
   * but still sufficient reason — the two controls are one strip and one flex context, and the
   * caller cannot produce that from outside without re-declaring the row's gap and its margin.
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
/*
 * EXPORTED because the comment row wears the same seven, and there must be exactly one place that
 * says which glyph and which word belong to `INSIGHT`. `CommentItem` renders a single toggle
 * rather than this whole bar, but the toggle still has to be able to show whichever type the
 * reader picked — a comment accepts all seven, and the seeded thread has `INSIGHT` rows on it.
 */
export const REACTIONS = [
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

/**
 * The shape every glyph control in a post's acting row wears: a 32px square, a 20px glyph, a
 * hover box and nothing at rest.
 *
 * EXPORTED BECAUSE THE ROW HAS TWO OF THEM AND THEY LIVE IN DIFFERENT FILES. The reaction
 * trigger is below; the comment button is passed in through `actions` by whoever owns the post
 * (today `FeedPost`), because only that caller knows where its discussion is and how to open it.
 * Two icon buttons sitting 4px apart that disagree by a pixel of padding or a shade of grey read
 * as a bug, and a copied class string is exactly how that happens — so there is one string.
 *
 * WHAT IT DELIBERATELY LEAVES OUT is colour-when-active: only the reaction has an active state,
 * and it carries it on the GLYPH (a fill) rather than on the box. See the module header.
 *
 * `size-8` WITH A `size-5` GLYPH, UP FROM 28/16 — the owner asked for a bigger icon once the
 * labels came off, and the two numbers have to move together. A 16px glyph left 6px of air on
 * every side of a 28px box, which reads as a small mark floating in a large hit area; 20-in-32
 * keeps the same 6px inset (so the row's negative margin does not move) while giving the glyph
 * a quarter more area. It is also the size the DS's own `md` controls use for their icons.
 */
export const ACTION_GLYPH_BUTTON = cn(
  'grid size-8 place-items-center rounded-nx-sm',
  'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
  'hover:bg-nx-surface-hover',
  'disabled:pointer-events-none disabled:opacity-50'
);

/** The glyph inside `ACTION_GLYPH_BUTTON`. Separate because callers style their own icon. */
export const ACTION_GLYPH = 'size-5 shrink-0';

/**
 * A glyph and the number it counts, held together.
 *
 * NO GAP AT ALL, AND THE NUMBER IS MEASURED RATHER THAN GUESSED. The glyph button is a 32px box
 * around a 20px mark, so it already carries 6px of its own padding on the side the number sits —
 * declaring a gap on top of that would be spending the space twice. Ink to ink inside a pair: 6.
 *
 * WHAT MAKES THE PAIRING READ is the ratio to the gap BETWEEN pairs, and the first version of
 * this got it wrong: it left the row on `--nx-space-pair`, which is **4px**, not the 8 assumed —
 * so a pair would have been 8 apart inside and 10 apart from the next pair, and the eye would
 * have seen four evenly spaced things rather than two groups of two. The row moved to
 * `--nx-space-tight` (8), which puts 8 + 6 = 14 between pairs against 6 inside one.
 *
 * The token names read backwards for this use and it is worth saying why they are still right:
 * `pair` is 4 because it is meant for two glyphs that TOUCH, with no padded box between them.
 * Here the boxes supply the pairing and the row supplies the separation.
 */
export const ACTION_GROUP = 'flex items-center';

/**
 * The number itself.
 *
 * `text-nx-body-sm` (13), UP FROM `text-nx-micro`. Micro is the DS's rung for a fact printed at
 * the edge of a card, which is exactly where these numbers used to live. Beside a 20px glyph it
 * reads as a footnote attached to a control rather than as part of it.
 *
 * `font-mono tabular-nums` is the house treatment for machine facts, and the fixed advance also
 * stops the row twitching when a count crosses 9 → 10.
 */
export const ACTION_COUNT = 'font-mono text-nx-body-sm tabular-nums text-nx-text-muted';

export function ReactionBar({ postId, count, actions, onChanged, className }: ReactionBarProps) {
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
      {/**
       * `-ml-1.5` CANCELS THE FIRST BUTTON'S OWN INSET so the row starts on the card's text
       * column. Every control on the left of this row is a padded box, so the *ink* of the first
       * one began several pixels right of the author's name and the post's prose, and the whole
       * acting row read as indented under the body it belongs to. The BOX was aligned; the thing
       * a reader actually sees was not. Pulling the row back by exactly that inset puts the
       * glyph's left edge on the same vertical as the paragraph above it.
       *
       * THE NUMBER IS 6, NOT 10, AND IT MOVED WITH THE LABEL. This was `-ml-2.5` while the
       * trigger was a labelled `px-2.5` box. It is now a square `size-7` with a 16px glyph
       * centred in it, so the inset before the ink is (28 − 16) / 2 = 6. Leaving it at 10 would
       * have hung the row 4px PAST the column in the other direction — the same defect, mirrored.
       *
       * ONE SIDE ONLY, and there is nothing on the other side any more. The counts used to be
       * pinned to the card's right edge with `ml-auto`, which is why a matching `-mr` would have
       * been wrong; they now sit beside their own glyphs and the row simply ends where its
       * controls do. The negative margin also stays on this row rather than on the flex column,
       * so the error line below keeps the prose's alignment — it is a sentence, not a control.
       */}
      {/* `tight` (8), UP FROM `pair` (4) — see `ACTION_GROUP`. This gap now separates one
          glyph-and-number pair from the next rather than two bare controls, so it has to be the
          larger of the two spacings on this row, not the smaller. */}
      <div className="-ml-1.5 flex flex-wrap items-center gap-[var(--nx-space-tight)]">
        {/* GLYPH AND NUMBER ARE ONE OBJECT — see `ACTION_GROUP`. Without this wrapper both would
            be plain children of the row and the reaction's count would sit exactly as far from
            its own thumb as from the comment glyph after it. */}
        <div className={ACTION_GROUP}>
          {/**
           * THE TRIGGER WEARS THE GLYPH YOU PICKED, not a generic thumb. A button stuck on
           * `ThumbsUp` would hide the one piece of state the seven-toggle row made obvious — which
           * of them is yours — and a reader would have to open the tray to find out. That mattered
           * when the word was there too; it matters more now that the glyph is the whole control.
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
                /**
                 * A SQUARE GLYPH BUTTON, NOT A LABELLED ONE — the owner asked for the Facebook
                 * shape: the icon says it, the word is redundant. The paragraph that used to stand
                 * here matched this button's TYPOGRAPHY to the ghost `Button` beside it, because a
                 * row with two different weights of the same-sized text reads as a mistake. That
                 * argument retires with the text: there is none left to match. The shape and every
                 * measurement now live in `ACTION_GLYPH_BUTTON` above, because the comment button
                 * beside this one is the same object built in another file and the two must not
                 * drift.
                 *
                 * `grid place-items-center`, NOT `inline-flex … px-2.5`, AND THE `-mt-1` IS GONE
                 * WITH THE LABEL. That margin existed to pull the glyph up onto a 13px label's
                 * optical centre, which is above the box centre. With nothing to align to, the
                 * geometric centre IS the right answer, and keeping the lift would just print the
                 * icon 2px high in its own box.
                 *
                 * WHY STILL NOT `Button`. Its `icon` slot wraps the SVG in a span and its `sm` size
                 * forces `px-2.5`, so a square icon-only control has to fight both. If the DS ever
                 * grows an icon-button size, this is what it replaces.
                 *
                 * THE HOVER BOX STAYS. It is transient, and on a control with no text it is now the
                 * main thing saying "this is a button" before you click.
                 */
                className={cn(
                  ACTION_GLYPH_BUTTON,
                  current
                    ? 'text-nx-text-accent'
                    : 'text-nx-text-secondary hover:text-nx-text-primary'
                )}
              >
                {/**
                 * `fill-nx-text-accent/20` IS THE PICKED STATE — see the module header for why it is
                 * a tint and not a solid. The token is the one the STROKE is already drawn in
                 * (`text-nx-text-accent`), so the fill is the same ink lightened rather than a
                 * second blue, and it follows the glyph into dark mode without a second rule. 20%
                 * is the alpha the old chip used on both themes, so the weight is unchanged; it is
                 * just inside the shape now instead of behind the word.
                 *
                 * IT CARRIES MORE WEIGHT NOW THAN IT DID. With the label gone the fill is the ONLY
                 * difference between "I reacted" and "I did not", so §12's rule that state may not
                 * ride on colour alone is doing real work here rather than being belt-and-braces.
                 */}
                <TriggerIcon
                  aria-hidden
                  className={cn(ACTION_GLYPH, current && 'fill-nx-text-accent/20')}
                />
                {/**
                 * THE WORD IS GONE FROM THE SCREEN, NOT FROM THE ACCESSIBILITY TREE. `sr-only`
                 * rather than `aria-label` on the button: a label would REPLACE the element's
                 * content, and this is the pattern `Avatar` already uses for its status dot.
                 *
                 * The name has to keep saying which reaction is picked — `Hữu ích` when nothing is,
                 * `Ghi nhận` when `CLAP` is — because a screen reader now has nothing else to go
                 * on, and because `e2e/newsfeed.spec.ts` finds this control by that exact name.
                 *
                 * NO `title`. The tray opens on hover, so a native tooltip would fade in on top of
                 * the seven glyphs it just revealed. The tray IS the hover affordance here; the
                 * comment row's toggle has no tray and does carry one.
                 */}
                <span className="sr-only">{t(triggerLabelKey)}</span>
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
                {/* Filled here too, so "the one that is mine" looks the same in the tray as it does
                  on the trigger the tray hangs off. The round chip stays: this is a grid of bare
                  glyphs with no words, and it needs a hit target you can see before you click. */}
                <Icon
                  aria-hidden
                  className={cn('size-4 shrink-0', current === type && 'fill-nx-text-accent/20')}
                />
              </button>
            ))}
          </ReactionTray>

          {/**
           * THE COUNT STANDS BESIDE ITS OWN GLYPH NOW, and the pair it used to belong to is broken
           * up on purpose. Both totals used to sit together at the card's far right — `ml-auto`,
           * reading `6 bình luận · 1 cảm xúc`. That was right while the controls carried words: two
           * labelled buttons on the left, two labelled facts on the right, a sentence in two halves.
           * With the labels gone it stopped working — a bare glyph at one end of the row and a
           * number at the other end, and nothing but the reader's memory joining them.
           *
           * SO THE NUMBER MOVED TO THE GLYPH IT COUNTS, which is also what every product that runs
           * an icon-only action row does. `ACTION_COUNT` is the shape; `ACTION_GROUP` is the tight
           * gap that makes glyph-and-number read as one object rather than two things in a list.
           *
           * IT IS A BARE NUMBER, NOT `1 cảm xúc`. The word was carrying the meaning while the number
           * sat 500px from anything that explained it; next to a thumb it is redundant, and it is
           * what made the old line long enough to need its own end of the row. The words survive in
           * `aria-label`, so the accessible name still reads `1 cảm xúc` rather than `1`.
           *
           * HIDDEN AT ZERO, which is a reversal recorded rather than dropped. The note here used to
           * argue the number should stay at zero and merely stop being a control, because "opening a
           * list of nobody is a worse answer than the number already given". That held when the
           * number said `0 cảm xúc` — a sentence, and an honest one. A bare `0` beside a glyph is
           * not a sentence, it is clutter, and every other count in this product (`PostCard`'s,
           * `CommentItem`'s) already vanishes at zero. The rule the old note protected — never offer
           * a reactor list for a post nobody reacted to — is kept: there is no control to press.
           */}
          {count !== undefined && count > 0 && (
            <button
              type="button"
              onClick={() => setReactorsOpen(true)}
              // The label REPLACES the content here, unlike the glyph buttons' `sr-only` span, and
              // that is the point: the content is `1` and the name has to be `1 cảm xúc`. An
              // `sr-only` word beside it would have a screen reader say the number twice.
              aria-label={t('post.reaction.count', { count })}
              className={cn(
                ACTION_COUNT,
                'hover:text-nx-text-primary hover:underline',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
              )}
            >
              {count}
            </button>
          )}
        </div>

        {/* The comment glyph and ITS number, built by whoever owns the post — see `actions`. It
            carries its own count for the same reason this one does: the number belongs to the
            control, and the control's owner is the only one who knows what pressing it does. */}
        {actions}
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
