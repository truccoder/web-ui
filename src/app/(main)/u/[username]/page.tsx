'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  EmptyState,
  ProfileHero,
  Section,
  Skeleton,
  Tabs,
} from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { formatMonthYear, useIntlLocale } from '@/shared/lib/format';
import { BlockUserButton } from '@/features/blocks';
import { MessageUserButton } from '@/features/chat';
import { FriendActionButton } from '@/features/friendships';
import { MyBooksList } from '@/features/bookstore';
import { GithubStatsCard } from '@/features/github';
import { UserPosts } from '@/features/newsfeed';
import { MySkillsCard } from '@/features/roadmap';
import { ReputationCard, RepScore } from '@/features/reputation';
import { useRoleLine } from '@/features/knowledge';
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
  const username = params?.username ?? '';

  const { data: profile, isPending, isError } = usePublicProfile(username);
  const localeTag = useIntlLocale();

  /**
   * The role line, composed by the domain that owns the enum labels and shared with `/profile`'s
   * hero so the "title, else role, then level" rule has exactly one definition. B21 is what gave
   * this route the three fields to feed it — they arrive on `PublicProfileResponse` now.
   *
   * ABOVE THE TWO EARLY RETURNS BECAUSE IT IS A HOOK, hence the optional chaining: `profile` is
   * undefined while the query is in flight and when the handle does not exist, and calling this
   * after the guards would make the hook order depend on the request. It answers the empty string
   * for an absent profile, which is the same answer it gives for one that never filled the form in.
   */
  const roleLine = useRoleLine({
    jobTitle: profile?.jobTitle,
    primaryRole: profile?.primaryRole,
    seniorityLevel: profile?.seniorityLevel,
  });

  // The hook rebuilds the path from `usePathname`, so it writes `/u/<handle>` without being told
  // the handle — the hand-rolled version here interpolated `username` into a template and would
  // have silently rewritten the URL to the RAW param if the route ever normalised the handle.
  const [tab, onTabChange] = useTabParam<TabId>(TAB_IDS, 'overview');

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

  /**
   * The hero's meta line, and BOTH HALVES COME OUT OF THE PROFILE PAYLOAD — no second request for
   * either. `createdAt` and `verifiedSkills` are on `PublicProfileResponse` already; the backend's
   * own note calls the skill list "the summary strip", which is exactly the weight it is given
   * here — a count, not the names. The names are the section below, with their tiers and dates.
   *
   * BUILT AS A FILTERED JOIN rather than a chain of `&&` in the JSX, because either half can be
   * missing and the `·` between them must not survive on its own. A profile with no verified skill
   * gets one fact and no separator; a payload with neither renders no line at all.
   */
  const joined = formatMonthYear(profile.createdAt ?? undefined, localeTag);
  const verifiedCount = profile.verifiedSkills?.length ?? 0;
  const meta = [
    joined && t('profile.hero.joined', { date: joined }),
    verifiedCount > 0 && t('profile.hero.verifiedSkills', { count: verifiedCount }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      {/* THE SAME HERO `/profile` OPENS WITH, which it was a near-copy of until the two were
          merged: card, 96 avatar, the name as this page's `<h1>`, the handle, the score chip
          beside the name. `ProfileHero` carries the record of where the two copies had drifted
          apart and which side of each disagreement won. */}
      <ProfileHero
        name={profile.fullName?.trim() || username}
        username={profile.username}
        avatarUrl={profile.profilePictureUrl}
        coverUrl={profile.coverImageUrl}
        /* B21 CLOSED THE GAP THIS SLOT WAS LEFT EMPTY FOR. The note that stood here said a
           stranger's job title was not fetchable at all — `GET /v1/api/profile/professional`
           resolves the caller with `SecurityUtils.getCurrentUserId()` and has no by-id form — so
           this hero rendered one line shorter than `/profile`'s. The backend put four fields on
           `PublicProfileResponse` instead of opening that endpoint, which is the right half of the
           trade: `workHistory`, `interestedDomains` and `knownTechStack` stay owner-only, and the
           backend has a test asserting they do not leak.

           `useRoleLine` IS THE SAME COMPOSITION `/profile` USES, not a second copy — it takes the
           three fields rather than either payload's DTO for exactly this reason. */
        subtitle={roleLine || undefined}
        meta={meta || undefined}
        badge={
          profile.eliteScore != null && (
            <RepScore
              score={profile.eliteScore}
              showLevel={profile.levelName != null}
              levelName={profile.levelName ?? undefined}
            />
          )
        }
        /* THE ONLY ACTIONS ON THIS PAGE, and they are in the hero rather than in a menu because
           there is nothing else to put in one. `blocks` shipped in the same backend batch as this
           route and had no surface at all until now — the product could block and could not be
           asked to. `FriendActionButton` closes the other half of that same gap: the page could
           already message and block a stranger but never actually befriend one — the only place
           that offered "Kết bạn" was `/friends/suggestions`, and only for people the ranking
           surfaced on its own. They stay OUT of the tabs deliberately: an action about this person
           must not be reachable only from one of three panels.

           Ordered by how often they are wanted, with the destructive one last and `ghost` so a
           misclick lands on the harmless one.

           ALL THREE ACTIONS ARE RELATIONSHIPS, and a guest is not one end of one: friending and
           messaging both open a connection between two accounts, blocking records an edge from
           yours. None has a read-only form to show, so for a signed-out reader the row is replaced
           by the one thing that would make them available. */
        actions={
          isGuest ? (
            <Link href={registerHref}>
              <Button variant="secondary">{t('guest.profile.join')}</Button>
            </Link>
          ) : (
            profile.id != null && (
              <>
                <FriendActionButton userId={profile.id} />
                <MessageUserButton userId={profile.id} />
                <BlockUserButton userId={profile.id} name={profile.fullName?.trim() || username} />
              </>
            )
          )
        }
      />

      {/* EVERY SECTION BELOW TAKES THE ID RESOLVED ABOVE, not the handle — and every one of them
          is gated on it, which is why the tabs live inside this guard rather than around it: a
          tab strip over three panels that can none of them render is a control for nothing. */}
      {profile.id != null && (
        // Tabs bind DOWN to the panel they name — 16 to the content, the page's own 40 to the hero
        // above. This was a bare fragment, so the strip inherited the canvas's `gap-section` on
        // both sides and sat equidistant from the identity card and the panel it labels.
        <div className="flex flex-col gap-[var(--nx-space-group)]">
          {/* THE WHITE CARD IS `/newsfeed`'s OWN GROUND, carried here — `Tabs` paints no fill of
              its own, see its header. `padding "0 10px"` matches the `p-2.5` `/newsfeed`'s
              `StickyBlock` row spends around the same strip. */}
          <Card padding="0 10px" className="flex">
            <Tabs
              aria-label={profile.fullName?.trim() || username}
              active={tab}
              onChange={onTabChange}
              className="flex-1"
              tabs={[
                { id: 'overview', label: t('publicProfile.tabs.overview') },
                { id: 'work', label: t('publicProfile.tabs.work') },
                { id: 'posts', label: t('publicProfile.tabs.posts') },
              ]}
            />
          </Card>

          {tab === 'overview' && (
            <div className="flex flex-col gap-[var(--nx-space-section)]">
              {/**
               * THE REPUTATION CARD TAKES AN `<h2>` LIKE ITS NEIGHBOURS NOW. It could not before:
               * the card printed its own `Elite Score` heading, so labelling the section printed
               * the words twice twenty pixels apart, and the workaround — leaving this one section
               * unlabelled — is why the panel's outline used to run `<h1>` → `<h3>` → `<h2>`. The
               * card is headless now; `Section` carries the whole account.
               *
               * `descOther` rather than `desc` fixes a sentence that was not merely impersonal but
               * wrong: it said the score came from "**your** contributions" while showing somebody
               * else's number. It used to be the card's `readOnly` prop, whose only job this was.
               */}
              <Section title={t('reputation.title')} description={t('reputation.descOther')}>
                <ReputationCard userId={profile.id} />
              </Section>

              <Section title={t('publicProfile.skillsTitle')}>
                {/* `MySkillsCard` needs no "my" variant because the backend already decides what
                    a viewer may see — a stranger gets VERIFIED rows only. `readOnly` changes only
                    the empty state, which told the reader to claim a skill from a roadmap, an
                    action they cannot take on another person's behalf. */}
                <MySkillsCard userId={profile.id} readOnly />
              </Section>
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
              <Section title={t('github.title')}>
                <GithubStatsCard userId={profile.id} readOnly />
              </Section>

              {/**
               * BOOKS, SAME STORY AS GITHUB. `GET /books/author/{authorId}` takes any author id
               * and was called only from `/library`'s "written by me" tab, so the shelf a person
               * built was visible to nobody but them — on a profile that is meant to be the public
               * record of what someone has produced.
               *
               * `readOnly` drops the per-row delete. It is author-only server-side, so it would
               * 403 rather than destroy anything, but a button that always fails is still a lie.
               */}
              <Section title={t('profile.books.titleOther')}>
                <MyBooksList authorId={profile.id} readOnly />
              </Section>
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
        </div>
      )}
    </div>
  );
}
