'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog } from '@/shared/components';
import { onAuthRequired, onSessionExpired } from '@/core/api/axios';
import { useT } from '@/core/i18n';
import { useAuthHref } from './session-presence';

/**
 * The invitation a guest gets when they reach for something only an account can do.
 *
 * IT IS A PROMPT, NOT A REDIRECT, and that is the whole point of it existing. A reader who taps a
 * reaction on a post they are halfway through has told us they want in — sending them to `/login`
 * at that moment costs them the post and reads as an error. The dialog keeps the page behind it
 * and both of its exits carry `next`, so signing in or signing up returns them to the thing they
 * pressed.
 */
export function SignInPrompt({
  open,
  onClose,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}) {
  const t = useT();
  const router = useRouter();
  const loginHref = useAuthHref('/login');
  const registerHref = useAuthHref('/register');

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? t('guest.prompt.title')}
      description={description ?? t('guest.prompt.description')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('guest.prompt.dismiss')}
          </Button>
          {/* Buttons rather than links, because `Dialog`'s focus contract owns what is inside the
              panel — an anchor navigating out from under it skips the close. `go` closes first. */}
          <Button variant="secondary" onClick={() => go(registerHref)}>
            {t('guest.register')}
          </Button>
          <Button onClick={() => go(loginHref)}>{t('guest.signIn')}</Button>
        </>
      }
    />
  );
}

/**
 * THE ONE LISTENER. Mounted once by the shell; opens the prompt whenever the transport declines a
 * write for want of a session (`core/api/axios`'s `onAuthRequired`).
 *
 * WHY THE SHELL AND NOT EACH CONTROL. The alternative is remembering to gate every button that
 * writes — the reaction bar, the RSVP row, the poll, the report menu, the book shelf, the comment
 * composer, and whatever is added next month. That list is never finished, and the one that gets
 * missed fails silently. Here, a guest pressing ANY of them gets this dialog, including the ones
 * nobody thought about, because the request itself is what raises it.
 *
 * Controls that can gate themselves still should — a disabled-looking composer is better than a
 * modal — but that is now an improvement rather than the only line of defence.
 */
export function AuthRequiredPrompt() {
  const [open, setOpen] = useState(false);

  // The unsubscribe is wrapped rather than returned directly: `Set.delete` answers a boolean, and
  // React reads any return value from a cleanup as the cleanup itself.
  useEffect(() => {
    const unsubscribe = onAuthRequired(() => setOpen(true));
    return () => {
      unsubscribe();
    };
  }, []);

  return <SignInPrompt open={open} onClose={() => setOpen(false)} />;
}

/**
 * The dialog a signed-in reader gets when their refresh token is rejected mid-session
 * (`core/api/axios.ts`'s response interceptor) — in place of the silent hard-redirect that used
 * to fire from inside the interceptor with no explanation.
 *
 * A HARD NAVIGATION, NOT `router.push`, and deliberately so: `axios.ts`'s own comment on this
 * path explains that `src/middleware.ts` decides `/login` vs `/newsfeed` off the `session`
 * cookie, which `clearSessionFlags` has already cleared by the time this dialog can be
 * confirmed — a full navigation reads it fresh instead of trusting client-side router state that
 * was current before the session died.
 */
export function SessionExpiredPrompt() {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => setOpen(true));
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title={t('session.expiredTitle')}
      description={t('session.expiredDesc')}
      footer={
        <Button onClick={() => (window.location.href = '/login')}>{t('session.expiredCta')}</Button>
      }
    />
  );
}
