'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfessionalProfileWizard } from '@/features/knowledge';
import { safeNext } from '@/shared/lib/safe-next';

/**
 * `/onboarding/professional` — the 428 gate (Plate 02).
 *
 * A PERSON REACHES THIS ONE OF TWO WAYS: a 428 from `/explain` or matchmaking (`onProfileRequired`
 * routes here, carrying a `?next=` back to what they were doing), or a "set up your profile first"
 * link. Either way they have no professional profile, so this renders the wizard, not the
 * summary-first form that lives on `/profile?tab=professional`.
 *
 * `?next=` IS HONOURED ON THE WAY OUT — finishing or skipping returns to the explanation the
 * reader was trying to generate. `safeNext` is the same open-redirect guard the auth flow uses.
 *
 * NO PAGE `<h1>` and the wizard owns its own framing, like every other `(main)` route. The shell
 * hides the ledger for `/onboarding/*` (see `shell.tsx`) but keeps the rail and top bar — the
 * atlas's "standard, ledger hidden during wizard".
 */
export default function OnboardingProfessionalPage() {
  return (
    <Suspense>
      <OnboardingProfessionalContent />
    </Suspense>
  );
}

function OnboardingProfessionalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  return (
    <div className="flex flex-col gap-[var(--nx-space-section)]">
      <ProfessionalProfileWizard
        onDone={() => router.replace(next ?? '/profile?tab=professional')}
        nextHref={next ?? undefined}
      />
    </div>
  );
}
