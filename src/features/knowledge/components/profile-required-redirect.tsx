'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { onProfileRequired } from '@/core/api/axios';

/**
 * The shell-level listener for a 428 from anywhere.
 *
 * `core/api/axios.ts` raises `onProfileRequired` whenever a request comes back 428 — which in
 * this app always means the Professional Profile is missing. `explain-post-action.tsx` handles
 * its own 428 inline with a CTA; this is the net for a 428 from any other surface (a matchmaking
 * suggestion, a future endpoint), routing to the wizard with a `?next=` back so finishing returns
 * the reader to where they were.
 *
 * RENDERS NOTHING. Mounted once, beside `AuthRequiredPrompt` in the shell, signed-in only. Skips
 * when already on `/onboarding/*` so a 428 fired from the wizard's own load cannot loop.
 */
export function ProfileRequiredRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onProfileRequired(() => {
      if (pathname.startsWith('/onboarding')) return;
      const here = searchParams.toString() ? `${pathname}?${searchParams}` : pathname;
      router.push(`/onboarding/professional?next=${encodeURIComponent(here)}`);
    });
    return () => {
      unsubscribe();
    };
  }, [router, pathname, searchParams]);

  return null;
}
