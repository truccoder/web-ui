'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { formatDate, useIntlLocale } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
import { usePersonalAccessTokens, useRevokeToken } from '../hooks';
import { SYNC_BASE_URL } from '../lib/sync-url';
import { tokenExpiry } from '../lib/token-expiry';
import type { PersonalAccessToken } from '../types/knowledge';
import { CreateTokenDialog } from './create-token-dialog';

/**
 * Personal access tokens for the external vault client.
 *
 * WHAT THIS SCREEN IS FOR: these tokens are the app's whole part in the Obsidian-vault flow. The
 * syncing endpoints (`/knowledge/sync/pull|push`) authenticate with one of these rather than the
 * session JWT and are called by the vault client, not by this browser — so there is nothing here
 * that tests or exercises a token, only issuing and revoking.
 *
 * `lastUsedAt` IS THE ONLY EVIDENCE A TOKEN WAS EVER USED, and it stays null until the vault client
 * authenticates with it. It is shown because "never used" is exactly what you want to know before
 * revoking something.
 *
 * THE ROW NOW ANSWERS "WHICH ONE IS THIS?" BEFORE IT OFFERS TO DESTROY IT. It used to carry a name
 * and a last-used line and nothing else, which is not enough to tell two tokens apart when both are
 * called "laptop" — and the button beside them is irreversible. `createdAt` and `expiresAt` settled
 * it for tokens made on different days; `tokenPrefix` (B29, closed 30/08) is what settles it
 * outright even for two same-named tokens created the same day — the row shows it in monospace
 * right under the name, ellipsised because it is deliberately a fragment, not the whole secret.
 * `null` on a token created before that column existed, in which case the row falls back to
 * `createdAt`/`expiresAt` alone, same as before.
 */
export function TokenList() {
  const t = useT();
  const localeTag = useIntlLocale();
  const { data: tokens, isPending, isError, error } = usePersonalAccessTokens();
  const revoke = useRevokeToken();
  const [creating, setCreating] = React.useState(false);
  const [pending, setPending] = React.useState<PersonalAccessToken | null>(null);

  /**
   * The clock is read ONCE PER MOUNT, through a lazy initialiser, rather than on every render.
   *
   * `Date.now()` in the render body is impure — two renders of the same list could disagree, and
   * `react-hooks/purity` rejects it outright. Freezing it is also the behaviour we want: these
   * labels have day granularity, so a badge reading "13 days" has no business changing because
   * something unrelated on the page re-rendered.
   */
  const [now] = React.useState(() => Date.now());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-nx-title-sm text-nx-text-primary">{t('knowledge.tokens.title')}</h2>
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setCreating(true)}
        >
          {t('knowledge.tokens.create')}
        </Button>
      </div>

      {/* OUTSIDE THE EMPTY STATE ON PURPOSE. This sentence used to live only in `emptyDesc`, so
          the one explanation of what these are for disappeared the moment the first token
          existed — leaving a list of secrets with no statement of what they plug into. */}
      <p className="text-nx-body-sm text-nx-text-secondary">
        {t('knowledge.tokens.sectionHint', { url: SYNC_BASE_URL })}
      </p>

      {isPending ? (
        <Skeleton lines={3} />
      ) : isError ? (
        <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(error, t('knowledge.tokens.loadError'))}
        </p>
      ) : tokens.length === 0 ? (
        <EmptyState
          compact
          title={t('knowledge.tokens.emptyTitle')}
          description={t('knowledge.tokens.emptyDesc')}
        />
      ) : (
        <ul className="divide-y divide-nx-border-subtle">
          {tokens.map((token) => {
            const expiry = tokenExpiry(token.expiresAt, now);
            const expired = expiry.kind === 'expired';

            // Built as parts and joined, so a token missing `createdAt` does not leave a stray
            // separator behind — the field is optional on the wire like everything else here.
            const meta = [
              formatDate(token.createdAt ?? undefined, localeTag)
                ? t('knowledge.tokens.createdOn', {
                    date: formatDate(token.createdAt ?? undefined, localeTag) as string,
                  })
                : null,
              token.lastUsedAt
                ? t('knowledge.tokens.lastUsed', {
                    date: formatDate(token.lastUsedAt, localeTag) ?? '',
                  })
                : t('knowledge.tokens.neverUsed'),
              expiry.kind === 'never'
                ? t('knowledge.tokens.neverExpires')
                : expiry.kind === 'active'
                  ? t('knowledge.tokens.expiresOn', {
                      date: formatDate(token.expiresAt ?? undefined, localeTag) ?? '',
                    })
                  : expired
                    ? t('knowledge.tokens.expiredHint')
                    : null,
            ].filter(Boolean);

            return (
              <li key={token.id} className="flex items-center gap-3 py-2">
                {/* Dimmed rather than hidden: an expired token is still a row you have to find
                    and revoke, so it has to stay legible while reading as inactive. */}
                <div className={`min-w-0 flex-1 ${expired ? 'opacity-60' : ''}`}>
                  <div className="truncate text-nx-body-sm text-nx-text-primary">{token.name}</div>
                  {token.tokenPrefix && (
                    <div className="truncate font-mono text-nx-caption text-nx-text-muted">
                      {token.tokenPrefix}…
                    </div>
                  )}
                  <div className="text-nx-caption text-nx-text-muted">{meta.join(' · ')}</div>
                </div>

                {/* WORDS, NOT JUST A TINT. §12 forbids colour carrying meaning on its own, and
                    "this credential is dead" is exactly the kind of meaning nobody may miss. */}
                {expired && <Badge variant="danger">{t('knowledge.tokens.expired')}</Badge>}
                {expiry.kind === 'today' && (
                  <Badge variant="warning">{t('knowledge.tokens.expiresToday')}</Badge>
                )}
                {expiry.kind === 'soon' && (
                  <Badge variant="warning">
                    {t('knowledge.tokens.expiresInDays', { days: expiry.days })}
                  </Badge>
                )}

                {/* The badge shows the short label because the row has no space for the sentence;
                    the full one — which is where the AI-context consequence is stated — rides
                    along as a tooltip. `Badge` takes no `title`, hence the wrapper. */}
                {token.vaultPermission && (
                  <span title={t(`knowledge.vaultPermission.${token.vaultPermission}`)}>
                    <Badge>{t(`knowledge.vaultPermissionShort.${token.vaultPermission}`)}</Badge>
                  </span>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  // Named, so a screen reader hears which token it is about to destroy. Every row
                  // used to announce the identical word "Revoke". Same treatment as
                  // `friends.all.unfriendAria`.
                  aria-label={t('knowledge.tokens.revokeAria', { name: token.name ?? '' })}
                  disabled={token.id == null}
                  onClick={() => {
                    // Clear a previous failure so the dialog never opens showing an error that
                    // belonged to a different token.
                    revoke.reset();
                    setPending(token);
                  }}
                >
                  {t('knowledge.tokens.revoke')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <CreateTokenDialog open={creating} onClose={() => setCreating(false)} />

      {/**
       * REVOKING ASKS FIRST, AND SAYS WHAT IT COSTS.
       *
       * It was a single click with no confirmation and no undo, on an action that silently breaks
       * whatever app is holding the token — while unfriending someone, three hundred lines away in
       * `friendships`, has asked for confirmation all along. The pattern is borrowed from there
       * wholesale rather than reinvented.
       *
       * The error lives INSIDE this dialog. At the bottom of the list it belonged to no row in
       * particular, so with several tokens on screen there was no way to tell which revoke failed.
       * A 404 is real here (unlike `markAsRead` in notifications, which returns 200 for anything),
       * so the branch is worth showing rather than assuming away.
       */}
      <Dialog
        open={pending != null}
        onClose={() => setPending(null)}
        title={t('knowledge.tokens.revokeTitle')}
        description={t('knowledge.tokens.revokeDesc', { name: pending?.name ?? '' })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t('knowledge.tokens.revokeCancel')}
            </Button>
            <Button
              variant="danger"
              loading={revoke.isPending}
              disabled={revoke.isPending}
              onClick={() => {
                if (pending?.id == null) return;
                revoke.mutate(pending.id, { onSuccess: () => setPending(null) });
              }}
            >
              {t('knowledge.tokens.revokeConfirm')}
            </Button>
          </>
        }
      >
        {revoke.isError && (
          <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
            {getErrorMessage(revoke.error, t('knowledge.tokens.revokeError'))}
          </p>
        )}
      </Dialog>
    </div>
  );
}
