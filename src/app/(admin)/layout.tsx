'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { BrandMark, Button } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { setRoleCookie, useLogout, useMyProfile } from '@/features/security';
import { useT } from '@/core/i18n';

/**
 * The admin shell — rebuilt at P3.4c alongside `(main)`.
 *
 * IT IS A SEPARATE SHELL ON PURPOSE, not a variant of the main one. An `ADMIN` session cannot open
 * any route outside `/admin/**` (the middleware redirects it), so the two shells never render for
 * the same person, share no navigation, and would only be coupled by a `variant` prop that always
 * takes one value per session.
 *
 * THE ROLE CHECK HERE IS DEFENCE IN DEPTH, NOT THE GATE. The middleware routes on the `role`
 * cookie and the backend gates `/v1/api/admin/**` at the URL level in `SecurityConfig`. This
 * effect exists for the window before the cookie is written, and for a session whose role changed
 * server-side. A non-admin who forced their way here would still see nothing but 403s.
 *
 * What changed at P3.4c: `components/ui/button` → `shared/components/Button`, `lib/hooks/use-user`
 * + `use-auth` + `use-admin-role` → `features/security`, `lib/utils` → `shared/lib/cn`, and the
 * invented blue-to-indigo gradient badge → `BrandMark`. Nothing about the structure moved — the
 * header was already two links and a sign-out, which is all a two-page shell needs.
 */

const ADMIN_LINKS = [
  { href: '/admin/moderation', labelKey: 'admin.moderation.title' },
  { href: '/admin/roadmap', labelKey: 'nav.roadmap' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const { mutate: logout } = useLogout();
  const { data: profile, isPending, isError } = useMyProfile();

  useEffect(() => {
    if (isError) {
      router.replace('/login');
      return;
    }
    if (!profile) return;
    setRoleCookie(profile.role === 'ADMIN');
    if (profile.role !== 'ADMIN') router.replace('/newsfeed');
  }, [profile, isError, router]);

  // Nothing of the admin surface renders until the role is known. Flashing the moderation queue
  // at someone who turns out not to be an admin is worse than a spinner.
  if (isPending || !profile || profile.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nx-surface-page">
        <Loader2 className="size-6 animate-spin text-nx-text-muted" aria-label={t('admin.title')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nx-surface-page">
      <header className="border-b border-nx-border-subtle bg-nx-surface-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-5 lg:px-10">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <span className="text-nx-body font-semibold tracking-tight text-nx-text-primary">
              {t('admin.title')}
            </span>
          </div>

          <nav aria-label={t('admin.title')} className="flex items-center gap-1">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={cn(
                  'rounded-nx-sm px-2.5 py-2 text-nx-ui',
                  'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                  pathname === link.href
                    ? 'bg-nx-surface-hover font-medium text-nx-text-primary'
                    : 'text-nx-text-secondary hover:bg-nx-surface-hover hover:text-nx-text-primary'
                )}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <Button variant="ghost" size="sm" icon={<LogOut />} onClick={() => logout()}>
            {t('nav.logout')}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-5 lg:px-10">{children}</main>
    </div>
  );
}
