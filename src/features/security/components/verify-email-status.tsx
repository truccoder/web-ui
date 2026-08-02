'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button, Card } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useVerifyEmail } from '../hooks/use-recovery';

/**
 * Reads the `token` from the verification-link URL and activates the account on mount.
 * Terminal states only — no session is established here (email verification precedes
 * sign-in), so success ends on a "continue to sign in" card rather than a redirect.
 */
export function VerifyEmailStatus() {
  const t = useT();
  const token = useSearchParams().get('token');
  const verify = useVerifyEmail();
  // Fire once: the token is single-use and effects double-invoke in dev strict mode.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !token) return;
    fired.current = true;
    verify.mutate({ token });
  }, [token, verify]);

  if (!token) {
    return (
      <StatusCard
        tone="danger"
        icon={<XCircle className="size-6" aria-hidden />}
        title={t('auth.verifyEmail.invalidTitle')}
        desc={t('auth.verifyEmail.invalidDesc')}
        action={
          <Link href="/login" className="mt-6 block">
            <Button variant="secondary" className="w-full">
              {t('auth.verifyEmail.backToLogin')}
            </Button>
          </Link>
        }
      />
    );
  }

  if (verify.isError) {
    return (
      <StatusCard
        tone="danger"
        icon={<XCircle className="size-6" aria-hidden />}
        title={t('auth.verifyEmail.failedTitle')}
        desc={getErrorMessage(verify.error, t('auth.verifyEmail.failedDesc'))}
        action={
          <Link href="/login" className="mt-6 block">
            <Button variant="secondary" className="w-full">
              {t('auth.verifyEmail.backToLogin')}
            </Button>
          </Link>
        }
      />
    );
  }

  if (verify.isSuccess) {
    return (
      <StatusCard
        tone="success"
        icon={<CheckCircle2 className="size-6" aria-hidden />}
        title={t('auth.verifyEmail.verifiedTitle')}
        desc={t('auth.verifyEmail.verifiedDesc')}
        action={
          <Link href="/login" className="mt-6 block">
            <Button className="w-full">{t('auth.verifyEmail.continue')}</Button>
          </Link>
        }
      />
    );
  }

  // idle (pre-mutation) or pending
  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Loader2 className="size-8 animate-spin text-nx-accent" aria-hidden />
        <p className="text-nx-body-sm text-nx-text-secondary">{t('auth.verifyEmail.verifying')}</p>
      </div>
    </Card>
  );
}

/**
 * Local status-card shape (icon circle + title + desc + action), shared by this file's
 * terminal states. A cross-flow extraction (register success, oauth error, request-link
 * success all repeat this) is a good simplify pass later — kept local for now.
 */
function StatusCard({
  tone,
  icon,
  title,
  desc,
  action,
}: {
  tone: 'success' | 'danger';
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  const toneCls =
    tone === 'success'
      ? 'bg-nx-status-success-bg text-nx-status-success-fg'
      : 'bg-nx-status-danger-bg text-nx-status-danger-fg';
  return (
    <Card padding={24} className="w-full">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={`flex size-12 items-center justify-center rounded-nx-full ${toneCls}`}>
          {icon}
        </span>
        <h1 className="text-nx-title font-semibold text-nx-text-primary">{title}</h1>
        <p className="text-nx-body-sm text-nx-text-secondary">{desc}</p>
      </div>
      {action}
    </Card>
  );
}
