'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/lib/hooks/use-auth';
import { useProfile } from '@/lib/hooks/use-user';
import { setRoleCookie } from '@/lib/hooks/use-admin-role';
import { useT } from '@/lib/i18n';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { data: profile, isLoading, isError } = useProfile();
  const t = useT();

  useEffect(() => {
    if (isError) {
      router.replace('/login');
      return;
    }
    if (!profile) return;
    setRoleCookie(profile.role === 'ADMIN');
    if (profile.role !== 'ADMIN') router.replace('/dashboard');
  }, [profile, isError, router]);

  if (isLoading || !profile || profile.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">{t('admin.title')}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-2">
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
