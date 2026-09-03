'use client';

import Link from 'next/link';
import { Check, FileText } from 'lucide-react';
import { Avatar, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { RepScore, useReputation, useReputations } from '@/features/reputation';
import { useRoadmapProgress } from '@/features/roadmap';
import type { ChatMember, ChatSharedMedia } from '../types/chat';
import { formatFileSize } from '../lib/format';
import type { ConversationHeaderData } from './conversation-view';

/** How many shared items the pane shows before the rest stays in the transcript. */
const MAX_SHARED_IMAGES = 12;
const MAX_SHARED_FILES = 8;

/**
 * `/chats`'s third column — who you are talking to.
 *
 * IT IS THE R9 ADDITION THIS APP NEVER BUILT. The kit's own README lists it in the round's
 * headline — *`/chats` gains an info column* — and the measured focus-mode region is three panes,
 * not two: list **300** on `surface-card`, transcript **flex-1** on the recessed ground, and this
 * column **300**, transparent, `padding: 20px 20px 48px`, owning its own scroller.
 *
 * IT USED TO BE TRANSPARENT — apparatus about the person in the middle pane, the same role the
 * ledger plays beside the feed, recessed by *being* the ground. The owner read the bare identity
 * block sitting on the transcript's ground as hard to place (*cho thanh bên nổi lên luôn*) and
 * asked for it to stand off. It now takes `surface-card`, matching the conversation list on the
 * other flank exactly — both flanks a step up from the recessed transcript, neither one elevated
 * over the other (*không trồi lên so với 2 bên*). No shadow: the plane change is the whole signal.
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
  /** Pictures and files exchanged in the thread — resolved by the frame's `useConversation`. */
  media?: ChatSharedMedia;
  className?: string;
}

export function ChatInfo({ header, media, className }: ChatInfoProps) {
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
  const members = header?.members ?? [];

  /**
   * ONE REQUEST PER GROUP MEMBER, to turn a Stream id into the handle `/u/{username}` needs.
   * Skipped entirely for a direct message — there the peer is resolved once, above. The 60s
   * `staleTime` means a member also open elsewhere (the DM peer, a feed author) is a cache hit.
   */
  const memberReputations = useReputations(
    isGroup ? members.map((member) => Number(member.id)) : []
  );

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
        'hidden w-[var(--spacing-nx-focus-aside)] min-h-0 shrink-0 flex-col',
        'gap-[var(--nx-space-block)] bg-nx-surface-card',
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

        {/* The quick fact under the name — the full roster is its own section below. */}
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

      {/* WHO IS IN THE GROUP — the owner's ask (*nhóm thì nên làm rõ thêm có ai*). Stream already
          loaded name and avatar with the channel; the row links to the profile once
          `useReputations` resolves that member's handle, and stays plain text until then (same
          fallback as the DM peer above). Direct messages skip this — the one peer is the header. */}
      {isGroup && members.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-nx-overline font-medium text-nx-text-muted">
            {t('chat.info.membersHeading')}
          </h3>
          <ul className="flex flex-col gap-1">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                username={memberReputations.get(Number(member.id))?.username ?? null}
                viewProfileLabel={t('chat.info.viewProfile', { name: member.name ?? member.id })}
              />
            ))}
          </ul>
        </section>
      )}

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

      {/* SHARED PICTURES — the owner's ask (*thêm lịch sử gửi file/ảnh*). The list is history
          (one `channel.search`) plus whatever the transcript holds; the pane shows the newest
          `MAX_SHARED_IMAGES` and the count says how many there are in all. A background image, not
          `<img>`: a square-cropped thumbnail with no alt of its own — the link carries the name. */}
      {media && media.images.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-nx-overline font-medium text-nx-text-muted">
            {t('chat.info.sharedImages', { count: media.images.length })}
          </h3>
          <ul className="grid grid-cols-3 gap-1">
            {media.images.slice(0, MAX_SHARED_IMAGES).map((item) => (
              <li key={`${item.messageId}:${item.url}`}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.name ?? t('chat.imageAttachment')}
                  className={cn(
                    'block aspect-square overflow-hidden rounded-nx-sm bg-nx-surface-sunken bg-cover bg-center',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
                  )}
                  style={{ backgroundImage: `url(${item.url})` }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* SHARED FILES — same list, the non-image half. Each row is a download link. */}
      {media && media.files.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-nx-overline font-medium text-nx-text-muted">
            {t('chat.info.sharedFiles', { count: media.files.length })}
          </h3>
          <ul className="flex flex-col gap-1">
            {media.files.slice(0, MAX_SHARED_FILES).map((item) => (
              <li key={`${item.messageId}:${item.url}`}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className={cn(
                    'flex items-center gap-2 rounded-nx-sm py-1 text-nx-body-sm text-nx-text-primary',
                    'hover:underline',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
                  )}
                >
                  <FileText className="size-4 shrink-0 text-nx-text-secondary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">
                    {item.name ?? t('chat.fileAttachment')}
                  </span>
                  {item.size != null && (
                    <span className="shrink-0 text-nx-caption text-nx-text-muted">
                      {formatFileSize(item.size)}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

/**
 * One member in the group roster.
 *
 * LINKED ONLY ONCE THE HANDLE IS KNOWN. `/u/{username}` is keyed by handle and a Stream member
 * carries none, so until `useReputations` resolves it the row is plain text — a link that 404s is
 * worse than none, the same rule the DM peer and `FriendListItem` follow. Only the identity is the
 * link; there is no trailing control to make a whole-row anchor ambiguous.
 */
function MemberRow({
  member,
  username,
  viewProfileLabel,
}: {
  member: ChatMember;
  username: string | null;
  viewProfileLabel: string;
}) {
  const label = member.name ?? member.id;

  const identity = (
    <>
      <Avatar src={member.image ?? undefined} name={label} size="sm" />
      <span className="min-w-0 flex-1 truncate text-nx-body-sm text-nx-text-primary">{label}</span>
    </>
  );

  if (!username) {
    return <li className="flex items-center gap-2 py-1">{identity}</li>;
  }

  return (
    <li>
      <Link
        href={`/u/${encodeURIComponent(username)}`}
        aria-label={viewProfileLabel}
        className={cn(
          'flex items-center gap-2 rounded-nx-sm py-1 hover:underline',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
        )}
      >
        {identity}
      </Link>
    </li>
  );
}
