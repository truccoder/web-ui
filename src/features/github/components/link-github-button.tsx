'use client';

import { Button } from '@/shared/components';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useGithubOAuthUrl } from '../hooks/use-github';

/**
 * Starts the GitHub account-linking flow.
 *
 * THIS BUTTON DID NOT EXIST, AND THE REASON IT DID NOT HAS EXPIRED.
 * `useGithubOAuthUrl` and `useLinkGithub` were both written and exported and called by nothing,
 * because B23 recorded that sign-in and linking shared one callback — so the authorisation code
 * could never reach the link step, and offering a button would have been offering a dead end.
 *
 * The backend has since split them, measured rather than assumed:
 *
 *   GET /auth/github/url    → redirect_uri = /oauth/github/callback      (sign in)
 *   GET /github/oauth/url   → redirect_uri = /settings/github/callback   (link)
 *
 * Two different destinations, so the code now arrives where it is meant to. What was missing on
 * this side was the second route — see `app/settings/github/callback`.
 *
 * IT IS A MUTATION, NOT A LINK. The URL carries a `client_id` and a `state` the server issues
 * per request, so it cannot be baked into an `href`: it is fetched when pressed and the browser
 * is sent straight on. That also keeps the round trip out of every render of a profile page.
 */
export interface LinkGithubButtonProps {
  className?: string;
}

export function LinkGithubButton({ className }: LinkGithubButtonProps) {
  const t = useT();
  const oauth = useGithubOAuthUrl({
    onSuccess: (data) => {
      // A full navigation, not `router.push`: the destination is github.com.
      if (data?.oauthUrl) window.location.href = data.oauthUrl;
    },
  });

  return (
    <div className={className}>
      <Button
        size="sm"
        variant="secondary"
        loading={oauth.isPending}
        onClick={() => oauth.mutate()}
      >
        {t('github.link.action')}
      </Button>

      {oauth.isError && (
        <p
          role="alert"
          className="mt-[var(--nx-space-tight)] text-nx-body-sm text-nx-status-danger-fg"
        >
          {getErrorMessage(oauth.error, t('github.link.failed'))}
        </p>
      )}
    </div>
  );
}
