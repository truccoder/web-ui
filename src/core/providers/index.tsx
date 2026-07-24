'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/core/query/client';
import { StoreProvider } from '@/core/store/provider';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/lib/i18n';

// TODO(core-boundary): Toaster and I18nProvider still resolve into legacy folders.
// core/ is meant to be infrastructure with no dependency on lib/ or components/, so
// these two edges are temporary: Toaster goes once shared/ has a hand-written
// equivalent (shadcn removal is P4.3), i18n once it moves to shared/. Nothing else
// under core/ imports outside core/.

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <I18nProvider>
      <StoreProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </StoreProvider>
    </I18nProvider>
  );
}
