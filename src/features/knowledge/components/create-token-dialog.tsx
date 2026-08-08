'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/shared/components';
import { getErrorDetails, getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useCreateToken } from '../hooks';
import type { VaultPermission } from '../types/knowledge';

/**
 * Mint a personal access token for the external vault client.
 *
 * THIS IS A SEPARATE COMPONENT BECAUSE THE SECRET IS SHOWN EXACTLY ONCE. `POST /tokens` is the only
 * response that ever carries `token`; `GET /tokens` omits the field and there is no reveal
 * endpoint. A user who closes this without copying has to revoke and mint another. So the dialog
 * has two distinct phases — the form, then the secret with a copy control and a warning — rather
 * than being a row that appears in the list.
 *
 * The value is held in component state and dropped when the dialog closes. It is deliberately not
 * put in the query cache (see `useCreateToken`), so closing really does discard it.
 *
 * THE PERMISSION LABELS DESCRIBE BEHAVIOUR, NOT THE ENUM. `WRITE_ONLY` is named from the vault's
 * point of view — it means "may only write into the vault", i.e. pull-only as far as this backend
 * is concerned, and `push` rejects it with a 403. Printing the raw name would tell every reader the
 * opposite of what the token does.
 */
export interface CreateTokenDialogProps {
  open: boolean;
  onClose: () => void;
}

const PERMISSIONS: VaultPermission[] = ['WRITE_ONLY', 'BIDIRECTIONAL'];

export function CreateTokenDialog({ open, onClose }: CreateTokenDialogProps) {
  const t = useT();
  const create = useCreateToken();
  const [name, setName] = React.useState('');
  const [permission, setPermission] = React.useState<VaultPermission>('WRITE_ONLY');
  const [secret, setSecret] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const close = () => {
    // Everything about this dialog is single-use: the secret must not survive it, and a reopened
    // dialog must start from a clean form rather than the last mint's leftovers.
    setName('');
    setPermission('WRITE_ONLY');
    setSecret(null);
    setCopied(false);
    create.reset();
    onClose();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), vaultPermission: permission },
      { onSuccess: (created) => setSecret(created.token ?? null) }
    );
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      // Clipboard access can be denied outright; the value is selectable on screen either way, so
      // failing silently here is better than an error about a convenience.
    }
  };

  const details = create.isError ? getErrorDetails(create.error) : [];
  const errorText = create.isError
    ? details.length > 0
      ? details.join(' · ')
      : getErrorMessage(create.error, t('knowledge.tokens.createError'))
    : undefined;

  return (
    <Dialog
      open={open}
      onClose={close}
      title={secret ? t('knowledge.tokens.createdTitle') : t('knowledge.tokens.createTitle')}
      description={secret ? t('knowledge.tokens.onceWarning') : t('knowledge.tokens.createHint')}
      footer={
        secret ? (
          <Button onClick={close}>{t('knowledge.tokens.done')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              {t('knowledge.tokens.cancel')}
            </Button>
            <Button
              type="submit"
              form="create-token-form"
              loading={create.isPending}
              disabled={create.isPending || !name.trim()}
            >
              {t('knowledge.tokens.create')}
            </Button>
          </>
        )
      }
    >
      {secret ? (
        <div className="space-y-2">
          {/* Read-only rather than plain text so the whole value can be selected with one click on
              a keyboard, and so it wraps predictably — these strings are long. */}
          <input
            readOnly
            value={secret}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-nx-md border border-nx-border-default bg-nx-surface-sunken px-2 py-1.5 font-mono text-nx-body-sm text-nx-text-primary"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            onClick={copy}
          >
            {copied ? t('knowledge.tokens.copied') : t('knowledge.tokens.copy')}
          </Button>
        </div>
      ) : (
        <form id="create-token-form" onSubmit={submit} className="space-y-3">
          <Input
            label={t('knowledge.tokens.name')}
            hint={t('knowledge.tokens.nameHint')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errorText}
          />
          <Select
            label={t('knowledge.tokens.permission')}
            value={permission}
            onChange={(e) => setPermission(e.target.value as VaultPermission)}
            options={PERMISSIONS.map((value) => ({
              value,
              label: t(`knowledge.vaultPermission.${value}`),
            }))}
          />
        </form>
      )}
    </Dialog>
  );
}
