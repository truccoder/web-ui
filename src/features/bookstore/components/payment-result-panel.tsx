'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, ExternalLink, Loader2, RotateCw, XCircle } from 'lucide-react';
import { Button } from '@/shared/components';
import { useT } from '@/core/i18n';
import { forgetPendingPayment, pendingPaymentExpiresAt } from '../lib/pending-payment';
import { usePendingPaymentByRef, useSyncPaymentStatus } from '../hooks';

/**
 * The app's one payment-status surface — both the screen MoMo redirects to and the screen the app
 * sits on while the buyer pays.
 *
 * IT POLLS, AND THAT IS THE WHOLE POINT OF REBUILDING IT. MoMo confirms a payment to the backend
 * over a server-to-server webhook, which RACES the browser redirect — arriving before the webhook
 * lands is the normal case, not the exception. The legacy version asked once and rendered
 * "Payment failed" on `paid: false`, so a buyer whose money had left their account was told the
 * payment failed. That is the defect this replaces.
 *
 * POLLING IS SAFE BECAUSE THE BACKEND GUARANTEES IT, not because it seems harmless.
 * `syncPaymentStatus` is a write — it completes the purchase, stamps `paidAt`, and notifies the
 * author — but `MomoService.applyResult` returns early on an already-`COMPLETED` purchase without
 * rewriting fields or re-notifying, with a comment in the backend saying exactly that. The same
 * commit that made this side wait longer also made a mid-flight result code (1000 / 7000 / 7002)
 * leave the row PENDING instead of writing FAILED over a payment still in progress, which is what
 * makes a long poll correct rather than merely tolerated.
 *
 * THE LOOP LIVES HERE, NOT IN THE HOOK. A `useQuery` with `refetchInterval` would hand the timing
 * of a payment-completing write to React Query's refetch policy (mount, reconnect, retry). Here the
 * bound and the give-up state are visible next to the copy that explains them to the buyer.
 *
 * RUNNING OUT OF ATTEMPTS IS NOT FAILURE. Unconfirmed means "we could not confirm yet", and it gets
 * its own state — telling someone their payment failed when the truth is that the webhook is slow
 * is the same mistake as the legacy version, one step later.
 */

/**
 * The two jobs this screen does, which differ only in how long they are willing to wait.
 *
 * `confirm` — MoMo has redirected the browser back, which it only does once the order settled. The
 * answer is expected within seconds and the only thing being waited on is the webhook.
 *
 * `await` — WE sent the buyer here, straight after opening MoMo in another tab, and the payment
 * has not been made yet. On the wallet flow that MoMo now uses (`captureWallet`, since the card
 * flow could not settle on the sandbox at all) the buyer typically scans the QR with a phone, so
 * the thing being waited on is a HUMAN, and twelve seconds is not a wait — it is a shrug. This
 * mode waits out the order's own lifetime instead, and offers the way back to MoMo's page while
 * it does.
 */
export type PaymentResultMode = 'confirm' | 'await';

/**
 * How long each mode polls, and how patiently.
 *
 * `await` backs off after the first half-minute on purpose: a payment that is going to happen
 * usually happens right after the scan, and the remaining twelve minutes are a person hunting for
 * their phone. Ten fast attempts keep the good case feeling immediate; ten-second attempts after
 * that keep a quarter of an hour of waiting from costing MoMo's query API 240 round trips.
 */
const POLL: Record<
  PaymentResultMode,
  { maxAttempts: number; delayMs: (attempt: number) => number }
> = {
  // Roughly 12 seconds — the webhook is server-to-server and either lands quickly or has failed.
  confirm: { maxAttempts: 6, delayMs: () => 2000 },
  // 10 x 3s + 70 x 10s ~ 12 minutes, inside MoMo's 15-minute order window.
  await: { maxAttempts: 80, delayMs: (attempt) => (attempt <= 10 ? 3000 : 10000) },
};

type Phase = 'checking' | 'paid' | 'unconfirmed' | 'failed';

export interface PaymentResultPanelProps {
  /** MoMo's `orderId` query parameter — the backend's own `transactionRef`. */
  transactionRef: string | null;
  /** @default 'confirm' */
  mode?: PaymentResultMode;
}

/** `m:ss` left on the clock. Not a date, so `Intl` has nothing to offer it. */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function PaymentResultPanel({ transactionRef, mode = 'confirm' }: PaymentResultPanelProps) {
  const t = useT();
  const { mutate: sync } = useSyncPaymentStatus();
  const [phase, setPhase] = React.useState<Phase>('checking');

  // Bumped by "check again", and part of the run key below so a second run is allowed to start on
  // a ref the first run already finished with.
  const [runId, setRunId] = React.useState(0);

  const remembered = usePendingPaymentByRef(transactionRef);

  const attemptsRef = React.useRef(0);
  const startedForRef = React.useRef<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // `mutate` is stable, and the callbacks below only ever set state in response to a settled
  // request — never synchronously inside the effect body, which `react-hooks/set-state-in-effect`
  // forbids and which would cascade renders.
  React.useEffect(() => {
    if (!transactionRef) return;
    const runKey = `${transactionRef}#${runId}`;
    if (startedForRef.current === runKey) return;
    startedForRef.current = runKey;
    attemptsRef.current = 0;

    const { maxAttempts, delayMs } = POLL[mode];

    // A REQUEST ALREADY ON THE WIRE OUTLIVES THE RUN THAT SENT IT. Pressing "check again" starts a
    // new run while the previous attempt may still be in flight; without this guard its callback
    // would land afterwards, decide against the shared attempt counter and schedule a SECOND chain
    // of polls beside the live one. The run key is captured in the closure, so a stale callback
    // can see that it no longer owns the screen and drop out.
    const isCurrentRun = () => startedForRef.current === runKey;

    const attempt = () => {
      attemptsRef.current += 1;
      sync(transactionRef, {
        onSuccess: (status) => {
          if (!isCurrentRun()) return;
          if (status.paid) {
            // The purchase is done, so the browser's note about it has served its purpose. Dropping
            // it here — rather than in the button that started it — is what makes the note
            // self-clearing no matter which tab or device the payment finished on.
            forgetPendingPayment(transactionRef);
            setPhase('paid');
          } else if (attemptsRef.current < maxAttempts) {
            timerRef.current = setTimeout(attempt, delayMs(attemptsRef.current));
          } else {
            setPhase('unconfirmed');
          }
        },
        // A 404 means this ref is not one of ours — retrying cannot turn that into a yes, so the
        // loop stops immediately rather than spending its whole budget on it. It is also the one
        // answer that proves the remembered note is worthless (an entry left behind by another
        // account on this browser reads exactly like this), so the note goes with it.
        onError: () => {
          if (!isCurrentRun()) return;
          forgetPendingPayment(transactionRef);
          setPhase('failed');
        },
      });
    };

    attempt();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [transactionRef, runId, mode, sync]);

  // The countdown, and ONLY while there is something to count down to. An interval that outlives
  // the wait would re-render a settled screen once a second for as long as it stayed open.
  const expiresAt = remembered ? pendingPaymentExpiresAt(remembered) : null;
  const showsCountdown = mode === 'await' && phase === 'checking' && expiresAt != null;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!showsCountdown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showsCountdown]);

  const retry = () => {
    setPhase('checking');
    setRunId((id) => id + 1);
  };

  const view = !transactionRef
    ? {
        icon: <XCircle className="h-14 w-14 text-nx-status-danger" />,
        title: t('payment.invalidTitle'),
        description: t('payment.invalidDesc'),
      }
    : phase === 'checking'
      ? mode === 'await'
        ? {
            icon: <Loader2 className="h-14 w-14 animate-spin text-nx-text-muted" />,
            title: t('payment.awaitTitle'),
            description: t('payment.awaitDesc'),
          }
        : {
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
          ? mode === 'await'
            ? {
                icon: <Clock className="h-14 w-14 text-nx-text-muted" />,
                title: t('payment.awaitTimeoutTitle'),
                description: t('payment.awaitTimeoutDesc'),
              }
            : {
                icon: <Clock className="h-14 w-14 text-nx-text-muted" />,
                title: t('payment.pendingTitle'),
                description: t('payment.pendingDesc'),
              }
          : {
              icon: <XCircle className="h-14 w-14 text-nx-status-danger" />,
              title: t('payment.failedTitle'),
              description: t('payment.failedDesc'),
            };

  // Only offered while the order can still be paid. A link to an expired MoMo page is a promise
  // this side cannot keep, and `paymentUrl` is null for a ref recovered from the backend's
  // rejection — the app never saw that order's page and cannot conjure it.
  //
  // Judged against the `now` above rather than a fresh `Date.now()`: reading the clock during a
  // render is impure (`react-hooks/purity` rejects it outright, and it is right to — the answer
  // would change between two renders React considers equivalent). `now` is the mount time until
  // the countdown starts ticking, which is exactly the resolution this decision needs: an order's
  // life is fifteen minutes, not a second.
  const resumeUrl =
    phase !== 'paid' && remembered?.paymentUrl && (expiresAt ?? 0) > now
      ? remembered.paymentUrl
      : null;

  return (
    <div className="flex max-w-sm flex-col items-center gap-3 text-center">
      {view.icon}
      <h1 className="text-nx-title font-semibold text-nx-text-primary">{view.title}</h1>
      <p className="text-nx-body-sm text-nx-text-secondary">{view.description}</p>

      {showsCountdown && (
        <p className="text-nx-caption text-nx-text-muted">
          {t('payment.expiresIn', { time: formatRemaining((expiresAt ?? 0) - now) })}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {resumeUrl && (
          <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
            <Button icon={<ExternalLink className="h-4 w-4" />}>{t('payment.openMomo')}</Button>
          </a>
        )}

        {/* THE STATE THAT USED TO BE A DEAD END. "Not confirmed yet" is the one outcome that can
            change without anything else happening, and the old copy could only tell the reader to
            reload the page. Asking again is one request. */}
        {phase === 'unconfirmed' && (
          <Button variant="secondary" icon={<RotateCw className="h-4 w-4" />} onClick={retry}>
            {t('payment.checkAgain')}
          </Button>
        )}

        <Link href="/newsfeed">
          <Button variant="ghost">{t('payment.backToNewsfeed')}</Button>
        </Link>
      </div>
    </div>
  );
}
