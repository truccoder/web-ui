'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { useSyncPaymentStatus } from '../hooks';

/**
 * What `/payment/success` shows after MoMo redirects the buyer back.
 *
 * IT POLLS, AND THAT IS THE WHOLE POINT OF REBUILDING IT. MoMo confirms a payment to the backend
 * over a server-to-server webhook, which RACES the browser redirect — arriving before the webhook
 * lands is the normal case, not the exception. The legacy version asked once and rendered
 * "Payment failed" on `paid: false`, so a buyer whose money had left their account was told the
 * payment failed. That is the defect this replaces.
 *
 * POLLING IS SAFE BECAUSE THE BACKEND GUARANTEES IT, not because it seems harmless. `syncPaymentStatus`
 * is a write — it completes the purchase, stamps `paidAt`, and notifies the author — but
 * `MomoService.applyResult` returns early on an already-`COMPLETED` purchase without rewriting
 * fields or re-notifying, with a comment in the backend saying exactly that.
 *
 * THE LOOP LIVES HERE, NOT IN THE HOOK. A `useQuery` with `refetchInterval` would hand the timing
 * of a payment-completing write to React Query's refetch policy (mount, reconnect, retry). Here the
 * bound and the give-up state are visible next to the copy that explains them to the buyer.
 *
 * RUNNING OUT OF ATTEMPTS IS NOT FAILURE. Unconfirmed means "we could not confirm yet", and it gets
 * its own state — telling someone their payment failed when the truth is that the webhook is slow
 * is the same mistake as the legacy version, one step later.
 */

/** Roughly 12 seconds of waiting before falling back to "not confirmed yet". */
const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 2000;

type Phase = 'checking' | 'paid' | 'unconfirmed' | 'failed';

export interface PaymentResultPanelProps {
  /** MoMo's `orderId` query parameter — the backend's own `transactionRef`. */
  transactionRef: string | null;
}

export function PaymentResultPanel({ transactionRef }: PaymentResultPanelProps) {
  const t = useT();
  const { mutate: sync } = useSyncPaymentStatus();
  const [phase, setPhase] = React.useState<Phase>('checking');

  const attemptsRef = React.useRef(0);
  const startedForRef = React.useRef<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // `mutate` is stable, and the callbacks below only ever set state in response to a settled
  // request — never synchronously inside the effect body, which `react-hooks/set-state-in-effect`
  // forbids and which would cascade renders.
  React.useEffect(() => {
    if (!transactionRef || startedForRef.current === transactionRef) return;
    startedForRef.current = transactionRef;
    attemptsRef.current = 0;

    const attempt = () => {
      attemptsRef.current += 1;
      sync(transactionRef, {
        onSuccess: (status) => {
          if (status.paid) {
            setPhase('paid');
          } else if (attemptsRef.current < MAX_ATTEMPTS) {
            timerRef.current = setTimeout(attempt, RETRY_DELAY_MS);
          } else {
            setPhase('unconfirmed');
          }
        },
        // A 404 means this ref is not one of ours — retrying cannot turn that into a yes, so the
        // loop stops immediately rather than spending six requests on it.
        onError: () => setPhase('failed'),
      });
    };

    attempt();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [transactionRef, sync]);

  const view = !transactionRef
    ? {
        icon: <XCircle className="h-14 w-14 text-nx-status-danger" />,
        title: t('payment.invalidTitle'),
        description: t('payment.invalidDesc'),
      }
    : phase === 'checking'
      ? {
          icon: <Loader2 className="h-14 w-14 animate-spin text-nx-text-muted" />,
          title: t('payment.checkingTitle'),
          description: t('payment.checkingDesc'),
        }
      : phase === 'paid'
        ? {
            icon: <CheckCircle2 className="h-14 w-14 text-nx-status-success" />,
            title: t('payment.successTitle'),
            description: t('payment.successDesc'),
          }
        : phase === 'unconfirmed'
          ? {
              icon: <Clock className="h-14 w-14 text-nx-text-muted" />,
              title: t('payment.pendingTitle'),
              description: t('payment.pendingDesc'),
            }
          : {
              icon: <XCircle className="h-14 w-14 text-nx-status-danger" />,
              title: t('payment.failedTitle'),
              description: t('payment.failedDesc'),
            };

  return (
    <div className="flex max-w-sm flex-col items-center gap-3 text-center">
      {view.icon}
      <h1 className="text-nx-h2 font-semibold text-nx-text-primary">{view.title}</h1>
      <p className="text-nx-body-sm text-nx-text-secondary">{view.description}</p>
      <Link href="/newsfeed" className="mt-4">
        <Button variant="secondary">{t('payment.backToNewsfeed')}</Button>
      </Link>
    </div>
  );
}
