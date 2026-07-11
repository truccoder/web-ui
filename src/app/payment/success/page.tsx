'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncPaymentStatus } from '@/lib/hooks/use-payments';
import { useT } from '@/lib/i18n';

function PaymentSuccessContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const { mutate: syncStatus, data, isPending, isError } = useSyncPaymentStatus();
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orderId || requestedRef.current === orderId) return;
    requestedRef.current = orderId;
    syncStatus(orderId);
  }, [orderId, syncStatus]);

  let content: React.ReactNode;

  if (!orderId) {
    content = (
      <>
        <XCircle className="h-14 w-14 text-destructive" />
        <h1 className="text-xl font-bold">{t('payment.invalidTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('payment.invalidDesc')}</p>
      </>
    );
  } else if (isPending || !data) {
    content = (
      <>
        <Loader2 className="h-14 w-14 animate-spin text-muted-foreground" />
        <h1 className="text-xl font-bold">{t('payment.checkingTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('payment.checkingDesc')}</p>
      </>
    );
  } else if (isError || !data.paid) {
    content = (
      <>
        <XCircle className="h-14 w-14 text-destructive" />
        <h1 className="text-xl font-bold">{t('payment.failedTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('payment.failedDesc')}</p>
      </>
    );
  } else {
    content = (
      <>
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <h1 className="text-xl font-bold">{t('payment.successTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('payment.successDesc')}</p>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        {content}
        <Button className="mt-4" render={<Link href="/newsfeed" />}>
          {t('payment.backToNewsfeed')}
        </Button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  );
}
