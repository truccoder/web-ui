'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  Users,
  Newspaper,
  TrendingUp,
  Bell,
  MessageCircle,
  ChevronDown,
  UserPlus,
  UserCheck,
  Globe,
} from 'lucide-react';
import { setRoleCookie } from '@/lib/hooks/use-admin-role';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import { ChatClientProvider, ChatDock } from '@/features/chat';
import { cn } from '@/lib/utils';
import { useProfile, useLogout } from '@/lib/hooks';
import { usePendingRequests } from '@/lib/hooks/use-friendship';
import { useI18n, useT } from '@/lib/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SearchBar } from '@/components/search/search-bar';

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const { data: pendingRequests } = usePendingRequests();
  const t = useT();

  const isFriendsActive = pathname.startsWith('/friends');
  const [friendsOpen, setFriendsOpen] = useState(isFriendsActive);

  const pendingCount = pendingRequests?.length ?? 0;

  const friendSubItems = [
    { href: '/friends/all', label: t('nav.friendsAll'), icon: Users },
    { href: '/friends/suggestions', label: t('nav.friendsSuggestions'), icon: UserPlus },
    { href: '/friends/requests', label: t('nav.friendsRequests'), icon: UserCheck },
  ];

  return (
    <nav className="space-y-1">
      {/* Newsfeed */}
      <Link
        href="/newsfeed"
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/newsfeed'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Newspaper className="h-4 w-4" />
        {t('nav.newsfeed')}
      </Link>

      {/* Trending */}
      <Link
        href="/trending"
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/trending'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <TrendingUp className="h-4 w-4" />
        {t('nav.trending')}
      </Link>

      {/* Notifications. Added at P2.6cd so `/notifications` is reachable — a route nothing
          links to is not a surface. Styled with the same legacy classes as its siblings on
          purpose: this shell is rebuilt wholesale at P3.4, and matching it now costs less than
          a single row of new design that gets thrown away. P3.4 replaces this link with the
          topbar bell (which is where the unread badge belongs; deliberately not added here,
          since mounting `useUnreadNotificationCount` in the shell would start the 30s poll on
          every page and that is a shell-level decision). */}
      <Link
        href="/notifications"
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/notifications'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Bell className="h-4 w-4" />
        {t('nav.notifications')}
      </Link>

      {/* Friends collapsible */}
      <div>
        <button
          onClick={() => setFriendsOpen((v) => !v)}
          className={cn(
            'flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
            isFriendsActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4" />
            {t('nav.friends')}
          </div>
          <div className="flex items-center gap-1.5">
            {pendingCount > 0 && (
              <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', friendsOpen && 'rotate-180')}
            />
          </div>
        </button>

        {friendsOpen && (
          <div className="ml-3 mt-1 space-y-0.5 border-l pl-3">
            {friendSubItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClick}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                {item.href === '/friends/requests' && pendingCount > 0 && (
                  <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Chats */}
      <Link
        href="/chats"
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/chats' || pathname.startsWith('/chats')
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <MessageCircle className="h-4 w-4" />
        {t('nav.chats')}
      </Link>

      {/* Profile */}
      <Link
        href="/profile"
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/profile'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <User className="h-4 w-4" />
        {t('nav.profile')}
      </Link>

      {/* Dashboard */}
      <Link
        href="/dashboard"
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname === '/dashboard'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <LayoutDashboard className="h-4 w-4" />
        {t('nav.dashboard')}
      </Link>
    </nav>
  );
}

function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <Globe className="h-4 w-4 shrink-0" />
      <span>{locale === 'vi' ? 'Tiếng Việt' : 'English'}</span>
      <span className="ml-auto text-xs bg-muted rounded px-1.5 py-0.5 font-mono uppercase">
        {locale === 'vi' ? 'EN' : 'VI'}
      </span>
    </button>
  );
}

function UserMenu() {
  const { data: profile } = useProfile();
  const { mutate: logout } = useLogout();
  const t = useT();

  const initials = profile?.fullname
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatarColor = getNeutralAvatarColor(profile?.id ?? 'default');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer outline-none">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.profilePictureUrl} />
          <AvatarFallback className={`${avatarColor} text-white text-xs`} suppressHydrationWarning>
            {initials ?? '?'}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium truncate max-w-[140px]" suppressHydrationWarning>
          {profile?.fullname ?? '...'}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
        <DropdownMenuItem render={<Link href="/profile" />}>
          <User className="h-4 w-4" />
          {t('nav.profile')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} variant="destructive">
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const t = useT();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <Users className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg">{t('app.name')}</span>
      </div>

      <Separator />

      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <NavLinks onClick={onNavClick} />
      </div>

      <Separator />

      <div className="px-3 pt-2 pb-1">
        <LocaleSwitcher />
      </div>

      <div className="p-3 pt-1">
        <UserMenu />
      </div>
    </div>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = pathname.startsWith('/chats');

  return (
    /**
     * A flex column when the route is full-bleed, so its content can claim the height left over
     * after the chrome above it without anyone having to know how tall that chrome is.
     *
     * The Twilio messenger did know: `h-[calc(100vh-48px)]` on mobile, `h-screen` on desktop. The
     * search bar is actually 65px and the mobile header 57px, so both numbers were wrong and the
     * page carried a stray scrollbar. Numbers like these cannot stay right — the chrome is rebuilt
     * at P3.4 — so the replacement measures nothing and simply divides the space.
     */
    <main className={cn('md:ml-64', isFullBleed && 'flex min-h-0 flex-1 flex-col')}>
      {/* Spans the full width of this content region (viewport minus the sidebar), not the
          max-w-5xl box below it, so it reaches all the way to the right edge of the screen.
          Only sticky at md+ — below that, the mobile header above is already sticky at top-0,
          and stacking two independent top-0 stickies would overlap them. */}
      <div className="md:sticky md:top-0 z-30 shrink-0 border-b bg-card px-4 sm:px-6 lg:px-8 py-3">
        <SearchBar />
      </div>

      {isFullBleed ? (
        <div className="min-h-0 flex-1">{children}</div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      )}
    </main>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { data: profile } = useProfile();

  /**
   * `/chats` fills the viewport exactly instead of growing the page.
   *
   * The shell is a flex column of fixed height only for that route; every other page keeps
   * `min-h-screen` and scrolls normally, which is what a feed has to do. Duplicated from
   * `MainContent` rather than lifted into context because it is two lines and this whole shell is
   * replaced at P3.4.
   */
  const isFullBleed = pathname.startsWith('/chats');

  useEffect(() => {
    if (!profile) return;
    // Keep the middleware cookie in sync so the next navigation doesn't need this
    // client-side check at all — and catch admins who shouldn't be in the regular
    // app right now, in case this render beat the cookie-based redirect to it.
    setRoleCookie(profile.role === 'ADMIN');
    if (profile.role === 'ADMIN') router.replace('/admin/moderation');
  }, [profile, router]);

  return (
    /**
     * THE ONE CHAT CONNECTION FOR THE WHOLE APP, mounted here rather than per screen.
     *
     * Consequence, stated because it is easy to mount and not notice: every page under `(main)`
     * now opens a Stream websocket and asks the backend for a chat token. That is deliberate — the
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
          'bg-background',
          isFullBleed ? 'flex h-[100dvh] flex-col overflow-hidden' : 'min-h-screen'
        )}
      >
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
          <SidebarContent />
        </aside>

        {/* Mobile header */}
        <div className="md:hidden flex shrink-0 items-center justify-between border-b px-4 py-3 bg-card sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">{t('app.name')}</span>
          </div>

          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent transition-colors cursor-pointer">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main content */}
        <MainContent>{children}</MainContent>

        {/* Floating chat. Hides itself on `/chats`, which is the same conversations full-screen. */}
        <ChatDock />
      </div>
    </ChatClientProvider>
  );
}
