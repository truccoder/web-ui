'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { usePersonalAccessTokens, useRevokeToken } from '../hooks';
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
 */
export function TokenList() {
  const t = useT();
  const { data: tokens, isPending, isError, error } = usePersonalAccessTokens();
  const revoke = useRevokeToken();
  const [creating, setCreating] = React.useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
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

      {isPending ? (
        <Skeleton lines={3} />
      ) : isError ? (
        <p className="text-nx-caption text-nx-status-danger-fg">
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
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-nx-body-sm text-nx-text-primary">{token.name}</div>
                <div className="text-nx-caption text-nx-text-muted">
                  {token.lastUsedAt
                    ? t('knowledge.tokens.lastUsed', {
                        date: new Date(token.lastUsedAt).toLocaleDateString(),
                      })
                    : t('knowledge.tokens.neverUsed')}
                </div>
              </div>

              {token.vaultPermission && (
                <Badge>{t(`knowledge.vaultPermission.${token.vaultPermission}`)}</Badge>
              )}

              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                aria-label={t('knowledge.tokens.revoke')}
                // Scoped to this row so revoking one token does not put every button in the list
                // into a loading state.
                loading={revoke.isPending && revoke.variables === token.id}
                disabled={revoke.isPending || token.id == null}
                onClick={() => token.id != null && revoke.mutate(token.id)}
              >
                {t('knowledge.tokens.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {revoke.isError && (
        <p className="text-nx-caption text-nx-status-danger-fg">
          {/* Worth surfacing: an unknown id really is a 404 here, unlike `markAsRead` in
              notifications which returns 200 for anything. */}
          {getErrorMessage(revoke.error, t('knowledge.tokens.revokeError'))}
        </p>
      )}

      <CreateTokenDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
