'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Avatar, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { RepScore, useReputation } from '@/features/reputation';
import { useRoadmapProgress } from '@/features/roadmap';
import type { ConversationHeaderData } from './conversation-view';

/**
 * `/chats`'s third column — who you are talking to.
 *
 * IT IS THE R9 ADDITION THIS APP NEVER BUILT. The kit's own README lists it in the round's
 * headline — *`/chats` gains an info column* — and the measured focus-mode region is three panes,
 * not two: list **300** on `surface-card`, transcript **flex-1** on the recessed ground, and this
 * column **300**, transparent, `padding: 20px 20px 48px`, owning its own scroller.
 *
 * WHY IT IS TRANSPARENT WHILE THE LIST IS FILLED, since that asymmetry looks like an oversight and
 * is not. The list is a region you operate — a scroller of hit targets — so it takes a plane of
 * its own; this column is apparatus about the person in the middle pane, the same role the ledger
 * plays beside the feed. Both flanks in this product are recessed by *being* the ground. A fill
 * here would make focus mode a three-legged ∩, which is the exact shape rounds 3 and 4 spent
 * themselves opening.
 *
 * THE PEER'S APP USER ID IS `otherMemberId`, AND THAT IS SAFE TO PARSE. Stream ids are not opaque
 * in this product: `StreamChatService` mints them as `String.valueOf(user.getId())`, so the id on
 * a channel member is the app's own primary key rendered as a string. That is what makes a
 * reputation and a verified-skill list reachable from a chat pane at all — both endpoints key on
 * the numeric user id.
 *
 * A GROUP HAS NO PEER, so this column becomes the group's own identity — name, avatar, member
 * count — and nothing else. That falls out rather than being branched for: the mappers report
 * `otherMemberId: null` above two members, which leaves `userId` null, which is what the two
 * queries below are already gated on. The alternative, a reputation chip for whichever member
 * Stream listed first, would be a number about someone the reader never asked about.
 *
 * THE AVATAR AND THE NAME LINK TO THE PEER'S PROFILE — B38, closed. This pane could not do that
 * for a long time: `/u/{username}` is keyed by **handle** and nothing here resolved an id to one,
 * so the kit's link would have been a control that cannot reach what it names. `username` is on
 * `ReputationResponseDto` now, and this pane already fetches it for the score chip, so the link
 * costs no extra request. Same rule as B13/B21/B35 wherever a handle can be missing: when it is
 * absent the same avatar and name render as plain text rather than as a link that 404s.
 */
export interface ChatInfoProps {
  header: ConversationHeaderData | null;
  className?: string;
}

export function ChatInfo({ header, className }: ChatInfoProps) {
  const t = useT();

  /**
   * `Number.parseInt` RATHER THAN `Number()`, and the difference matters on the empty pane:
   * `Number(null)` and `Number('')` are both **0**, a falsy-but-valid-looking id that would have
   * fired `/users/0/reputation` on every conversation with no header yet. `parseInt` yields `NaN`,
   * which the `enabled` gate below reads as "no one to ask about".
   */
  const parsed = Number.parseInt(header?.otherMemberId ?? '', 10);
  const userId = Number.isFinite(parsed) ? parsed : null;

  const { data: reputation, isPending: repPending } = useReputation(userId ?? undefined);
  const { data: progress } = useRoadmapProgress(userId ?? Number.NaN, userId != null);

  // Settled claims only, same rule as the ledger: `Bằng chứng`/`Năng lực` is what a verifier
  // accepted, and a pending row here would be counting a cheque before it cleared.
  const verified = (progress ?? []).filter((row) => row.status === 'VERIFIED');

  // `name` first, the same order the row and the thread header use — see the note on the title in
  // `ConversationView`.
  const name = header?.name ?? header?.otherMemberName ?? t('chat.unknownPerson');
  const isGroup = (header?.memberCount ?? 0) > 2;

  /** The peer's page, when the reputation payload says who they are. */
  const profileHref = reputation?.username
    ? `/u/${encodeURIComponent(reputation.username)}`
    : undefined;

  return (
    <aside
      aria-label={t('chat.info.label')}
      /**
       * `20px 20px 48px` and its own scroller, measured off the kit. 48 is the runout every
       * scroller in this product ends with; `min-h-0` is what lets `overflow-y-auto` actually
       * scroll inside focus mode's flex row rather than growing the row past the viewport.
       */
      className={cn(
        'hidden w-[var(--spacing-nx-focus-aside)] min-h-0 shrink-0 flex-col gap-[var(--nx-space-block)]',
        'overflow-y-auto px-5 pt-5 pb-12 xl:flex',
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        {/* `encodeURIComponent` because a handle is user-chosen text, not a slug this app minted —
            the same rule `PostCard.authorHref` follows. A group has no peer and therefore no
            `reputation`, so it falls to the unlinked branch without a check of its own. */}
        {profileHref ? (
          <>
            <Link href={profileHref} aria-label={t('chat.info.viewProfile', { name })}>
              <Avatar src={header?.otherMemberImage ?? undefined} name={name} size="xl" />
            </Link>
            <Link
              href={profileHref}
              className="text-nx-heading font-semibold text-nx-text-primary hover:underline"
            >
              {name}
            </Link>
          </>
        ) : (
          <>
            <Avatar src={header?.otherMemberImage ?? undefined} name={name} size="xl" />
            <p className="text-nx-heading font-semibold text-nx-text-primary">{name}</p>
          </>
        )}

        {/* THE ONE THING A GROUP CAN SAY IN THE SLOT THE REPUTATION CHIP LEAVES EMPTY. It is a
            count and not a member list on purpose: the names would need an avatar each and this
            column is 300 wide, and the members are one tap away in Stream's own channel state the
            day a member sheet is worth building. */}
        {isGroup && (
          <p className="text-nx-caption text-nx-text-muted">
            {t('chat.info.memberCount', { count: header?.memberCount ?? 0 })}
          </p>
        )}

        {/* `userId != null` GUARDS THE SKELETON, not just the request. A disabled React Query is
            `isPending: true` forever — it is pending in the sense of "never asked" — so a pane with
            nobody to ask about would sit under a loading pill that resolves on no event. That was
            reachable before only in the instant before a header arrived; a group makes it the
            steady state, which is what turned it from a flicker into a bug. */}
        {userId != null && repPending && !reputation ? (
          <Skeleton width={72} height={24} radius={999} />
        ) : (
          reputation && (
            <RepScore
              score={reputation.eliteScore}
              size="md"
              showLevel
              levelName={reputation.levelName}
            />
          )
        )}
      </div>

      {/* Absent rather than empty when there is nothing verified — a heading over a blank space
          asks the reader to work out whether something failed. Same rule as the ledger. */}
      {verified.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-nx-overline font-medium text-nx-text-muted">
            {t('chat.info.verifiedSkills')}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {verified.map((row) => (
              <li
                key={row.nodeId}
                className="flex items-center gap-1 rounded-nx-full bg-nx-rep-soft px-2 py-0.5 text-nx-caption text-nx-rep-text"
              >
                <Check className="size-2.75 shrink-0" strokeWidth={3} aria-hidden />
                {row.nodeName}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
