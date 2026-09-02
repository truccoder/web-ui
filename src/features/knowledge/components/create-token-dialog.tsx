'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/shared/components';
import { getErrorDetails, getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useCreateToken } from '../hooks';
import { SYNC_BASE_URL } from '../lib/sync-url';
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
 * opposite of what the token does. The labels now also carry the part nothing in the product used
 * to say anywhere: `ExplanationService.loadVaultContext` returns null unless the user holds a
 * BIDIRECTIONAL token, so this select is also the on/off switch for "may the AI read my vault".
 *
 * TWO GUARDS AROUND THE SECRET, both closing a way the only copy of it used to vanish in silence:
 *
 *  - The clipboard call can be denied outright. It used to fail into an empty catch, so the button
 *    did not react at all — indistinguishable from a copy that worked.
 *  - `Dialog` calls `onClose` for Escape AND a scrim click as well as the footer button, so the
 *    secret was one stray keypress from being gone. `close` asks first when nothing has been
 *    copied yet; `discard` is the only path that actually throws it away.
 */
export interface CreateTokenDialogProps {
  open: boolean;
  onClose: () => void;
}

const PERMISSIONS: VaultPermission[] = ['WRITE_ONLY', 'BIDIRECTIONAL'];

/**
 * Lifetimes offered at creation, in days — `null` is the backend's "never expires".
 *
 * DEFAULTING TO 90 RATHER THAN NEVER IS THE POINT OF THE CONTROL. `CreateTokenRequestDto` has
 * accepted `expiresInDays` all along and this dialog never sent it, so every token minted from the
 * UI was permanent: a long-lived credential handed to a third-party app, by a user with no way to
 * know they had chosen that. "Never" is still offered — it is the right answer for a machine that
 * must not stop syncing — but it now has to be picked.
 */
const EXPIRY_OPTIONS: Array<{ value: string; days: number | null; labelKey: string }> = [
  { value: '30', days: 30, labelKey: 'knowledge.tokens.expiry30' },
  { value: '90', days: 90, labelKey: 'knowledge.tokens.expiry90' },
  { value: '365', days: 365, labelKey: 'knowledge.tokens.expiry365' },
  { value: 'never', days: null, labelKey: 'knowledge.tokens.expiryNever' },
];

const DEFAULT_EXPIRY = '90';

export function CreateTokenDialog({ open, onClose }: CreateTokenDialogProps) {
  const t = useT();
  const create = useCreateToken();
  const [name, setName] = React.useState('');
  const [permission, setPermission] = React.useState<VaultPermission>('WRITE_ONLY');
  const [expiry, setExpiry] = React.useState<string>(DEFAULT_EXPIRY);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  // Tracks that the value reached the clipboard AT LEAST ONCE, which is what decides whether
  // closing is safe. Separate from `copied`, which is only the transient label on the button.
  const [everCopied, setEverCopied] = React.useState(false);
  const [confirmingClose, setConfirmingClose] = React.useState(false);

  // The button reverts to "Copy" so a second copy still gives feedback. A stuck "Copied" made the
  // control look inert exactly when someone was retrying because they were unsure.
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const discard = () => {
    // Everything about this dialog is single-use: the secret must not survive it, and a reopened
    // dialog must start from a clean form rather than the last mint's leftovers.
    setName('');
    setPermission('WRITE_ONLY');
    setExpiry(DEFAULT_EXPIRY);
    setSecret(null);
    setCopied(false);
    setCopyFailed(false);
    setEverCopied(false);
    setConfirmingClose(false);
    create.reset();
    onClose();
  };

  /**
   * The close path every dismissal goes through — footer button, Escape and scrim click alike.
   *
   * It only asks when there is something to lose: a secret on screen that has never been copied.
   * Asking on the form phase, or after a successful copy, would be a confirmation people learn to
   * click through, which is how a guard stops guarding anything.
   */
  const close = () => {
    if (secret && !everCopied) {
      setConfirmingClose(true);
      return;
    }
    discard();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const days = EXPIRY_OPTIONS.find((option) => option.value === expiry)?.days ?? null;
    create.mutate(
      {
        name: name.trim(),
        vaultPermission: permission,
        // Omitted entirely rather than sent as null: `createToken` sets an expiry only when the
        // field is non-null AND positive, so an absent field is exactly "never expires".
        ...(days == null ? {} : { expiresInDays: days }),
      },
      { onSuccess: (created) => setSecret(created.token ?? null) }
    );
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setEverCopied(true);
      setCopyFailed(false);
    } catch {
      // Said out loud rather than swallowed. The value is selectable on screen, so the recovery is
      // real — but only if the reader is told the button did nothing.
      setCopyFailed(true);
    }
  };

  const details = create.isError ? getErrorDetails(create.error) : [];
  // A 422 names the offending property ("Property name: must not be blank"). ONLY THOSE BELONG ON
  // THE FIELD. Everything else is a dialog-level failure, and it used to be printed under "Token
  // name" regardless — blaming the one control the reader had filled in correctly.
  const nameDetail = details.find((detail) => /\bname\b/i.test(detail));
  const generalError = create.isError
    ? nameDetail
      ? undefined
      : details.length > 0
        ? details.join(' · ')
        : getErrorMessage(create.error, t('knowledge.tokens.createError'))
    : undefined;

  return (
    <>
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
            {/* Read-only rather than plain text so the whole value can be selected with one click
                on a keyboard, and so it wraps predictably — these strings are long. */}
            <input
              readOnly
              value={secret}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-nx-md border border-nx-border-default bg-nx-surface-sunken px-2 py-2 font-mono text-nx-body-sm text-nx-text-primary"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              onClick={copy}
            >
              {copied ? t('knowledge.tokens.copied') : t('knowledge.tokens.copy')}
            </Button>

            {copyFailed && (
              <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
                {t('knowledge.tokens.copyFailed')}
              </p>
            )}

            {/* The token is useless on its own, and this is the only screen that can say where it
                goes — the reader passes through here exactly once. */}
            <div className="border-t border-nx-border-subtle pt-2">
              <h4 className="text-nx-caption text-nx-text-muted">
                {t('knowledge.tokens.nextSteps')}
              </h4>
              <ol className="mt-1 list-inside list-decimal text-nx-caption text-nx-text-secondary">
                <li>{t('knowledge.tokens.nextStep1')}</li>
                <li>{t('knowledge.tokens.nextStep2')}</li>
                <li>{t('knowledge.tokens.nextStep3', { url: SYNC_BASE_URL })}</li>
              </ol>
            </div>
          </div>
        ) : (
          <form id="create-token-form" onSubmit={submit} className="space-y-3">
            <Input
              label={t('knowledge.tokens.name')}
              hint={t('knowledge.tokens.nameHint')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={nameDetail}
            />
            <Select
              label={t('knowledge.tokens.permission')}
              // The hint tracks the selection, so the consequence of the choice is on screen at
              // the moment it is made rather than in a paragraph above it.
              hint={t(`knowledge.vaultPermissionDesc.${permission}`)}
              value={permission}
              onChange={(e) => setPermission(e.target.value as VaultPermission)}
              options={PERMISSIONS.map((value) => ({
                value,
                label: t(`knowledge.vaultPermission.${value}`),
              }))}
            />
            <p className="text-nx-caption text-nx-text-muted">
              {t('knowledge.tokens.permissionLocked')}
            </p>
            <Select
              label={t('knowledge.tokens.expiry')}
              hint={t('knowledge.tokens.expiryHint')}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              options={EXPIRY_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
            />

            {generalError && (
              <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
                {generalError}
              </p>
            )}
          </form>
        )}
      </Dialog>

      {/* A SECOND DIALOG RATHER THAN A BANNER INSIDE THE FIRST. What is being confirmed is the
          dismissal of the dialog underneath, so it has to outlive the moment that dialog would
          have closed — and it has to be able to take the answer "no, put me back". */}
      <Dialog
        open={confirmingClose}
        onClose={() => setConfirmingClose(false)}
        title={t('knowledge.tokens.closeUncopiedTitle')}
        description={t('knowledge.tokens.closeUncopiedDesc')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingClose(false)}>
              {t('knowledge.tokens.closeUncopiedCancel')}
            </Button>
            <Button variant="danger" onClick={discard}>
              {t('knowledge.tokens.closeUncopiedConfirm')}
            </Button>
          </>
        }
      />
    </>
  );
}
