'use client';

import { Button } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { OAuthProvider } from '../types/auth';
import { useOAuthUrl } from '../hooks/use-oauth';
import { GithubIcon, GoogleIcon } from './provider-icons';

/**
 * "Continue with Google / GitHub" buttons plus a labelled divider, shared by the login
 * and register screens (OAuth is one unified sign-up/sign-in path on the backend).
 *
 * Secondary variant, never primary: constitution §3 allows one primary action per view,
 * which is the email submit. The provider URL is prefetched (static, cached for the page
 * session) so the click is an instant redirect rather than a fetch-then-wait.
 */
export function OAuthButtons() {
  const t = useT();
  const google = useOAuthUrl('google');
  const github = useOAuthUrl('github');

  const redirect = (url?: string) => {
    if (url) window.location.assign(url);
  };

  const providers: {
    provider: OAuthProvider;
    query: ReturnType<typeof useOAuthUrl>;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { provider: 'google', query: google, label: t('auth.oauth.google'), icon: <GoogleIcon /> },
    { provider: 'github', query: github, label: t('auth.oauth.github'), icon: <GithubIcon /> },
  ];

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-nx-border-subtle" />
        <span className="text-nx-caption text-nx-text-muted">{t('auth.oauth.divider')}</span>
        <span className="h-px flex-1 bg-nx-border-subtle" />
      </div>

      {/* ONE ROW FROM `sm` UP, STACKED BELOW IT.
          Two full-width secondary buttons stacked cost 96px of the card and, being the tallest
          pair of controls on the screen, read as heavier than the primary submit above them —
          which inverts the one-primary-action rule this component's header already cites. Side by
          side they cost 40 and sit clearly below the submit in weight.
          It stays stacked below `sm` because the labels are `Tiếp tục với GitHub`-length: at 390
          the card's inner width is ~310, and two of those in a row would truncate. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {providers.map(({ provider, query, label, icon }) => (
          <Button
            key={provider}
            type="button"
            variant="secondary"
            // `min-w-0` lets the pair actually share the row: without it a flex item refuses to
            // shrink below its content and the longer label pushes the shorter button off.
            className="w-full min-w-0 sm:flex-1"
            icon={icon}
            // Disabled only on hard error (the URL endpoint failed); while loading, the
            // button shows a spinner via `loading`.
            loading={query.isPending}
            disabled={query.isError}
            onClick={() => redirect(query.data?.oauthUrl)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
