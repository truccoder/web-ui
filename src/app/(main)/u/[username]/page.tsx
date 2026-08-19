'use client';

import { useParams } from 'next/navigation';
import { Avatar, Card, EmptyState, Skeleton } from '@/shared/components';
import { BlockUserButton } from '@/features/blocks';
import { MessageUserButton } from '@/features/chat';
import { MyBooksList } from '@/features/bookstore';
import { GithubStatsCard } from '@/features/github';
import { UserPosts } from '@/features/newsfeed';
import { MySkillsCard } from '@/features/roadmap';
import { ReputationCard, RepScore, useReputation } from '@/features/reputation';
import { usePublicProfile } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * `/u/{username}` — someone else's profile. Owning domain: `security`.
 *
 * THE ROUTE THIS PROJECT SPENT ITS WHOLE LIFE WITHOUT. "No public profile endpoint" is written
 * into CLAUDE.md Phase 3.1 and was designed around in four separate places; `GET
 * /users/{username}/profile` shipped on 2026-08-09 and this is the surface it unlocks.
 *
 * HANDLE IN, ID OUT — the one structural thing worth understanding here. This endpoint is keyed
 * by USERNAME while every other public per-user read is keyed by ID (`/users/{userId}/posts`,
 * `/users/{userId}/reputation`, `/users/{userId}/roadmap-progress`). So the page resolves the
 * handle exactly once, takes `profile.id` from the response, and every section below is driven by
 * that id. The backend's own javadoc asks for precisely this: two lookup keys for one resource
 * would force every section to pick a side.
 *
 * WHAT LINKS HERE, AND WHAT CANNOT. The friends list and search results both carry a username in
 * their payloads, so they link. **The newsfeed does not** — `FeedPostDataDto` has `authorId` and
 * no `authorUsername`, and nothing maps an id back to a handle — so a post's author name is still
 * not a link. That is a backend gap, not an oversight here; one field on the feed DTO closes it.
 *
 * IT IS NOT `/profile` FOR OTHER PEOPLE. `/profile` is the account: credentials, the professional
 * form, your own books, incoming requests — things you *do*. This page is the account as other
 * people can see it: who they are, what the app scores them at, what they have had verified.
 * Nothing here is actionable, and nothing here is private.
 */
export default function PublicProfilePage() {
  const t = useT();
  const params = useParams<{ username: string }>();
  const username = params?.username ?? '';

  const { data: profile, isPending, isError } = usePublicProfile(username);

  /**
   * THE LEVEL NEEDS A SECOND REQUEST, and that is a backend shape, not a choice.
   * `PublicUserResponse` carries `eliteScore` but not `levelName`, and the design system
   * forbids deriving the level from the score in the client. So the number can be drawn from
   * the profile payload while the name it belongs to has to be fetched.
   *
   * Called before the early returns below — hooks cannot sit behind a branch. The hook is a
   * no-op until `profile.id` exists, so the loading pass costs nothing.
   *
   * `docs/backend-plan.md` B2 asks for a `PublicProfileResponse` that carries the level, at
   * which point this hook and the `levelName` prop below both go away.
   */
  const { data: reputation } = useReputation(profile?.id ?? undefined);

  if (isPending) {
    return (
      <div className="flex flex-col gap-[var(--nx-space-section)]">
        <Card>
          <Skeleton lines={3} />
        </Card>
      </div>
    );
  }

  // A 404 is the common failure and the only one worth distinguishing: the handle does not exist.
  // `retry: false` on the hook means this state arrives immediately rather than after three tries.
  if (isError || !profile) {
    return (
      <EmptyState
        title={t('publicProfile.notFoundTitle')}
        description={t('publicProfile.notFoundDesc', { username })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* `gap-5` and `items-start`: the kit's profile hero sets `gap: var(--nx-space-pad)`
          (20) and aligns to the top, so a wrapped Vietnamese name grows downward instead of
          dragging the avatar off centre. Was `gap-4 items-center`. */}
      <Card className="flex items-start gap-5">
        <Avatar
          src={profile.profilePictureUrl ?? undefined}
          name={profile.fullName ?? undefined}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          {/* The score sits BESIDE THE NAME, as the kit's profile hero does — reputation is the
              product's central claim, so it is part of the identity line rather than a fact you
              scroll to. `ReputationCard` further down still owns the progress to the next level;
              this is the readout, that is the apparatus. */}
          <div className="flex flex-wrap items-center gap-[var(--nx-space-tight)]">
            <h1 className="truncate text-nx-title font-semibold tracking-tight text-nx-text-primary">
              {profile.fullName?.trim() || username}
            </h1>
            {profile.eliteScore != null && (
              <RepScore
                score={profile.eliteScore}
                showLevel={reputation?.levelName != null}
                levelName={reputation?.levelName}
              />
            )}
          </div>
          {profile.username && (
            <p className="truncate font-mono text-nx-body-sm text-nx-text-muted">
              @{profile.username}
            </p>
          )}
        </div>

        {/* THE ONLY ACTION ON THIS PAGE, and it is here rather than in a menu because there is
            nothing else to put in one. `blocks` shipped in the same backend batch as this route
            and had no surface at all until now — the product could block and could not be asked
            to. This is the page that is about one person, so it is where the control belongs. */}
        {/* Two actions, and they are the only two: message and block. Ordered by how often they
            are wanted, with the destructive one last and `ghost` so a misclick lands on the
            harmless one. */}
        {profile.id != null && <MessageUserButton userId={profile.id} className="shrink-0" />}

        {profile.id != null && (
          <BlockUserButton
            userId={profile.id}
            name={profile.fullName?.trim() || username}
            className="shrink-0"
          />
        )}
      </Card>

      {/* Both sections take the ID resolved above, not the handle. `ReputationCard` is the
          read-only twin of `MyReputationCard`; `MySkillsCard` needs no "my" variant because the
          backend already decides what a viewer may see — a stranger gets VERIFIED rows only. */}
      {profile.id != null && (
        <>
          {/**
           * NO `<h2>` OVER THE REPUTATION CARD — it printed "Elite Score" twice, once as this
           * page's section heading and once as the card's own `<h3>`. `/profile` never had the
           * duplicate because it renders the card bare; this page added a heading to a component
           * that already names itself.
           *
           * `readOnly` fixes a sentence that was not merely impersonal but wrong: the card's
           * subtitle said the score came from "**your** contributions" while showing somebody
           * else's number.
           */}
          <ReputationCard userId={profile.id} readOnly />

          <section className="flex flex-col gap-3">
            <h2 className="text-nx-title-sm text-nx-text-primary">
              {t('publicProfile.skillsTitle')}
            </h2>
            {/* `readOnly` only changes the empty state, which told the reader to claim a skill
                from a roadmap — an action they cannot take on another person's behalf. */}
            <MySkillsCard userId={profile.id} readOnly />
          </section>

          {/**
           * GITHUB, READ-ONLY. `GET /github/stats/{userId}` takes ANY user id and was called from
           * `/profile` only — so the endpoint that carries the most direct evidence a developer
           * has (repos, followers, a year of contributions) was visible to exactly one person:
           * its owner. On a product whose argument is that reputation comes from work, that is
           * the wrong audience.
           *
           * `readOnly` is not decoration. `POST /github/sync` and `DELETE /github/unlink` take no
           * user id and act on the CALLER, so the card's two buttons under a stranger's name
           * would unlink the viewer's own account.
           */}
          <section className="flex flex-col gap-3">
            <h2 className="text-nx-title-sm text-nx-text-primary">{t('github.title')}</h2>
            <GithubStatsCard userId={profile.id} readOnly />
          </section>

          {/**
           * BOOKS, SAME STORY AS GITHUB. `GET /books/author/{authorId}` takes any author id and
           * was called only from `/library`'s "written by me" tab, so the shelf a person built
           * was visible to nobody but them — on a profile that is meant to be the public record
           * of what someone has produced.
           *
           * `readOnly` drops the per-row delete. It is author-only server-side, so it would 403
           * rather than destroy anything, but a button that always fails is still a lie.
           */}
          <section className="flex flex-col gap-3">
            <h2 className="text-nx-title-sm text-nx-text-primary">
              {t('profile.books.titleOther')}
            </h2>
            <MyBooksList authorId={profile.id} readOnly />
          </section>

          {/* THE HALF THIS PAGE WAS MISSING. `GET /users/{userId}/posts` had no caller anywhere in
              the app, so a profile could say what an account SCORES and what it has had VERIFIED,
              and show nothing it had actually written — on a product whose argument is that
              reputation comes from work, that is the wrong half. Last, because it is the longest
              section and everything above it is a summary. */}
          <section className="flex flex-col gap-3">
            <h2 className="text-nx-title-sm text-nx-text-primary">
              {t('publicProfile.postsTitle')}
            </h2>
            <UserPosts userId={profile.id} />
          </section>
        </>
      )}
    </div>
  );
}
