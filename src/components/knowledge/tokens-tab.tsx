'use client';

import { useState } from 'react';
import { Copy, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import {
  usePersonalAccessTokens,
  useCreatePersonalAccessToken,
  useRevokePersonalAccessToken,
} from '@/lib/hooks/use-knowledge';
import type { CreateTokenResponse, VaultPermission } from '@/lib/types';

const selectClass =
  'w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function CreateTokenDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const { mutate: createToken, isPending } = useCreatePersonalAccessToken();

  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [vaultPermission, setVaultPermission] = useState<VaultPermission>('WRITE_ONLY');
  // The raw token is only ever present in the create response; once shown it can't be
  // retrieved again, so keep it until the user closes the dialog.
  const [createdToken, setCreatedToken] = useState<CreateTokenResponse | null>(null);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setName('');
      setExpiresInDays('');
      setVaultPermission('WRITE_ONLY');
      setCreatedToken(null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createToken(
      {
        name: name.trim(),
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
        vaultPermission,
      },
      { onSuccess: (token) => setCreatedToken(token) }
    );
  };

  const handleCopy = async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken.token);
    toast.success(t('knowledge.tokens.copied'));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('knowledge.tokens.createTitle')}</DialogTitle>
          {createdToken && <DialogDescription>{t('knowledge.tokens.created')}</DialogDescription>}
        </DialogHeader>

        {createdToken ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs break-all">
                {createdToken.token}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
                {t('knowledge.tokens.copy')}
              </Button>
            </div>
            <Button className="w-full" onClick={() => handleOpenChange(false)}>
              {t('knowledge.tokens.done')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token-name">{t('knowledge.tokens.name')}</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('knowledge.tokens.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="token-expiry">{t('knowledge.tokens.expiresInDays')}</Label>
              <Input
                id="token-expiry"
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('knowledge.tokens.expiresHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="token-permission">{t('knowledge.tokens.permission')}</Label>
              <select
                id="token-permission"
                className={selectClass}
                value={vaultPermission}
                onChange={(e) => setVaultPermission(e.target.value as VaultPermission)}
              >
                <option value="WRITE_ONLY">{t('knowledge.tokens.permissionWriteOnly')}</option>
                <option value="BIDIRECTIONAL">
                  {t('knowledge.tokens.permissionBidirectional')}
                </option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? t('knowledge.tokens.creating') : t('knowledge.tokens.create')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TokensTab() {
  const t = useT();
  const { data: tokens, isLoading, isError } = usePersonalAccessTokens();
  const { mutate: revokeToken, isPending: isRevoking } = useRevokePersonalAccessToken();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{t('knowledge.tabs.tokens')}</CardTitle>
          <CardDescription>{t('knowledge.tokens.desc')}</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('knowledge.tokens.create')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('knowledge.tokens.error')}
          </p>
        )}

        {!isLoading && !isError && (tokens?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <KeyRound className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t('knowledge.tokens.empty')}</p>
          </div>
        )}

        <div className="space-y-2">
          {tokens?.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{token.name}</p>
                  <Badge variant="outline">
                    {token.vaultPermission === 'BIDIRECTIONAL'
                      ? t('knowledge.tokens.permissionBidirectional')
                      : t('knowledge.tokens.permissionWriteOnly')}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {token.lastUsedAt
                    ? t('knowledge.tokens.lastUsed', { date: formatDate(token.lastUsedAt) })
                    : t('knowledge.tokens.neverUsed')}
                  {' · '}
                  {token.expiresAt
                    ? t('knowledge.tokens.expires', { date: formatDate(token.expiresAt) })
                    : t('knowledge.tokens.noExpiry')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isRevoking}
                onClick={() => revokeToken(token.id)}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('knowledge.tokens.revoke')}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <CreateTokenDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
}
