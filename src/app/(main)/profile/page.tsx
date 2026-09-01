'use client';

import { Suspense } from 'react';
import { Card, Tabs } from '@/shared/components';
import { useTabParam } from '@/shared/lib/use-tab-param';
import { RepScore, useReputation } from '@/features/reputation';
import { ProfileIdentityCard, useMyProfile } from '@/features/security';
import { usePendingRequests } from '@/features/friendships';
import { useT } from '@/core/i18n';
import { AccountPanel } from './account-panel';
import { OverviewPanel } from './overview-panel';
import { ProfessionalPanel } from './professional-panel';

/**
 * `/profile` — assembled at P3.2, and it ABSORBED `/dashboard` at P5.2. Owning domain: `security`.
 *
 * WHY THE MERGE. The two routes were the same page wearing different names: both opened by
 * claiming to be the home of the signed-in account. `/dashboard` had a greeting, a friend count
 * and incoming requests; `/profile` had identity, Elite Score, professional profile, GitHub and
 * credentials. No boundary existed that a person could predict, so every visit started with
 * "which one has the thing I want". One page, one answer.
 *
 * ONE PAGE IS NOT ONE COLUMN, WHICH IS WHAT THE MERGE LEFT BEHIND. Everything the two routes had
 * ended up stacked: title, identity, Elite Score, two stat tiles, incoming requests, the
 * professional form, skills, GitHub, violations, the block list, the name form, the password form
 * — ten blocks down a 672 measure, and the two things a person visits this page to DO (change a
 * name, change a password) sat at the very bottom of it. The length was never the symptom of a
 * page holding too much; it was the symptom of a page refusing to say what belongs with what.
 *
 * SO: A HERO AND THREE TABS. The hero is who you are and is always on screen — name, handle,
 * email, avatar, and the Elite Score chip beside the name, which is where `/u/{username}` has
 * always put it. The three tabs are the three questions the rest of the page answers:
 *
 * | tab | what it holds | why together |
 * | --- | --- | --- |
 * | Tổng quan | Elite Score progress, friend counts, incoming requests | what the app makes of you, and the one thing here that is waiting on you |
 * | Chuyên môn | professional profile, verified skills, GitHub | ordered by how hard the claim is to make: what you say you do → what the app has verified → what your code shows |
 * | Tài khoản | name, password, violations, blocked people | the account as an object you administer, including the two decisions made *about* it |
 *
 * THE PAGE TITLE IS GONE, and it is the second thing the restructure removed. `<h1>Trang cá
 * nhân</h1>` repeated the rail's active item, and its subtitle ("Quản lý cài đặt tài khoản của
 * bạn") described what is now one tab of three. `ProfileIdentityCard` carries the `<h1>` instead:
 * on a page about one person, that person's name is the title. The browser-tab title is unchanged
 * — it lives in `layout.tsx` and never depended on this heading.
 *
 * THE TAB LIVES IN THE URL (`?tab=professional`), because two places link here for one section:
 * `/knowledge` sends people to the professional form, and the GitHub OAuth callback lands here
 * after linking an account. A default-tab landing would have made both links miss what they
 * promised. Written with `history.replaceState` rather than `router.replace`: switching a tab
 * swaps an already-mounted panel and must not cost an RSC round trip, and it must not push a
 * history entry either — Back belongs to the page you came from, not to the tab you left.
 *
 * WHAT THE MERGE DROPPED, deliberately, and what the tabs did not bring back:
 *  - THE GREETING. "Chào mừng trở lại, X" sat directly above an identity card showing the same
 *    name and face. Saying it twice is not warmth, it is noise.
 *  - FRIEND SUGGESTIONS. They were on the dashboard, and they are about *other* people — this page
 *    is about you. They live one click away on the friends tabs, which is where someone who wants
 *    to grow their network is already heading.
 * Incoming requests stayed, because they are addressed to you and are actionable where they sit —
 * and their count now rides on the `Tổng quan` tab itself, so a hidden panel can still say that
 * something is waiting.
 *
 * SEVEN DOMAINS, and the tabs moved no boundary: `security` owns the shell and everything that is
 * literally the account; `reputation`, `friendships`, `knowledge`, `roadmap`, `moderation`,
 * `blocks` and `github` each contribute through their barrels — no domain reaches into another's
 * internals and this page mediates nothing between them.
 *
 * THE BOOKS SECTION LEFT THIS PAGE at M2. It used to sit here on the argument that "what you have
 * published is another thing your account *is*" — true, but the kit puts an author's shelf in
 * `/library` beside the catalogue, and a shelf next to other shelves beats a shelf filed under
 * account settings. Same component, same endpoint, one home: `/library`'s `Sách tôi viết` tab.
 * Moved rather than duplicated, so there is still exactly one place a book can be deleted from.
 *
 * THIS FILE IS THE SHELL AND NOTHING ELSE — hero, tab strip, which panel is open. It used to be
 * 350 lines because the three panels and a private `Section` helper lived in it too, so the one
 * question this file answers ("what is on this route, and which part of it is showing?") was
 * buried under the answer to three others. The panels are `./overview-panel`, `./professional-panel`
 * and `./account-panel`; `Section` graduated to `@/shared/components` once `/u/[username]` turned
 * out to need the same thing four times over.
 */
const TAB_IDS = ['overview', 'professional', 'account'] as const;
type TabId = (typeof TAB_IDS)[number];

export default function ProfilePage() {
  // `useSearchParams` needs a Suspense boundary in the App Router — same shape as `/search`.
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const t = useT();
  const { data: profile } = useMyProfile();
  /**
   * The same query `MyReputationCard` runs one tab down, so this costs no second request — React
   * Query dedupes on the key and the card reads the entry this call filled. The ROUTE resolves it
   * rather than the identity card, because `features/reputation` already imports
   * `features/security` and the reverse edge would close a cycle between two barrels.
   */
  const { data: reputation } = useReputation(profile?.id);
  /**
   * THE ONE PANEL QUERY THAT STILL RUNS WHILE ITS PANEL IS CLOSED, and it earns it: the count on
   * the `Tổng quan` tab is how a collapsed panel says somebody is waiting on you. Everything else
   * a panel needs is fetched by the panel, which is the point of the split.
   */
  const { data: pendingRequests } = usePendingRequests();

  // Was fifteen lines of `useSearchParams` + `useState` + `history.replaceState` here, duplicated
  // almost verbatim on `/u/[username]` and simply absent on the three pages that needed it too.
  // The hook's own header carries the reasoning that used to live in this comment.
  const [tab, onTabChange] = useTabParam<TabId>(TAB_IDS, 'overview');

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <ProfileIdentityCard
        badge={
          reputation && (
            <RepScore
              score={reputation.eliteScore}
              showLevel={Boolean(reputation.levelName)}
              levelName={reputation.levelName}
            />
          )
        }
      />

      {/* TABS BIND DOWN TO THE PANEL THEY NAME. This wrapper is the whole of that rule: the strip
          used to be a plain child of the page's `gap-section` column, so it sat 40 below the
          identity card and 40 above the panel — equidistant from the thing it belongs to and the
          thing it does not, which reads as a control floating between two sections rather than as
          the label of the one underneath. 16 down, 40 up, and the group is unambiguous. */}
      <div className="flex flex-col gap-[var(--nx-space-group)]">
        {/* THE WHITE CARD IS `/newsfeed`'s OWN GROUND, carried here — `Tabs` paints no fill of
            its own, see its header. `padding "0 10px"` matches the `p-2.5` `/newsfeed`'s
            `StickyBlock` row spends around the same strip. */}
        <Card padding="0 10px" className="flex">
          <Tabs
            aria-label={t('profile.title')}
            active={tab}
            onChange={onTabChange}
            className="flex-1"
            tabs={[
              {
                id: 'overview',
                label: t('profile.tabs.overview'),
                // `|| undefined` rather than the raw length: `Tabs` prints any number it is
                // handed, and a "0" pill beside a tab is a notification that nothing happened.
                count: pendingRequests?.length || undefined,
              },
              { id: 'professional', label: t('profile.tabs.professional') },
              { id: 'account', label: t('profile.tabs.account') },
            ]}
          />
        </Card>

        {/* THREE COMPONENTS RATHER THAN THREE BLOCKS OF JSX, so that a closed panel is UNMOUNTED
            and its queries never fire. The page used to ask for everything on every visit —
            reputation, friends, pending requests, the professional profile, roadmap progress,
            GitHub stats, violations, the block list — to fill three screens nobody had scrolled
            to. Inline `{tab === … && <div>…}` would have rendered the same thing but kept every
            `use*` call at the top of this function, where React runs it regardless of which
            branch is taken. */}
        {tab === 'overview' && <OverviewPanel />}
        {tab === 'professional' && <ProfessionalPanel userId={profile?.id} />}
        {tab === 'account' && <AccountPanel />}
      </div>
    </div>
  );
}
