'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, Button, Card, EmptyState, Skeleton, Tabs } from '@/shared/components';
import { BlockUserButton } from '@/features/blocks';
import { MessageUserButton } from '@/features/chat';
import { MyBooksList } from '@/features/bookstore';
import { GithubStatsCard } from '@/features/github';
import { UserPosts } from '@/features/newsfeed';
import { MySkillsCard } from '@/features/roadmap';
import { ReputationCard, RepScore } from '@/features/reputation';
import { useAuthHref, useIsGuest, usePublicProfile } from '@/features/security';
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
 * form, incoming requests — things you *do*. This page is the account as other people can see it:
 * who they are, what the app scores them at, what they have had verified, what they have made.
 * Nothing here is actionable beyond the two relationship buttons, and nothing here is private.
 *
 * A HERO AND THREE TABS, the same restructure `/profile` took and for the same reason: five
 * sections stacked down a 672 measure put the thing a visitor came for — what this person has
 * actually written — at the bottom of four screens. The tabs are NOT the three `/profile` has,
 * because the questions are different: there is no account here to administer, and "what has this
 * person made" deserves a tab rather than a third of one.
 *
 * | tab | what it holds |
 * | --- | --- |
 * | Tổng quan | Elite Score with its progress, and the skills an admin has verified |
 * | Công trình | GitHub stats and published books — the work that exists outside this product |
 * | Bài viết | what they have written inside it |
 *
 * `Tổng quan` IS THE DEFAULT because it is the summary, and because a stranger following a shared
 * link needs to know who this is before they need to know what they wrote.
 *
 * THE TAB IS IN THE URL (`?tab=posts`) for the reason this whole route exists: the page is the
 * thing that gets SHARED, and "look at what they wrote" should survive being pasted into a chat.
 * `history.replaceState` rather than `router.replace` — swapping a mounted panel must not cost an
 * RSC round trip, and Back belongs to wherever the reader came from.
 */
const TAB_IDS = ['overview', 'work', 'posts'] as const;
type TabId = (typeof TAB_IDS)[number];

const isTabId = (value: string | null): value is TabId =>
  value !== null && (TAB_IDS as readonly string[]).includes(value);

export default function PublicProfilePage() {
  // `useSearchParams` needs a Suspense boundary in the App Router — same shape as `/search`.
  return (
    <Suspense>
      <PublicProfileContent />
    </Suspense>
  );
}

function PublicProfileContent() {
  const t = useT();
  const params = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const username = params?.username ?? '';

  const { data: profile, isPending, isError } = usePublicProfile(username);

  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<TabId>(isTabId(initialTab) ? initialTab : 'overview');

  const onTabChange = (next: string) => {
    if (!isTabId(next)) return;
    setTab(next);
    window.history.replaceState(
      null,
      '',
      next === 'overview' ? `/u/${username}` : `/u/${username}?tab=${next}`
    );
  };

  /**
   * THIS PAGE IS THE REASON THE GUEST SURFACE EXISTS. A link to a developer's profile is what
   * gets shared, and until now it answered a redirect to `/login` — the stranger it was sent to
   * saw a sign-in form instead of the person. Everything above the actions is public on the
   * backend (`profile`, `posts`, `reputation`, `roadmap-progress`, `github/stats`,
   * `books/author`), so the page renders whole.
   */
  const isGuest = useIsGuest();
  const registerHref = useAuthHref('/register');

  // The level used to need a second request: `PublicUserResponse` carried the score without the
  // name, and the design system forbids deriving one from the other. B2 gave this endpoint its own
  // DTO, so `levelName` arrives with the profile and the extra round trip is gone.

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
        {/* `inset` for the same reason as `/profile`'s hero — see the prop's note on `Avatar`. */}
        <Avatar
          src={profile.profilePictureUrl ?? undefined}
          name={profile.fullName ?? undefined}
          size="xl"
          inset
        />
        <div className="min-w-0 flex-1">
          {/* The score sits BESIDE THE NAME, as the kit's profile hero does — reputation is the
              product's central claim, so it is part of the identity line rather than a fact you
              scroll to. `ReputationCard` in the first tab still owns the progress to the next
              level; this is the readout, that is the apparatus. */}
          <div className="flex flex-wrap items-center gap-[var(--nx-space-tight)]">
            <h1 className="truncate text-nx-title font-semibold tracking-tight text-nx-text-primary">
              {profile.fullName?.trim() || username}
            </h1>
            {profile.eliteScore != null && (
              <RepScore
                score={profile.eliteScore}
                showLevel={profile.levelName != null}
                levelName={profile.levelName ?? undefined}
              />
            )}
          </div>
          {profile.username && (
            <p className="truncate font-mono text-nx-body-sm text-nx-text-muted">
              @{profile.username}
            </p>
          )}
        </div>

        {/* THE ONLY ACTIONS ON THIS PAGE, and they are in the hero rather than in a menu because
            there is nothing else to put in one. `blocks` shipped in the same backend batch as this
            route and had no surface at all until now — the product could block and could not be
            asked to. They stay OUT of the tabs deliberately: an action about this person must not
            be reachable only from one of three panels. */}
        {/* Ordered by how often they are wanted, with the destructive one last and `ghost` so a
            misclick lands on the harmless one. */}
        {/* BOTH ACTIONS ARE RELATIONSHIPS, and a guest is not one end of one: messaging opens a
            conversation between two accounts, blocking records an edge from yours. Neither has a
            read-only form to show, so for a signed-out reader the pair is replaced by the one
            thing that would make them available. */}
        {isGuest ? (
          <Link href={registerHref} className="shrink-0">
            <Button variant="secondary">{t('guest.profile.join')}</Button>
          </Link>
        ) : (
          profile.id != null && (
            <>
              <MessageUserButton userId={profile.id} className="shrink-0" />
              <BlockUserButton
                userId={profile.id}
                name={profile.fullName?.trim() || username}
                className="shrink-0"
              />
            </>
          )
        )}
      </Card>

      {/* EVERY SECTION BELOW TAKES THE ID RESOLVED ABOVE, not the handle — and every one of them
          is gated on it, which is why the tabs live inside this guard rather than around it: a
          tab strip over three panels that can none of them render is a control for nothing. */}
      {profile.id != null && (
        <>
          <Tabs
            aria-label={profile.fullName?.trim() || username}
            active={tab}
            onChange={onTabChange}
            tabs={[
              { id: 'overview', label: t('publicProfile.tabs.overview') },
              { id: 'work', label: t('publicProfile.tabs.work') },
              { id: 'posts', label: t('publicProfile.tabs.posts') },
            ]}
          />

          {tab === 'overview' && (
            <div className="flex flex-col gap-[var(--nx-space-section)]">
              {/**
               * NO `<h2>` OVER THE REPUTATION CARD — it printed "Elite Score" twice, once as this
               * page's section heading and once as the card's own `<h3>`. `/profile` never had the
               * duplicate because it renders the card bare; this page added a heading to a
               * component that already names itself.
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
                {/* `MySkillsCard` needs no "my" variant because the backend already decides what
                    a viewer may see — a stranger gets VERIFIED rows only. `readOnly` changes only
                    the empty state, which told the reader to claim a skill from a roadmap, an
                    action they cannot take on another person's behalf. */}
                <MySkillsCard userId={profile.id} readOnly />
              </section>
            </div>
          )}

          {tab === 'work' && (
            <div className="flex flex-col gap-[var(--nx-space-section)]">
              {/**
               * GITHUB, READ-ONLY. `GET /github/stats/{userId}` takes ANY user id and was called
               * from `/profile` only — so the endpoint that carries the most direct evidence a
               * developer has (repos, followers, a year of contributions) was visible to exactly
               * one person: its owner. On a product whose argument is that reputation comes from
               * work, that is the wrong audience.
               *
               * `readOnly` is not decoration. `POST /github/sync` and `DELETE /github/unlink` take
               * no user id and act on the CALLER, so the card's two buttons under a stranger's
               * name would unlink the viewer's own account.
               */}
              <section className="flex flex-col gap-3">
                <h2 className="text-nx-title-sm text-nx-text-primary">{t('github.title')}</h2>
                <GithubStatsCard userId={profile.id} readOnly />
              </section>

              {/**
               * BOOKS, SAME STORY AS GITHUB. `GET /books/author/{authorId}` takes any author id
               * and was called only from `/library`'s "written by me" tab, so the shelf a person
               * built was visible to nobody but them — on a profile that is meant to be the public
               * record of what someone has produced.
               *
               * `readOnly` drops the per-row delete. It is author-only server-side, so it would
               * 403 rather than destroy anything, but a button that always fails is still a lie.
               */}
              <section className="flex flex-col gap-3">
                <h2 className="text-nx-title-sm text-nx-text-primary">
                  {t('profile.books.titleOther')}
                </h2>
                <MyBooksList authorId={profile.id} readOnly />
              </section>
            </div>
          )}

          {/* THE HALF THIS PAGE WAS MISSING. `GET /users/{userId}/posts` had no caller anywhere in
              the app, so a profile could say what an account SCORES and what it has had VERIFIED,
              and show nothing it had actually written — on a product whose argument is that
              reputation comes from work, that is the wrong half.
              NO `<h2>` HERE: the tab is already called `Bài viết`, and `publicProfile.postsTitle`
              would print the same word twice, twenty pixels apart. The key stays in the bundle
              because `UserPosts` reads its sibling error and empty strings. */}
          {tab === 'posts' && <UserPosts userId={profile.id} />}
        </>
      )}
    </div>
  );
}
