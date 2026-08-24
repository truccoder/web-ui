'use client';

import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ReactionType } from '../types/reaction';
import { REACTIONS } from './reaction-bar';

/**
 * The glyphs of the reactions a post or comment actually received, in front of its total.
 *
 * IT EXISTS BECAUSE THE ROW LOST ITS WORDS. While every control carried a label, `1 cảm xúc`
 * said what kind of thing the number counted. Icon-only left a bare `1` next to a thumb, and a
 * reader had no way to learn that the one reaction was `Sáng tỏ` and not a like — which on a
 * product whose reaction set is its argument (`Hữu ích · Sáng tỏ · Ghi nhận`, not the Facebook
 * five) is the most interesting half of the number.
 *
 * IT COULD NOT BE BUILT UNTIL 24/08. `reactionSummary` did not exist on any list payload; the
 * only breakdown was `GET /posts/{id}/reactions/summary`, one request per post, so a feed page of
 * ten cards cost ten extra round trips to draw thirty small icons. That was filed as B19 and it
 * has been paid — the map now rides on `FeedPostDataDto`, `PostDto` and `CommentResponseDto`, out
 * of one `GROUP BY` for the whole page. This component is the reason that field was asked for.
 *
 * NOT OVERLAPPED, WHICH IS WHERE IT PARTS WAYS WITH FACEBOOK. Their stack works because each
 * reaction is a filled colour disc with a white ring, so the discs read as separate objects at
 * 16px. Ours are monochrome stroked outlines in one ink (constitution §1) — overlap them and the
 * strokes interleave into a single unreadable knot. Placed in a row with air between them, three
 * outlines stay three outlines.
 *
 * THREE, AND THE CUTOFF IS NOT ARBITRARY. Seven would be a second row of glyphs on every card
 * that has a busy comment; three is what fits in the space the word `Hữu ích` used to occupy, so
 * the acting row's width is unchanged from the version before the labels came off.
 */
export interface ReactionSummaryProps {
  /**
   * `reactionSummary` from the payload — a map keyed by enum name.
   *
   * A TYPE WITH NO REACTIONS IS ABSENT, NOT ZERO. The backend builds this from a `GROUP BY`, so
   * the keys are only the types that occur; anything reading it must default a missing key
   * rather than assume all seven appear. Null means "this payload predates the field", which is
   * a different thing from "nobody reacted" and renders nothing either way.
   */
  summary?: { [key: string]: number } | null;
  /** How many glyphs to show. Three unless a caller has a narrower row. */
  max?: number;
  className?: string;
}

/**
 * Sorted by count, then by the bar's own order.
 *
 * THE TIE-BREAK IS WHAT KEEPS THE ROW STILL. `Object.entries` follows insertion order, which is
 * whatever order Jackson serialised the map in — so two reactions on one each could swap places
 * between two renders of the same card and the glyphs would appear to shuffle on their own.
 * Falling back to `REACTIONS` makes the order a function of the data alone.
 *
 * Unknown keys are dropped rather than rendered as a fallback glyph: a key this build does not
 * recognise means the enum grew, and inventing an icon for it would be a lie about which
 * reaction it was. `ReactionBar`'s `Record` is where a new member is meant to be caught.
 */
export function topReactions(
  summary: ReactionSummaryProps['summary'],
  max: number
): { type: ReactionType; count: number }[] {
  if (!summary) return [];

  return REACTIONS.map((reaction) => ({
    type: reaction.type as ReactionType,
    count: summary[reaction.type] ?? 0,
  }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}

export function ReactionSummary({ summary, max = 3, className }: ReactionSummaryProps) {
  const t = useT();
  const top = topReactions(summary, max);

  if (top.length === 0) return null;

  return (
    <span className={cn('flex items-center gap-0.5', className)} aria-hidden>
      {top.map(({ type, count }) => {
        const entry = REACTIONS.find((reaction) => reaction.type === type)!;
        const { Icon } = entry;
        return (
          /**
           * THE TOOLTIP IS ON A WRAPPING SPAN, NOT ON THE SVG. An SVG `<title>` child would also
           * work in a browser, but it is a child element rather than an attribute — it survives
           * a refactor badly and it is not what the rest of this codebase reaches for.
           *
           * A TOOLTIP AND NOTHING ELSE: the strip is `aria-hidden` because the button around it
           * already names itself `1 cảm xúc`, and a screen reader reading three glyph names in
           * front of that would be noise rather than detail. A mouse still needs it — at 14px,
           * `CRY` and `ANGRY` are two circles with slightly different mouths.
           */
          <span key={type} title={`${t(entry.labelKey)} ${count}`} className="flex">
            <Icon className="size-3.5 shrink-0 fill-nx-text-accent/20 text-nx-text-accent" />
          </span>
        );
      })}
    </span>
  );
}
