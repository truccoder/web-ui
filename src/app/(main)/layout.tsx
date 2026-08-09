'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Globe,
  LogOut,
  MessageCircle,
  Menu as MenuIcon,
  Newspaper,
  Route as RouteIcon,
  Search,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import {
  Avatar,
  BrandMark,
  CommandPalette,
  Drawer,
  IconButton,
  Menu,
  type CommandAction,
} from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { ChatClientProvider, ChatDock } from '@/features/chat';
import { usePendingRequests } from '@/features/friendships';
import { NotificationBell } from '@/features/notifications';
import { SearchBar } from '@/features/search';
import { setRoleCookie, useLogout, useMyProfile } from '@/features/security';
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
 * WHY `Cộng đồng` AND NOT `Mạng lưới`: the feed's `Tất cả` tab is every post in the product plus
 * every crawled item, with no filter of any kind. `Mạng lưới` names the friend edge and nothing
 * else, so filing the feed under it would say the feed is your friends — which the product
 * explicitly says it is not. `Cộng đồng` says the wider thing, and it is the honest complement to
 * `Phát triển`: outward, then inward.
 *
 * `/trending` IS NOT IN THE RAIL and that is the design, not an omission. The DS folds crawled
 * content into the feed's `Tất cả` tab and the ledger's `Từ bên ngoài` section, retiring the
 * separate destination. The route still exists and still works — folding it into the feed is R4
 * — so it moves to `PALETTE_ONLY_ITEMS` rather than being stranded with no way in.
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
    ],
  },
  {
    labelKey: 'nav.groupGrowth',
    items: [
      { href: '/roadmap', labelKey: 'nav.roadmap', icon: RouteIcon, keywords: 'lo trinh skill' },
      {
        // `Thư viện` (the book library, `GET /books`) is the third member of this group in the DS.
        // It is not here because the route does not exist yet — R4 builds it. A rail item that
        // 404s is exactly what the DS's own rule forbids.
        href: '/knowledge',
        labelKey: 'nav.knowledge',
        icon: BookOpen,
        keywords: 'kien thuc token kho luu tru',
      },
    ],
  },
];

/**
 * Rows that sit below the groups, separated: this is "you", not a place you go to do work.
 */
const NAV_FOOTER_ITEMS: NavItem[] = [
  { href: '/profile', labelKey: 'nav.profile', icon: User, keywords: 'trang ca nhan account home' },
];

/**
 * `/notifications` IS REACHABLE FROM THE BELL, NOT FROM THE RAIL. P2.6cd added a sidebar row only
 * because a route nothing links to is not a surface, and said in place that P3.4 would replace it
 * with the topbar bell. The bell is here now, it carries the unread badge, and its footer links to
 * the page — a second entry point with no badge would be the weaker of the two.
 * It stays in the palette below, which is a keyboard index of every route, badge or not.
 */
const PALETTE_ONLY_ITEMS: NavItem[] = [
  { href: '/notifications', labelKey: 'nav.notifications', icon: Users, keywords: 'thong bao' },
  // Retired from the rail by the round-14 grouping (see `NAV_GROUPS`), kept reachable here until
  // R4 folds crawled content into the feed. The palette is a keyboard index of every route.
  { href: '/trending', labelKey: 'nav.trending', icon: TrendingUp, keywords: 'hot xu huong' },
];

/** Every route the palette should know about, in rail order. */
const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  ...NAV_FOOTER_ITEMS,
  ...PALETTE_ONLY_ITEMS,
];

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
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
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
        'flex items-center gap-2.5 rounded-nx-sm px-2.5 py-2 text-nx-ui',
        'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring',
        active
          ? 'bg-nx-surface-hover font-medium text-nx-text-primary'
          : 'text-nx-text-secondary hover:bg-nx-surface-hover hover:text-nx-text-primary'
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {count != null && count > 0 && <CountBadge count={count} />}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const { data: profile } = useMyProfile();
  const { data: pendingRequests } = usePendingRequests();
  const { mutate: logout } = useLogout();

  const pendingCount = pendingRequests?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* THE BRAND IS NOT HERE ANY MORE — it moved to the top bar at R3, where the DS puts it.
          The rail is destinations only. It stays in the mobile Drawer, though, because the drawer
          is shown INSTEAD of the bar's rail affordance and needs to say what app it belongs to. */}
      <Link
        href="/newsfeed"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 px-4 py-4 md:hidden',
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
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2 md:pt-4"
      >
        {NAV_GROUPS.map((group) => (
          // `aria-labelledby` rather than a bare heading: the group label is a real landmark name,
          // so a screen reader announces "Mạng lưới, group" instead of reading a stray word.
          <div key={group.labelKey} role="group" aria-labelledby={`navgrp-${group.labelKey}`}>
            <div
              id={`navgrp-${group.labelKey}`}
              className="px-2.5 pb-1.5 text-nx-micro font-medium uppercase tracking-wide text-nx-text-faint"
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
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-0.5 border-t border-nx-border-subtle pt-3">
          {NAV_FOOTER_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item, pathname)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-nx-border-subtle p-2">
        <button
          type="button"
          onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-nx-sm px-2.5 py-2 text-nx-ui',
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

        {/* Opens upward: the trigger sits at the bottom edge, where a downward panel would be
            off-screen. Sign-out is `danger` and last, after a separator — `Menu.prompt.md`. */}
        <Menu
          side="top"
          align="start"
          width={200}
          className="w-full"
          trigger={
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2.5 rounded-nx-sm px-2.5 py-2 text-nx-ui',
                'text-nx-text-primary hover:bg-nx-surface-hover',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
              )}
            >
              <Avatar src={profile?.profilePictureUrl} name={profile?.fullName} size="sm" />
              {/* `suppressHydrationWarning`: the server has no session, so it renders the
                  placeholder and the client fills the real name in on the first paint. */}
              <span className="flex-1 truncate text-left" suppressHydrationWarning>
                {profile?.fullName ?? '…'}
              </span>
            </button>
          }
          items={[
            {
              // `Menu` items are actions, not anchors — its keyboard contract keeps focus on the
              // trigger, which a real `<a>` inside the panel would break. So this pushes through
              // the client router rather than rendering a link.
              label: t('nav.profile'),
              icon: <User />,
              onSelect: () => {
                onNavigate?.();
                router.push('/profile');
              },
            },
            '-',
            { label: t('nav.logout'), icon: <LogOut />, danger: true, onSelect: () => logout() },
          ]}
        />
      </div>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { data: profile } = useMyProfile();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /**
   * `/chats` fills the viewport exactly instead of growing the page: it is a conversation, and one
   * that pushes its composer below the fold is broken. Every other route keeps `min-h-screen` and
   * scrolls, which is what a feed has to do.
   */
  const isFullBleed = pathname.startsWith('/chats');

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
    <ChatClientProvider enabled={Boolean(profile) && profile?.role !== 'ADMIN'}>
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
        {/* 56px, raised on the ground with a hairline shadow and NO bottom border — the elevation
            is what separates it, so a border would be saying the same thing twice. Full-bleed
            rather than capped with the shell: the search field centres on the viewport. */}
        <header
          className={cn(
            'sticky top-0 z-30 flex h-nx-topbar shrink-0 items-center gap-3 px-3.5 xl:px-5',
            'bg-nx-surface-card shadow-nx-1'
          )}
        >
          <IconButton
            label={t('nav.openMenu')}
            className="md:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>

          {/* Wordmark drops below 1280 and the mark stands alone — the bar's budget goes to the
              search field first. Hidden entirely on mobile, where the drawer carries the brand. */}
          <Link
            href="/newsfeed"
            className={cn(
              'hidden shrink-0 items-center gap-2.5 md:flex',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
            )}
          >
            <BrandMark size={24} />
            <span className="hidden text-nx-body font-semibold tracking-tight text-nx-text-primary xl:inline">
              {t('app.name')}
            </span>
          </Link>

          {/* Capped at 440 and centred in what the bar has left, rather than stretched: a field
              that runs the width of a 1512px window reads as a page-wide input, not a tool. */}
          <div className="mx-auto w-full max-w-[440px] min-w-0">
            <SearchBar />
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'hidden shrink-0 items-center gap-1.5 rounded-nx-sm border border-nx-border-default px-2 py-1',
              'font-mono text-nx-micro text-nx-text-muted hover:bg-nx-surface-hover sm:flex',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
            )}
          >
            {t('palette.shortcutHint')}
          </button>

          <NotificationBell />
        </header>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={256}
          label={t('nav.primary')}
        >
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </Drawer>

        {/* The shell is capped at its own budget — 248 rail + 40 gutter + 672 canvas (+ 40 + 300
            for the ledger, which R3-2 adds) — and centred on the ground. What lies outside the cap
            is ground, the same substance as the gaps between cards, so it reads as page margin
            rather than as an over-wide layout. */}
        <div
          className={cn(
            'mx-auto flex w-full max-w-[var(--spacing-nx-shell-max)]',
            'gap-6 xl:gap-nx-region-gutter',
            isFullBleed && 'min-h-0 flex-1'
          )}
        >
          {/* Hangs below the bar and owns its own scroller, so a long rail never scrolls the
              canvas and a long canvas never scrolls the rail. No fill, no border. */}
          <aside
            className={cn(
              'sticky top-nx-topbar hidden h-[calc(100dvh-var(--spacing-nx-topbar))] w-nx-sidebar',
              'shrink-0 md:flex'
            )}
          >
            <SidebarContent />
          </aside>

          <main
            className={cn(
              'min-w-0 flex-1',
              isFullBleed
                ? 'flex min-h-0 flex-col'
                : // The reading column is hard-capped and centred in whatever the canvas has.
                  // 28 top / 24 side / 72 bottom: the deep bottom pad is scroll run-out, so the
                  // last card in a feed does not sit flush against the viewport edge.
                  'mx-auto w-full max-w-[var(--spacing-nx-canvas)] px-6 pt-7 pb-18'
            )}
          >
            {children}
          </main>
        </div>

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          actions={paletteActions}
          label={t('palette.label')}
          placeholder={t('palette.placeholder')}
          emptyLabel={t('palette.empty')}
        />

        {/* Floating chat. Hides itself on `/chats`, which is the same conversations full-screen. */}
        <ChatDock />
      </div>
    </ChatClientProvider>
  );
}
