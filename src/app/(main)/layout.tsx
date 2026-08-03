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

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.groupStream',
    items: [
      {
        href: '/newsfeed',
        labelKey: 'nav.newsfeed',
        icon: Newspaper,
        keywords: 'feed home bai viet',
      },
      { href: '/trending', labelKey: 'nav.trending', icon: TrendingUp, keywords: 'hot xu huong' },
    ],
  },
  {
    labelKey: 'nav.groupGrowth',
    items: [
      { href: '/roadmap', labelKey: 'nav.roadmap', icon: RouteIcon, keywords: 'lo trinh skill' },
      {
        href: '/knowledge',
        labelKey: 'nav.knowledge',
        icon: BookOpen,
        keywords: 'kien thuc token',
      },
    ],
  },
  {
    labelKey: 'nav.groupNetwork',
    items: [
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
      <Link
        href="/newsfeed"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2.5 px-4 py-4',
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
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2"
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
      <div
        className={cn(
          'bg-nx-surface-page',
          isFullBleed ? 'flex h-[100dvh] flex-col overflow-hidden' : 'min-h-screen'
        )}
      >
        <aside className="fixed inset-y-0 hidden w-60 flex-col border-r border-nx-border-subtle bg-nx-surface-card md:flex">
          <SidebarContent />
        </aside>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={240}
          label={t('nav.primary')}
        >
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </Drawer>

        <div className={cn('md:ml-60', isFullBleed && 'flex min-h-0 flex-1 flex-col')}>
          {/* ONE topbar for both breakpoints, replacing the previous mobile header plus a separate
              desktop search strip. Two bars meant two `sticky top-0` elements, and the old code
              had to switch one of them to `md:sticky` to stop them overlapping. */}
          <header
            className={cn(
              'sticky top-0 z-30 flex shrink-0 items-center gap-2 px-3 py-2 sm:px-4',
              'border-b border-nx-border-subtle bg-nx-surface-card'
            )}
          >
            <IconButton
              label={t('nav.openMenu')}
              className="md:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>

            <div className="min-w-0 flex-1">
              <SearchBar />
            </div>

            {/* The shortcut is discoverable only if something shows it. Hidden below `sm`, where
                there is usually no Ctrl key to press. */}
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

          <main
            className={cn(
              isFullBleed ? 'min-h-0 flex-1' : 'mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8'
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
