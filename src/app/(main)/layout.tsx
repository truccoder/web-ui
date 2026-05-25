'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, User, LogOut, Menu, Users, Newspaper } from 'lucide-react';
import { CommunicationProvider } from '@/components/chat/communication-provider';
import { ChatBox } from '@/components/chat/chat-box';
import { VideoCallModal } from '@/components/call/video-call-modal';
import { VoiceCallModal } from '@/components/call/voice-call-modal';
import { IncomingCallOverlay } from '@/components/call/incoming-call-overlay';
import { cn } from '@/lib/utils';
import { useProfile } from '@/lib/hooks/use-user';
import { useLogout } from '@/lib/hooks/use-auth';
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

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/newsfeed', label: 'Bảng tin', icon: Newspaper },
  { href: '/profile', label: 'Profile', icon: User },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === item.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { data: profile } = useProfile();
  const { mutate: logout } = useLogout();

  const initials = profile?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer outline-none">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.profilePictureUrl} />
          <AvatarFallback className="text-xs">{initials ?? '?'}</AvatarFallback>
        </Avatar>
        <span className="font-medium truncate max-w-[140px]">
          {profile?.fullName ?? 'Loading...'}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
        <DropdownMenuItem render={<Link href="/profile" />}>
          <User className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} variant="destructive">
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommunicationProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-6 py-5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg">ConnectHub</span>
            </div>

            <Separator />

            <div className="flex-1 px-3 py-4">
              <NavLinks />
            </div>

            <Separator />

            <div className="p-3">
              <UserMenu />
            </div>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-card sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">ConnectHub</span>
          </div>

          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent transition-colors cursor-pointer">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="px-6 py-5">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  ConnectHub
                </SheetTitle>
              </SheetHeader>
              <Separator />
              <div className="px-3 py-4">
                <NavLinks />
              </div>
              <Separator />
              <div className="p-3">
                <UserMenu />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Main content */}
        <main className="md:ml-64">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>

        {/* Chat & Call overlays */}
        <ChatBox />
        <VideoCallModal />
        <VoiceCallModal />
        <IncomingCallOverlay />
      </div>
    </CommunicationProvider>
  );
}
