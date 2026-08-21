'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, EmptyState, Skeleton } from '@/shared/components';
import { useLinkGithub } from '@/features/github';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';

/**
 * Where GitHub sends the reader back after they authorise the LINK (not the sign-in).
 *
 * THE BACKEND HAS NAMED THIS URL ALL ALONG AND NOTHING SERVED IT. `GET /github/oauth/url`
 * answers a GitHub authorise link whose `redirect_uri` is exactly `/settings/github/callback`;
 * that route did not exist, so anyone who reached the consent screen was returned to a 404 with
 * their authorisation code in the address bar. It is the last unrun wire of the GitHub feature —
 * the api layer, the hooks and the stats card were all already written.
 *
 * IT IS A DIFFERENT ROUTE FROM `/oauth/github/callback`, and the difference is the whole point.
 * That one establishes a session for someone signing in; this one attaches a GitHub identity to
 * a session that already exists. They were one callback once, which is what B23 recorded as the
 * reason linking could not work; the backend split them, and this is the second half.
 *
 * IT SITS UNDER `(main)`, SO IT IS BEHIND THE SESSION GATE. Correct: you cannot link an account
 * to nobody. A reader who lost their session mid-flow lands on `/login` rather than on a page
 * that would fail confusingly.
 */
export default function GithubLinkCallbackPage() {
  return (
    // `useSearchParams` needs a Suspense boundary in the App Router.
    <Suspense fallback={<Skeleton lines={3} />}>
      <GithubLinkCallback />
    </Suspense>
  );
}

function GithubLinkCallback() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();

  const code = params.get('code');
  // GitHub reports a refusal as `error=access_denied` rather than by omitting the code, and that
  // is a normal outcome — the reader pressed Cancel — not a failure to report as one.
  const denied = params.get('error');

  const link = useLinkGithub({
    onSuccess: () => router.replace('/profile'),
  });

  /**
   * FIRED EXACTLY ONCE. An authorisation code is single-use: GitHub rejects the second exchange,
   * so a re-run under React's development double-invoke would turn a success into an error the
   * reader sees. The ref guards it rather than an empty dependency array, which does not.
   */
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !code || denied) return;
    sent.current = true;
    link.mutate({ code });
  }, [code, denied, link]);

  if (denied) {
    return (
      <EmptyState
        title={t('github.link.cancelledTitle')}
        description={t('github.link.cancelledDesc')}
      />
    );
  }

  if (!code) {
    return (
      <EmptyState title={t('github.link.noCodeTitle')} description={t('github.link.noCodeDesc')} />
    );
  }

  if (link.isError) {
    return (
      <EmptyState
        title={t('github.link.failed')}
        description={getErrorMessage(link.error, t('github.link.failed'))}
      />
    );
  }

  // Success redirects, so this is the only state left to draw.
  return (
    <Card>
      <p className="text-nx-body-sm text-nx-text-secondary">{t('github.link.linking')}</p>
      <Skeleton lines={2} />
    </Card>
  );
}
