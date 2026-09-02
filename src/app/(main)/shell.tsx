'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Briefcase,
  Globe,
  Lock,
  LogOut,
  MessageCircle,
  Menu as MenuIcon,
  Newspaper,
  Route as RouteIcon,
  Search,
  Settings,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import {
  Avatar,
  BrandMark,
  Button,
  CommandPalette,
  Drawer,
  IconButton,
  Menu,
  type CommandAction,
} from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { ChatClientProvider } from '@/features/chat';
import { usePendingRequests } from '@/features/friendships';
import { NotificationBell } from '@/features/notifications';
// Imported from the module rather than the barrel: the barrel's members were being
// split into a chunk this route never loaded, so the hook silently never ran.
import { useNotificationStream } from '@/features/notifications/hooks/use-notification-stream';
import { clearFeedScroll } from '@/features/newsfeed';
import { AccountBanBanner } from '@/features/moderation';
import { ProfileRequiredRedirect } from '@/features/knowledge';
import { SearchBar } from '@/features/search';
import { Ledger, GuestLedger } from './ledger';
import {
  AuthRequiredPrompt,
  SessionExpiredPrompt,
  setRoleCookie,
  useAuthHref,
  useIsGuest,
  useLogout,
  useMyProfile,
} from '@/features/security';
import { useI18n, useT } from '@/core/i18n';

/**
 * The app shell — assembled at P3.4. Owning domain: none; this is `shared` chrome.
 *
 * IT COMPOSES, IT DOES NOT IMPLEMENT. Every piece with domain knowledge arrives through a feature
 * barrel: the bell from `features/notifications`, the search field from `features/search`, the
 * pending-request count from `features/friendships`, identity and sign-out from
 * `features/security`. Everything else here is layout and a list of routes, which is the one thing
 * a shell is allowed to know that nothing else does.
 *
 * THE ROUTE LIST LIVES HERE RATHER THAN IN A FEATURE, deliberately. It names every domain in the
 * app, so any feature holding it would depend on all the others — the cross-domain bucket
 * CLAUDE.md §4 exists to prevent. The palette that renders it (`shared/CommandPalette`) knows
 * nothing about routes; it takes actions and runs them.
 *
 * WHAT REPLACED WHAT, since almost every line changed:
 *  - shadcn `Avatar`/`Separator`/`DropdownMenu`/`Sheet` → `shared/components`
 *    `Avatar`/`Menu`/`Drawer` plus plain borders. `src/components/ui/` is gone at this checkpoint.
 *  - the invented blue-to-indigo gradient logo → `BrandMark`, the DS's actual mark.
 *  - `lib/hooks/use-user` + `lib/hooks/use-friendship` → `features/security` +
 *    `features/friendships`. Those two legacy modules had no other consumer left and are deleted
 *    here, which is what P2.2d's table predicted.
 *  - eleven near-identical hand-written `<Link className={cn(...)}>` blocks → one data array
 *    rendered by one `NavLink`. The duplication was not just styling: each copy carried its own
 *    active-state expression, and `/chats` had drifted into `pathname === '/chats' ||
 *    pathname.startsWith('/chats')` — the second half subsuming the first. (P5.1 later grouped
 *    that array; see `NAV_GROUPS`.)
 *
 * THE REACT WARNING TRACKED IN `findings/shared.md` IS ADDRESSED HERE. "Can't perform a React
 * state update on a component that hasn't mounted yet" fired on every `(main)` page, including
 * ones no Phase 3 checkpoint had touched, so it came from this shared shell. The prime suspect was
 * the old `NavLinks`, which seeded a collapsible group from the pathname with
 * `useState(isFriendsActive)` — render-time state derived from a value that changes on every
 * navigation. The rebuilt nav has no collapsible and no derived state at all: the three friends
 * routes are three ordinary rows. This is the "rebuild the shell with the warning in view rather
 * than patch it" the finding asked for; confirm it is gone when the browser extension is back.
 */

/**
 * WHAT THE BRAND MARK DOES WHEN YOU ARE ALREADY HOME.
 *
 * It is an `<a href="/newsfeed">` in both places it appears — the top bar and the mobile Drawer —
 * and pressing a link to the page you are on is, to the router, nothing to do. So a reader deep in
 * `Bài viết` who pressed the one control that means "take me back to the start" stayed exactly
 * where they were. Reported alongside the reload case, and it is the same underlying position:
 * the feed's own saved scroll (see `clearFeedScroll`).
 *
 * SO THE MARK CLEARS THAT POSITION FIRST, ALWAYS — from any page. Leaving it behind would mean
 * pressing home from `/chats` opened the feed halfway down a column, which is the same complaint
 * one navigation later.
 *
 * AND WHEN THE PATH IS ALREADY `/newsfeed` IT SCROLLS ITSELF, because there is no navigation to
 * scroll for it. The href is left to do the rest: a reader on `?tab=posts&hashtag=kafka` is on a
 * different URL, so the ordinary link navigation runs, drops both parameters and lands them on the
 * feed's default column — the address the mark points at.
 */
function useBrandHome() {
  const pathname = usePathname();

  return () => {
    clearFeedScroll();
    // Only the same-URL case needs help; anything else is a real navigation, and the App Router
    // already scrolls a forward navigation to the top.
    if (pathname === '/newsfeed') window.scrollTo(0, 0);
  };
}

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  /** Extra words the palette should match on, beyond the label. */
  keywords?: string;
  /** Rows that carry the pending-friend-request count. */
  badge?: 'pendingRequests';
  /**
   * Stay highlighted for every path under this prefix, not just an exact match. Only `/friends`
   * needs it: one row now stands for three tabbed routes.
   */
  matchPrefix?: string;
}

/**
 * NAV IS GROUPED, NOT FLAT — restructured at P5.1.
 *
 * It used to be ten rows of equal weight with no headings, which is what "điều hướng rối" meant:
 * ten peers give the eye nothing to grab. They are now three groups of two to three, labelled by
 * WHAT THE PERSON IS DOING rather than by module name — a reader looking for the roadmap is
 * thinking "I want to grow", not "I want the roadmap domain".
 *
 * TWO ROWS DISAPPEARED WITHOUT LOSING A SURFACE:
 *  - The three `/friends/*` rows became one row plus a tab strip in `friends/layout.tsx`. All three
 *    URLs still work; the pending count moved onto that tab, so nothing worth glancing at was lost.
 *  - `/dashboard` was absorbed into `/profile` at P5.2 — the two were the same page wearing
 *    different names (both claimed to be "home of the signed-in account").
 *
 * NO `/admin/*` ENTRY HERE, AND THAT IS NOT AN OVERSIGHT. The middleware redirects every `ADMIN`
 * session out of `(main)` entirely, so this nav only ever renders for someone who could not use an
 * admin link. The admin surfaces are reached from the `(admin)` header instead.
 */
interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

/**
 * TWO GROUPS, NOT THREE — the round-14 rail (`handoff/density-r14.md` §1).
 *
 * The product has two halves: OTHER PEOPLE and YOU. `Bảng tin` · `Bạn bè` · `Chats` are all other
 * people; `Lộ trình` · `Kho lưu trữ` are all you. That is a cleaner split than the three groups it
 * replaces (`Dòng chảy` / `Phát triển` / `Mạng lưới`), and it dissolved `Dòng chảy` entirely —
 * with `Bảng tin` moved into the community half that group had no members left.
 *
 * WHY `Cộng đồng` AND NOT `Mạng lưới`: the feed spans every post in the product (`Bài viết`) plus
 * the crawler's whole stream (`Công nghệ`), not just people you know. `Mạng lưới` names the friend
 * edge and nothing else, so filing the feed under it would say the feed is your friends — which
 * the product explicitly says it is not. `Cộng đồng` says the wider thing, and it is the honest
 * complement to `Phát triển`: outward, then inward.
 *
 * `/trending` IS NOT IN THE RAIL, AND IS NOT A DESTINATION ANY MORE EITHER. R4 retired the
 * separate page; the crawler's content is now `/newsfeed`'s `Công nghệ` tab (the feed's default),
 * with the ledger's `Từ bên ngoài` section as a guest-only echo, and the route redirects there.
 * The palette entry below points at the tab, which is the only place the content lives.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groupCommunity',
    items: [
      {
        href: '/newsfeed',
        labelKey: 'nav.newsfeed',
        icon: Newspaper,
        keywords: 'feed home bai viet',
      },
      // Points at `/friends/all`, but stays highlighted across every `/friends/*` tab — see
      // `isActive` below. One row, three surfaces.
      {
        href: '/friends/all',
        labelKey: 'nav.friends',
        icon: Users,
        keywords: 'ban be loi moi goi y',
        badge: 'pendingRequests',
        matchPrefix: '/friends',
      },
      { href: '/chats', labelKey: 'nav.chats', icon: MessageCircle, keywords: 'tin nhan message' },
      /**
       * `/projects` JOINS THE COMMUNITY GROUP RATHER THAN `Phát triển`, and the split the group
       * names decides it: `Cộng đồng` is other people, `Phát triển` is you. A project board is
       * entirely about finding other people to build with — the fact that it also grows your
       * experience is true of the feed too.
       */
      {
        href: '/projects',
        labelKey: 'nav.projects',
        icon: Briefcase,
        keywords: 'du an tuyen team project',
      },
    ],
  },
  {
    labelKey: 'nav.groupGrowth',
    items: [
      { href: '/roadmap', labelKey: 'nav.roadmap', icon: RouteIcon, keywords: 'lo trinh skill' },
      {
        href: '/knowledge',
        labelKey: 'nav.knowledge',
        icon: Archive,
        keywords: 'kien thuc token kho luu tru archive',
      },
      // The group's third member, added once `/library` existed. It was deliberately absent while
      // the route did not — a rail item that 404s is what the DS's own rule forbids.
      { href: '/library', labelKey: 'nav.library', icon: BookOpen, keywords: 'thu vien sach book' },
    ],
  },
];

/**
 * `/notifications` IS REACHABLE FROM THE BELL, NOT FROM THE RAIL. P2.6cd added a sidebar row only
 * because a route nothing links to is not a surface, and said in place that P3.4 would replace it
 * with the topbar bell. The bell is here now, it carries the unread badge, and its footer links to
 * the page — a second entry point with no badge would be the weaker of the two.
 * It stays in the palette below, which is a keyboard index of every route, badge or not.
 */
const PALETTE_ONLY_ITEMS: NavItem[] = [
  // `/profile` LEFT THE RAIL'S FOOTER and lives only here now. The rail is destinations — places
  // you go to do work — and "you" was the one row that was not one; it also sat below a divider
  // saying so, which is a lot of chrome for a link the bar's own avatar menu already carries. The
  // page is unchanged and reachable two ways: `MeMenu` above, and this entry in the palette — as
  // is `/settings`, which `MeMenu` now carries too.
  { href: '/profile', labelKey: 'nav.profile', icon: User, keywords: 'trang ca nhan account home' },
  {
    href: '/settings',
    labelKey: 'settings.title',
    icon: Settings,
    keywords: 'cai dat settings notifications github tokens vault calendar picture',
  },
  { href: '/notifications', labelKey: 'nav.notifications', icon: Users, keywords: 'thong bao' },
  {
    href: '/moderation',
    labelKey: 'moderationMine.title',
    icon: Lock,
    keywords: 'vi pham khieu nai khang cao moderation appeal violation ban',
  },
  /**
   * NOW A TAB, NOT A PAGE — the entry survives because the palette is how someone who knows the
   * old name still finds the content.
   *
   * IT POINTS AT `/trending` RATHER THAN AT `/newsfeed?tab=tech` DELIBERATELY, and the reason is
   * that `useTabParam` reads the query string ONCE, when the page mounts. Pushing the tab URL
   * from a reader already sitting on `/newsfeed` changes the address and nothing else — the
   * strip would not move. Routing through the redirect makes it a real navigation every time,
   * from any page, which is the only version of this command that always works.
   */
  {
    href: '/trending',
    labelKey: 'newsfeed.tabs.tech',
    icon: TrendingUp,
    keywords: 'hot xu huong cong nghe tech trending crawl',
  },
];

/** Every route the palette should know about, in rail order. */
const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  ...PALETTE_ONLY_ITEMS,
];

/**
 * THE ROWS A SIGNED-OUT READER CAN ACTUALLY OPEN — the rail's half of the guest surface.
 *
 * It is the route list from `src/middleware.ts` intersected with what the rail offers, which now
 * comes to ONE: the feed. Everything else in `NAV_GROUPS` is a screen with no anonymous endpoint
 * behind it, and the second guest-readable route — the crawler's column — stopped being a rail
 * destination when it became `/newsfeed`'s `Công nghệ` tab.
 *
 * THE OTHER ROWS STAY ON SCREEN, LOCKED, rather than being hidden — and this is the one place
 * this file departs from the DS's "a rail item that leads nowhere must not exist" rule, on
 * purpose. For a signed-in user that rule is about dead links. For a guest the rail is the only
 * honest answer to "what is this product?", and a rail showing one row says the product is a
 * feed. The lock is what keeps it from being a dead end: the row is a real link, the middleware
 * bounces it to `/login?next=…`, and the reader arrives back where they were pointing.
 */
const GUEST_READABLE_HREFS = new Set(['/newsfeed']);

const isActive = (item: NavItem, pathname: string) =>
  item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;

/** Count pill. Only rendered when there is something to count — a "0" badge is visual noise. */
function CountBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        'flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1',
        'bg-nx-status-danger text-[10px] font-semibold leading-none text-nx-text-on-color'
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavLink({
  item,
  active,
  count,
  locked = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
  /** Signed-out reader, row they cannot open: dimmed, padlocked, still a link. */
  locked?: boolean;
  onNavigate?: () => void;
}) {
  const t = useT();
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      // `aria-current` is what tells a screen reader which row is the current page. The tinted
      // background only says it to people who can see it.
      aria-current={active ? 'page' : undefined}
      className={cn(
        // `h-8` + `gap-2`, measured off the kit: a rail item there is `height 32 · padding 0 10px
        // · gap 8 · radius 6`. Ours was `py-2` + `gap-2.5`, which made it 37 tall with a 10px
        // icon↔label gap — 32 is the DS's ROW UNIT, and 10 is the inset split, not a gap.
        // `min-h-8` rather than `h-8` because the row unit is a minimum: a wrapped Vietnamese
        // label has to grow its row instead of clipping.
        // THE ROW UNIT IS 32 FOR A POINTER AND 44 FOR A FINGER, and this component is rendered
        // in both places: the rail above `lg`, and — the same element, same classes — inside the
        // mobile `Drawer` below it. 32 is the DS's row unit and stays exactly that on the rail;
        // 44 is the platform minimum for a touch target on both iOS and Android, and it is still
        // on the vertical course (32 + 12, `row` + `element`), so the ladder is not broken to
        // reach it. `min-h-` rather than `h-`, unchanged: a wrapped Vietnamese label grows.
        'flex min-h-11 items-center gap-2 rounded-nx-sm px-2.5 text-nx-ui lg:min-h-8',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
        // HOVER AND SELECTED ARE DIFFERENT TOKENS NOW. Active used to be `bg-nx-surface-hover` —
        // the SAME fill hover paints — so the row you were pointing at and the row you were on
        // differed by a font weight, on the one surface that is supposed to answer "where am I".
        // The product already had an answer and the rail was not using it: `bg-nx-accent-soft`
        // marks the selected row in `conversation-row`, `conversation-sidebar` and
        // `vault-filter-settings`. One rule, everywhere: hover tints neutral, selected tints
        // accent.
        active
          ? 'bg-nx-accent-soft font-medium text-nx-text-accent'
          : 'text-nx-text-secondary hover:bg-nx-surface-hover hover:text-nx-text-primary',
        locked && 'text-nx-text-faint hover:text-nx-text-secondary'
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {/* The padlock replaces the count rather than joining it: a locked row has nothing to
          count, and the two never coexist. `aria-label` because an icon with no text is silent. */}
      {locked ? (
        <Lock className="size-3.5 shrink-0" aria-label={t('guest.locked')} />
      ) : (
        count != null && count > 0 && <CountBadge count={count} />
      )}
    </Link>
  );
}

/**
 * Identity in the top bar — the avatar, and behind it the two things you can do to an account.
 *
 * IT MOVED HERE FROM THE RAIL'S FOOTER at R5-4, because the kit puts it here and the rail's copy
 * was the odd one out: the bar already carried the brand, the search and the bell — everything
 * that is true of the app rather than of a page — and identity is the last member of that set. A
 * rail is destinations; "you" is not a destination.
 *
 * NOT DUPLICATED. The rail's footer lost this trigger rather than keeping a second one — two
 * identity affordances on one screen is exactly the ambiguity the DS's single cluster avoids. The
 * locale toggle stays in the rail because the design has no locale control anywhere, so there is
 * no specified home to move it to; inventing one in the bar would be the guess, not the move.
 *
 * 34px hit area around a 24px avatar, matching the bell beside it — measured off the kit, and it
 * is why the avatar is `sm` rather than the `md` the rail used.
 */
function MeMenu() {
  const t = useT();
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const { mutate: logout } = useLogout();

  return (
    <Menu
      align="end"
      width={200}
      trigger={
        <button
          type="button"
          // The accessible name is the person's name once it is known; before that it is the
          // generic label, so the control is never announced as an unnamed button.
          aria-label={profile?.fullName ?? t('nav.profile')}
          className={cn(
            // 40, UP FROM 34, AND THE AVATAR INSIDE IT FROM 24 TO 32 — the owner's call.
            // This is the only picture of YOU that is on screen on every route, and at 24 it was
            // the smallest thing in the bar: smaller than the bell beside it reads as, and small
            // enough that a real photograph was unrecognisable. The hit area grows with it rather
            // than leaving a 32px glyph in a 34px box with no room around it.
            'grid size-10 shrink-0 place-items-center rounded-nx-sm',
            'hover:bg-nx-surface-hover',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          <Avatar src={profile?.profilePictureUrl} name={profile?.fullName} size="md" />
        </button>
      }
      items={[
        {
          // `Menu` items are actions, not anchors — its keyboard contract keeps focus on the
          // trigger, which a real `<a>` inside the panel would break.
          label: t('nav.profile'),
          icon: <User />,
          onSelect: () => router.push('/profile'),
        },
        {
          // The `/settings/*` hub has six real panels and was reachable only from the ⌘K palette
          // and a couple of deep links — the avatar menu is where a reader looks for it, so it
          // sits here beside the profile it is not.
          label: t('settings.title'),
          icon: <Settings />,
          onSelect: () => router.push('/settings'),
        },
        '-',
        { label: t('nav.logout'), icon: <LogOut />, danger: true, onSelect: () => logout() },
      ]}
    />
  );
}

/**
 * WHAT STANDS WHERE THE AVATAR STANDS, for a reader with no account.
 *
 * The identity cluster is the one part of the chrome a guest cannot simply be shown less of —
 * there is no name, no picture and nothing behind the menu. It becomes the product's only ask:
 * two buttons, sign in and sign up, in the slot the eye already goes to for "me".
 *
 * BOTH CARRY `next`. Someone who signs up from the middle of a post should land back on that
 * post, not on a feed that has lost it — `useAuthHref` reads the current location so no caller
 * has to remember to.
 */
function GuestAuthActions() {
  const t = useT();
  const loginHref = useAuthHref('/login');
  const registerHref = useAuthHref('/register');

  return (
    // `gap-2` — the ladder's `tight` rung, and the same 8 the bar uses between its own clusters.
    // 6 is on neither course; the icon-button cluster beside this one is 4 because those are
    // 34px squares of the same control, and two labelled buttons are not that.
    <div className="flex items-center gap-2">
      {/* The secondary sits first and drops below 576: two buttons plus a brand do not fit a
          phone bar, and "sign in" is the one a returning reader is looking for. */}
      <Link href={registerHref} className="hidden min-[576px]:block">
        <Button size="sm" variant="secondary">
          {t('guest.register')}
        </Button>
      </Link>
      <Link href={loginHref}>
        <Button size="sm">{t('guest.signIn')}</Button>
      </Link>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const brandHome = useBrandHome();
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const isGuest = useIsGuest();
  // No session, no requests to count — and no token to ask with. See the hook's own note.
  const { data: pendingRequests } = usePendingRequests(!isGuest);

  const pendingCount = pendingRequests?.length ?? 0;

  /**
   * THE GUEST RAIL USED TO GET `/trending` PROMOTED INTO IT, and that special case is gone.
   *
   * The argument for it was real: it was the second — and last — thing a guest could open, and a
   * rail whose only working row is the page they are already on gives them nowhere to go. But it
   * meant one piece of content had two different homes depending on who was asking, and a
   * signed-in reader never saw the row at all. It is `/newsfeed`'s `Công nghệ` tab now, which a
   * guest lands on the same page as — see that page's `GUEST_TABS`. One rail for everyone.
   */
  const groups = NAV_GROUPS;

  return (
    <div className="flex h-full flex-col">
      {/* THE BRAND IS NOT HERE ANY MORE — it moved to the top bar at R3, where the DS puts it.
          The rail is destinations only. It stays in the mobile Drawer, though, because the drawer
          is shown INSTEAD of the bar's rail affordance and needs to say what app it belongs to. */}
      <Link
        href="/newsfeed"
        onClick={() => {
          brandHome();
          onNavigate?.();
        }}
        className={cn(
          'flex items-center gap-2.5 px-4 py-4 lg:hidden',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
        )}
      >
        <BrandMark size={28} />
        <span className="text-nx-body font-semibold tracking-tight text-nx-text-primary">
          {t('app.name')}
        </span>
      </Link>

      <nav
        aria-label={t('nav.primary')}
        /**
         * THE DATUM IS 20, NOT 28 — correcting my own correction from the previous round.
         *
         * The kit's README says *"datum 28 — the rail, the canvas and the ledger all start their
         * first block at y = 56 + 28 = 84"*, and I moved all three regions to `pt-7` on the
         * strength of that sentence. The kit itself renders its rail `nav` at `padding: 20px 10px
         * 0px` and its canvas wrapper at `padding-top: 20px`, putting both first blocks at **76**.
         * The README paragraph describes an earlier fitting; the SPACE switch defaults to R9 and
         * that is what ships.
         *
         * 28 is also on no course the system has — the vertical course is 8 · 12 · 16 · 20 — which
         * is the part I should have noticed without opening a browser.
         *
         * `px-2.5` and `gap-3`: the kit's nav insets 10 (the set's half of the inset split, with
         * the item's own 10 completing the 20 line to its label) and spaces group-from-group at
         * `element` 12. Ours were 8 and 16.
         */
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-2.5 pb-12 lg:pt-5"
      >
        {groups.map((group) => (
          // `aria-labelledby` rather than a bare heading: the group label is a real landmark name,
          // so a screen reader announces "Mạng lưới, group" instead of reading a stray word.
          <div key={group.labelKey} role="group" aria-labelledby={`navgrp-${group.labelKey}`}>
            <div
              id={`navgrp-${group.labelKey}`}
              className="px-2.5 pb-2 text-nx-micro font-medium uppercase tracking-wide text-nx-text-faint"
            >
              {t(group.labelKey)}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item, pathname)}
                  count={item.badge === 'pendingRequests' ? pendingCount : undefined}
                  locked={isGuest && !GUEST_READABLE_HREFS.has(item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-nx-border-subtle p-2">
        <button
          type="button"
          onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
          className={cn(
            // Same row unit as the nav items above it — it sits in the same column and any other
            // height would read as a different kind of thing.
            'flex min-h-11 w-full items-center gap-2 rounded-nx-sm px-2.5 text-nx-ui lg:min-h-8',
            'text-nx-text-secondary hover:bg-nx-surface-hover hover:text-nx-text-primary',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          <Globe className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">{locale === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          <span className="font-mono text-nx-micro uppercase text-nx-text-faint">
            {locale === 'vi' ? 'EN' : 'VI'}
          </span>
        </button>

        {/* THE IDENTITY TRIGGER LEFT THIS FOOTER at R5-4 — it is `MeMenu` in the top bar now. What
            stays is the locale toggle, which the design specifies nowhere; moving it to the bar to
            keep it company would be inventing a slot rather than following one. */}
      </div>
    </div>
  );
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const t = useT();

  /**
   * THE LIVE NOTIFICATION STREAM, mounted once for the whole signed-in shell.
   *
   * Here rather than inside `NotificationBell` because the stream is not the bell's: it
   * refreshes the notifications LIST as well as the badge, and the list has its own route.
   * One connection per session, held by the thing that outlives every page.
   *
   * IT WAS IN `NavLink` FIRST, which is a nav ITEM — so the app opened eight streams instead
   * of one and each was torn down as the rail re-rendered. Caught by watching the network:
   * repeated `/notifications/stream` requests where there should have been exactly one.
   */
  const isGuest = useIsGuest();
  // A guest has no notifications and no token for the stream's own request; the hook's `enabled`
  // exists for exactly this. Passing it here rather than early-returning keeps hook order stable
  // across the sign-in that flips it.
  useNotificationStream(!isGuest);
  const router = useRouter();
  const pathname = usePathname();
  const brandHome = useBrandHome();
  const { data: profile } = useMyProfile();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /**
   * `/chats` fills the viewport exactly instead of growing the page: it is a conversation, and one
   * that pushes its composer below the fold is broken. Every other route keeps `min-h-screen` and
   * scrolls, which is what a feed has to do.
   *
   * `/chats` IS THE ONLY FULL-BLEED TENANT NOW. An open roadmap track (`/roadmap?id=N`) used to be
   * the second one — focus mode's `extent` shape, drawn full width with the rail, the ledger and
   * the top bar's context row all dropped for it. That was pulled back at the owner's call
   * (*"tab roadmap đang fullscreen … bỏ luôn đi, để ở canvas chính là đủ rồi"*): it is now an
   * ordinary detail view in the standard canvas, with its own back link, so there is nothing to
   * special-case here and `?id=` is `roadmap/page.tsx`'s concern alone.
   */
  const isChats = pathname.startsWith('/chats');
  const isFullBleed = isChats;

  /**
   * The onboarding wizard keeps the rail and the top bar — it is a standard screen — but drops the
   * ledger, which summarises reputation and skills the reader has not built yet. The atlas's F2
   * sheet: "standard, ledger hidden during wizard".
   */
  const isOnboarding = pathname.startsWith('/onboarding');

  useEffect(() => {
    if (!profile) return;
    // Keep the middleware's routing cookie in sync so the next navigation needs no client-side
    // check at all — and catch an admin who reached this shell before the cookie-based redirect
    // did. The writer now lives in `features/security`; it used to be a legacy bridge module.
    setRoleCookie(profile.role === 'ADMIN');
    if (profile.role === 'ADMIN') router.replace('/admin/moderation');
  }, [profile, router]);

  // Ctrl/Cmd+K opens the palette. Bound on the shell rather than inside `CommandPalette`, because
  // a component that is unmounted while closed cannot listen for its own opening shortcut.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const paletteActions = useMemo<CommandAction[]>(
    () => [
      ...ALL_NAV_ITEMS.map((item) => ({
        id: item.href,
        label: t(item.labelKey),
        keywords: item.keywords,
        icon: <item.icon />,
        section: t('palette.goTo'),
        onRun: () => router.push(item.href),
      })),
      {
        // The one action that is not navigation. It has to be `alwaysShow`, because free text
        // matches no route by definition — without it, typing anything real empties the list and
        // the palette looks broken exactly when it is most useful.
        id: 'search-everywhere',
        label: t('palette.searchEverywhere'),
        icon: <Search />,
        alwaysShow: true,
        onRun: (query) => router.push(`/search?q=${encodeURIComponent(query)}`),
      },
    ],
    [router, t]
  );

  return (
    /**
     * THE ONE CHAT CONNECTION FOR THE WHOLE APP, mounted here rather than per screen.
     *
     * Consequence, stated because it is easy to mount and not notice: every page under `(main)`
     * opens a Stream websocket and asks the backend for a chat token. That is deliberate — the
     * dock's unread badge has to be right on every page, which is only possible if the connection
     * is live on every page. `/chats` and the dock share this provider; connecting per surface
     * would open two sockets and double every event.
     *
     * `enabled` waits for the profile so the token request cannot race session bootstrap, and so
     * an admin — redirected out of this shell by the effect above — never opens a socket at all.
     */
    <ChatClientProvider enabled={!isGuest && Boolean(profile) && profile?.role !== 'ADMIN'}>
      {/**
       * THE R4 SKELETON: a slim bar across the top, a rail and a canvas under it, and neither
       * flank paints anything. Replaces the round-1 shell (a filled 240px sidebar with a border,
       * and content in a 1024px box).
       *
       * WHAT THE CHANGE IS ACTUALLY ABOUT, since "sidebar → rail" undersells it: separation used
       * to be drawn (a fill plus a right border marked where the sidebar stopped), and is now
       * PLACED. The ground is recessed (`surface-page` at gray-100), the bar and the cards are
       * raised on it, and the flanks are simply ground with things standing on it. That is why
       * the rail has no fill and no border — it is not an undecorated sidebar, it is not a panel
       * at all. It is why the gutter between regions is empty: the gutter IS the boundary.
       *
       * THE BAR CARRIES NO DESTINATIONS AND EXACTLY ONE COUNT. Brand, search, bell, avatar —
       * nothing else. The rejected round-2 skeleton put a second row of group tabs here and it
       * changed under the reader when they switched groups. Destinations live in the rail, where
       * they hold still; the one number in the chrome is the bell's, because it is a queue you
       * can clear rather than attention bait.
       */}
      <div
        className={cn(
          'bg-nx-surface-page',
          isFullBleed ? 'flex h-[100dvh] flex-col overflow-hidden' : 'min-h-screen'
        )}
      >
        {/* Shows only after a request comes back 403 with a ban — including one that lands
            mid-session. Signed-in only; a guest never had an account to ban. */}
        {!isGuest && <AccountBanBanner />}

        {/* 56px, raised on the ground with a hairline shadow and NO bottom border — the elevation
            is what separates it, so a border would be saying the same thing twice. Full-bleed
            rather than capped with the shell: the search field centres on the viewport. */}
        {/**
         * R5-4: TWO CENTRES BECAME ONE MECHANISM — `handoff/layout-r7.md` §5.3, measured off the
         * kit rather than inferred.
         *
         * The bar used to be one full-bleed flex row: brand, then a field with `mx-auto` taking
         * whatever was left, then the controls. That centres the field in the SPACE BETWEEN two
         * flanks of unequal width, which is not the same thing as centring it on the viewport —
         * and the two drift apart the moment either flank changes (a longer name, a badge
         * appearing). The kit's answer is that the field is not in the row's flow at all: the
         * header spans the viewport, the field is absolutely positioned at `left: 50%` on IT, and
         * brand + controls flow inside a row capped at the shell's own budget. Nothing has to
         * agree with anything.
         *
         * MEASURED IN THE KIT AT 1280: header 56 · row capped and centred · field 320 centred on
         * the viewport · `⌘K` INSIDE the field · bell and avatar at the right.
         *
         * THE ROW IS CAPPED AT THE SHELL CAP, so the brand's left edge lands on the rail's and the
         * controls' right edge on the ledger's. That is one cap serving both, not a second
         * mechanism to keep in sync — the failure mode this whole round is about.
         */}
        {/**
         * THE SHADOW BELONGS TO THE BOTTOM OF THE CHROME, NOT TO THE TOP BAR. In focus mode the
         * top bar is followed by a 48px context bar, and `layout-r7.md` §3.2 is explicit that the
         * pair is **one card 104 tall**: *"the shadow moves to the bottom of the pair… two stacked
         * shadows would re-close the ∩ r4 spent a round opening — vertically this time."* So the
         * bar drops its own shadow exactly when something else is going to sit under it.
         */}
        {/**
         * `/chats` DROPS THE TOP BAR ENTIRELY. Focus mode already strips it back to brand · search
         * · bell · avatar, and on this tenant even that is redundant: the context bar below carries
         * the way out, the messenger owns the height, and the reclaimed 56px goes to the transcript.
         * Its one mobile job — the menu button — moves onto the context bar (`ChatsTrail`). `/chats`
         * is now focus mode's only tenant, so `isChats` and `isFullBleed` name the same set.
         */}
        {!isChats && (
          <header
            className={cn(
              'sticky top-0 z-30 h-nx-topbar shrink-0 bg-nx-surface-card',
              !isFullBleed && 'shadow-nx-1'
            )}
          >
            <div
              className={cn(
                // `relative` IS LOAD-BEARING NOW: it makes this capped row — not the full-bleed
                // <header> — the containing block for the search field below, which is what lets
                // the field be positioned against the SHELL's columns instead of the viewport.
                'relative mx-auto flex h-full w-full',
                // Same cap as the body row, and it has to be: the bar's brand sits on the rail's
                // column and its controls sit on the ledger's, so a bar capped at 1300 over a body
                // capped at 1240 would hang 30px past both ends of what it labels.
                'max-w-[var(--spacing-nx-shell-max-sm)]',
                'min-[1440px]:max-w-[var(--spacing-nx-shell-max)]',
                // ONE INSET FOR THE WHOLE SHELL, was `px-3 xl:px-5`. 20 is `--nx-space-pad`, the
                // ladder's rung for "content ↔ container edge, HORIZONTAL", and it is already what
                // the rail spends (nav 10 + item 10) and what the canvas now spends below `lg`.
                // At `px-3` the brand sat 8px left of the nav icons it stands above.
                'items-center gap-2.5 px-5'
              )}
            >
              <IconButton
                label={t('nav.openMenu')}
                // Pairs with the rail's `lg:flex` — the two must switch on the same number, or
                // there is a band with neither a rail nor a way to open one.
                className="lg:hidden"
                onClick={() => setDrawerOpen(true)}
              >
                <MenuIcon />
              </IconButton>

              {/**
               * THE MARK IS ALWAYS IN THE BAR; ONLY THE WORDMARK STEPS. The DS's brand row reads
               * `mark + wordmark` at 1440 · 1280 · 1024 · 768 and `mark only` at 375 — so the
               * wordmark drops at the PHONE step, not at 1280. This was hidden entirely below 768
               * (leaving the bar with no brand at all whenever the drawer was shut) and dropped its
               * wordmark below 1280, which is two steps too eager.
               */}
              <Link
                href="/newsfeed"
                onClick={brandHome}
                className={cn(
                  'flex shrink-0 items-center gap-2.5',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
                )}
              >
                <BrandMark size={24} />
                <span className="hidden text-nx-body font-semibold tracking-tight text-nx-text-primary min-[576px]:inline">
                  {t('app.name')}
                </span>
              </Link>

              {/**
               * THE FIELD MIRRORS THE CANVAS'S OWN BOX, at every width, not just from `lg` up.
               *
               * It used to sit outside this row, absolutely positioned against the full-bleed
               * <header>, so `left-1/2` centred it on the VIEWPORT. The canvas is not centred on
               * the viewport — it sits after the rail — so the two never agreed: measured in a
               * 1300 shell, the field's centre was 650 and the canvas's was 586.
               *
               * A first fix left `left-1/2` in place below `lg` and only corrected `lg` and up,
               * on the theory that below `lg` the canvas is "centred" too so the two axes would
               * still agree. They do not: below `lg` the canvas is a 672px box **centred inside
               * the row and then padded by `px-5`**, while a field centred with `left-1/2` is
               * centred on the FULL row — the same two-centres bug, just moved to a narrower
               * range (roughly 672–1024px) where a maximised rail-less window or a resized browser
               * sits. It read as fine before only because nothing left-aligned shared the row to
               * compare against; it stopped being fine the moment a heading did.
               *
               * SO THE FIELD'S WRAPPER IS BUILT FROM THE SAME TWO CLASSES THE CANVAS USES —
               * `mx-auto max-w-[--spacing-nx-canvas] px-5` — nested inside an outer box that spans
               * the row exactly the way `<main>` does. Below `lg` that reproduces the canvas's own
               * centring and padding pixel for pixel, because both are the same shape nested in
               * the same 1240/1300-capped parent. The field then sits flush at the padded box's
               * left edge, same as the canvas's heading text.
               *
               * From `lg` up the mirroring classes cancel (`lg:mx-0 lg:max-w-none lg:px-0`) and
               * the outer box collapses to `left = sidebar + gutter` — the canvas's own left edge
               * above `lg`, where it runs flush with `lg:ml-0 lg:px-0`.
               *
               * Placed after the brand and before the controls so keyboard order runs
               * logo → search → controls, which is the order they read in.
               */}
              <div
                className={cn(
                  'absolute inset-x-0 top-1/2 hidden -translate-y-1/2',
                  'lg:inset-x-auto',
                  'lg:left-[calc(var(--spacing-nx-sidebar)+var(--spacing-nx-region-gutter-sm))]',
                  'min-[1440px]:left-[calc(var(--spacing-nx-sidebar)+var(--spacing-nx-region-gutter))]',
                  'min-[576px]:block'
                )}
              >
                <div className="mx-auto max-w-[var(--spacing-nx-canvas)] px-5 lg:mx-0 lg:max-w-none lg:px-0">
                  <SearchBar
                    className="w-[320px] lg:w-[440px] xl:w-[520px]"
                    shortcutLabel={t('palette.shortcutHint')}
                    shortcutAriaLabel={t('palette.label')}
                    onShortcutClick={() => setPaletteOpen(true)}
                  />
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-1">
                {/* Below 576 the field does not exist (the DS derives that number: at 576 the
                  centred field's clamped minimum no longer fits between the two reserves), so the
                  palette needs a control of its own down there. Above it, the hint inside the
                  field is that control. */}
                <IconButton
                  label={t('palette.label')}
                  className="min-[576px]:hidden"
                  onClick={() => setPaletteOpen(true)}
                >
                  <Search />
                </IconButton>

                {/* Both are identity surfaces with nothing behind them for a guest: a bell that can
                  only ever read zero, and a menu whose two items are a profile and a sign-out. */}
                {isGuest ? (
                  <GuestAuthActions />
                ) : (
                  <>
                    <NotificationBell />
                    <MeMenu />
                  </>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Focus mode's second row — see `FocusTrail` at the foot of this file. `/chats` is the
            only tenant, so there is one trail and no branch. */}
        {isChats && <ChatsTrail onOpenMenu={() => setDrawerOpen(true)} />}

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={256}
          label={t('nav.primary')}
        >
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </Drawer>

        {/**
         * The shell is capped at its own budget and centred on the ground; what lies outside the
         * cap is ground, so it reads as page margin rather than as an over-wide layout.
         *
         * THE GUTTER STEPS AT 1440, NOT AT 1280 — corrected after measuring. The budget is
         * `210 + 40 + 672 + 40 + 338 = 1300` at the full step and `210 + 24 + 672 + 24 + 310 =
         * 1240` at the next one down, and the DS assigns 1240 to **1280**. Tailwind's `xl` is
         * 1280, so `xl:gap-nx-region-gutter` was spending the 1300 budget in a 1265 viewport
         * (1280 less the scrollbar). Something had to give, and `flex-1` gave it out of the
         * canvas: measured at 1280, the reading column was **637px against a 672 measure**.
         *
         * That is the one number the whole system is derived from, so it cannot be the thing that
         * absorbs a shortfall. Both `--spacing-nx-*-sm` tokens existed for this step and had no
         * consumer anywhere in the app.
         *
         * THE CAP DOES NOT APPLY IN FOCUS MODE, and that is `density-r10.md`'s second headline —
         * *the cap stops applying to a shape that has no flanks*. The 1300 is the sum of a rail, a
         * measure, a ledger and two gutters; focus mode has none of those, so capping it is
         * arithmetic about regions that are not on screen. Measured before the fix: `/chats` ran
         * 1300 wide, centred, with 150px of bare ground down each side of a transcript — while the
         * kit's own focus region measures the full 1600 at 1600.
         */}
        <div
          className={cn(
            'mx-auto flex w-full',
            'gap-nx-region-gutter-sm min-[1440px]:gap-nx-region-gutter',
            // THE CAP STEPS WITH THE GUTTER, which it did not before and should have. The note
            // above already says the budget is 1240 below 1440 and 1300 at 1440 — but only the
            // gutter and the ledger stepped, while the cap stayed 1300 the whole way. That left
            // 60px the columns had no claim on, and `mx-auto` on the canvas is what absorbed it,
            // so the reading column's position depended on the viewport instead of on the grid.
            isFullBleed
              ? 'min-h-0 flex-1'
              : cn(
                  'max-w-[var(--spacing-nx-shell-max-sm)]',
                  'min-[1440px]:max-w-[var(--spacing-nx-shell-max)]'
                )
          )}
        >
          {/* Hangs below the bar and owns its own scroller, so a long rail never scrolls the
              canvas and a long canvas never scrolls the rail. No fill, no border. */}
          <aside
            className={cn(
              // `lg` (1024), not `md` (768): the DS gives 768 a **Drawer** and only starts the
              // 210 rail at 1024. Showing it at 768 left 768 − 210 − 24 = 534 for a 672 measure.
              'sticky top-nx-topbar hidden h-[calc(100dvh-var(--spacing-nx-topbar))] w-nx-sidebar',
              'shrink-0',
              // FOCUS MODE IS "top bar 56 + context bar 48 + ONE REGION" (`layout-r7.md` §3.1).
              // The rail is a second region, so it goes — the context bar's trail is what replaces
              // it, which is why that bar had to exist before this line could be written. The
              // hamburger and the Drawer stay, so navigation is still one tap away.
              isFullBleed ? 'hidden' : 'lg:flex'
            )}
          >
            <SidebarContent />
          </aside>

          <main
            className={cn(
              'min-w-0 flex-1',
              isFullBleed
                ? 'flex min-h-0 flex-col'
                : /**
                   * NO HORIZONTAL PADDING FROM `lg` UP, WHICH IS THE SECOND HALF OF THE MEASURE
                   * BUG. `max-w` caps the BOX, so `max-w-672 px-6` gave a 624 reading column —
                   * the cards were 48 narrower than the measure and the gutter beside them read
                   * as 40 + 24. The canvas region IS 672 and the inset is the card's own padding,
                   * so the region must not add its own.
                   *
                   * Below `lg` the canvas is full-bleed against the viewport with no rail beside
                   * it, so there it keeps the DS's 16 of edge padding.
                   *
                   * 20 top is the datum — measured, not read. The kit's canvas wrapper renders
                   * `padding-top: 20px`, putting its first card at 76; the README's "datum 28"
                   * describes an earlier fitting and 28 is on no course the ladder has. Shared
                   * with the rail and the ledger, which is the property that actually matters.
                   * 48 bottom is the DS's runout, was 72.
                   */
                  /**
                   * `lg:ml-0` IS THE OTHER HALF OF THE CAP FIX. From `lg` the canvas stops
                   * centring itself in whatever space is left and simply starts where the rail
                   * ends, so any slack collects on the right — which is the side the ledger
                   * arrives from.
                   *
                   * Measured before: at 1279 the canvas began at x=420 and at 1280 it began at
                   * x=254, because the ledger appearing removed 334px of slack that `mx-auto` had
                   * been splitting evenly. The reading column jumped 166px sideways at one
                   * breakpoint, which is where a laptop sits when a window is halved. Now the
                   * canvas begins at `sidebar + gutter` from the shell edge at every width from
                   * `lg` up, ledger or no ledger, and the 1280 step moves it by half a pixel.
                   *
                   * Below `lg` `mx-auto` still governs: with no rail there is nothing to start
                   * after, and centring is the correct answer.
                   *
                   * `px-5`, was `px-4`. Horizontal padding is `--nx-space-pad` (20) on the
                   * ladder — 16 is `pad-y`, the vertical rung — and 20 is what the top bar and
                   * the rail both spend, so this is the mobile canvas joining the shell's one
                   * inset rather than keeping a fourth number.
                   */
                  'mx-auto w-full max-w-[var(--spacing-nx-canvas)] px-5 pt-5 pb-12 lg:ml-0 lg:px-0'
            )}
          >
            {children}
          </main>

          {/* The third region. Hidden below 1024 rather than reflowed under the canvas: it is a
              glance-at-it summary, and a summary that has to be scrolled past to reach the content
              is not one. `isFullBleed` drops it too — `/chats` is a conversation filling the
              viewport, and the ledger would be a column of statistics beside someone's message. */}
          {/* The ledger is a summary OF YOU — reputation, contributions, verified skills — so for a
              guest there is nothing for it to summarise. The slot is not left empty either: it is
              the widest piece of quiet space on the screen, and what belongs in it is the reason
              to have an account at all. */}
          {!isFullBleed && !isOnboarding && (isGuest ? <GuestLedger /> : <Ledger />)}
        </div>

        {/* ONE PROMPT FOR THE WHOLE SHELL. Every guest write in the app — in components this file
            has never heard of — is refused by the transport, which raises it here. See
            `features/security`'s `AuthRequiredPrompt`. */}
        {isGuest && <AuthRequiredPrompt />}

        {/* Signed-in counterpart to the prompt above: a refresh-token failure raises this instead
            of `core/api/axios.ts` silently hard-redirecting to `/login`. Not gated on `isGuest` —
            it only ever fires for someone who had a session to lose. */}
        <SessionExpiredPrompt />

        {/* Shell-level net for a 428 (missing professional profile) from any surface that does not
            handle its own — routes to the onboarding wizard with a ?next= back. */}
        {!isGuest && <ProfileRequiredRedirect />}

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          actions={paletteActions}
          label={t('palette.label')}
          placeholder={t('palette.placeholder')}
          emptyLabel={t('palette.empty')}
        />

        {/* THE FLOATING CHAT DOCK IS GONE, and it is the design system that removed it.

            Round 15 §1.4 retired `ChatDock` from the product and kept it as a specimen in
            `chat.card.html`. Two reasons, and neither is tidiness. Custody: a dock that can
            hold the same thread `/chats` holds is two owners for one object, with no rule
            saying which is authoritative when both are open — the exact thing four rounds of
            this system went out of their way to refuse. And shape: chat here is a full-bleed
            focus route with a measure derived from the bubble, a searchable list and an info
            column; a 340×420 dock is a worse copy of it, not a complement.

            It also floated over every screen in the product, which is the one thing the
            surface model forbids outright — nothing in flow may appear to float. `Chats` is
            in the rail, one click from anywhere, so nothing is lost. */}
      </div>
    </ChatClientProvider>
  );
}

/**
 * THE CONTEXT BAR — focus mode's second row, and the half of the shape that was missing.
 *
 * `layout-r7.md` §3.2 fixes its geometry and gives the reason for each number: **48 tall**
 * ("the two-line row unit, already in the system — not a new number"), the top bar's own
 * fill, and **no shadow of its own** because the shadow belongs to the bottom of the pair.
 * Measured in the kit's `/chats`: a full-width band at `y=56`, `height 48`,
 * `rgb(255,255,255)`, carrying a trail back to where you came from and the tenant's name.
 *
 * IT ONLY EXISTS IN FOCUS MODE. A shell screen already names itself in its own canvas
 * header beside its primary action (R8 moved it there to buy back 40px on every screen);
 * a second title in the chrome would be that same string twice.
 *
 * `/chats` IS FOCUS MODE'S ONLY TENANT. An open roadmap track was the second — with its own
 * trail back to the index it was picked from — until it was pulled back into the ordinary canvas.
 * The pieces below stay split (`FocusTrailBar` · `FocusTrail` · `ChatsTrail`) rather than being
 * inlined: the split is what let a per-tenant trail resolve its own crumbs without every tenant's
 * hooks firing on every other tenant's screen, and it is the seam a future focus tenant slots into.
 */
function FocusTrailBar({
  children,
  // `/chats` removed the top bar above this one, so the trail is the chrome's top edge and sticks
  // at 0. `atTop` stays a prop for a future tenant that keeps the 56px bar and needs the offset.
  atTop = false,
}: {
  children: React.ReactNode;
  atTop?: boolean;
}) {
  return (
    <div
      className={cn(
        'sticky z-30 flex h-nx-subnav shrink-0 items-center gap-2',
        atTop ? 'top-0' : 'top-nx-topbar',
        'bg-nx-surface-card px-3 shadow-nx-1 xl:px-5'
      )}
    >
      {children}
    </div>
  );
}

/**
 * The trail's two parts: a link back to the parent, and where you are now.
 *
 * `title` IS OPTIONAL AND ABSENT IS A REAL STATE, not a loading placeholder to fill with dashes.
 * A tenant whose crumb arrives with a request shows the way back and stops until it resolves; a
 * skeleton or a repeated tenant name would both be the bar claiming to know something it does not.
 */
function FocusTrail({
  backHref,
  backLabel,
  title,
  atTop,
  leading,
}: {
  backHref: string;
  backLabel: string;
  title?: string;
  atTop?: boolean;
  /** Rendered before the back link — the menu button on `/chats`, where the top bar is gone. */
  leading?: React.ReactNode;
}) {
  return (
    <FocusTrailBar atTop={atTop}>
      {leading}
      <Link
        href={backHref}
        className={cn(
          'inline-flex items-center gap-2 text-nx-body-sm text-nx-text-muted',
          'hover:text-nx-text-primary',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
        )}
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </Link>
      {title && (
        <>
          <span className="text-nx-text-faint" aria-hidden>
            /
          </span>
          <span className="truncate text-nx-ui font-medium text-nx-text-primary">{title}</span>
        </>
      )}
    </FocusTrailBar>
  );
}

/**
 * `/chats` — no parent of its own, so the trail leads back out to the rail's first item.
 *
 * IT CARRIES THE MENU BUTTON NOW. The top bar that used to hold it is gone on this tenant, and
 * below `lg` the rail is a Drawer with no other opener — so the button lands here, `lg:hidden`
 * like it was in the bar. Above `lg` focus mode has never shown a rail; the trail's back link is
 * the way out and always was.
 */
function ChatsTrail({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useT();
  return (
    <FocusTrail
      backHref="/newsfeed"
      backLabel={t('nav.newsfeed')}
      title={t('nav.chats')}
      atTop
      leading={
        <IconButton label={t('nav.openMenu')} className="lg:hidden" onClick={onOpenMenu}>
          <MenuIcon />
        </IconButton>
      }
    />
  );
}
