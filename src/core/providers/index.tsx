'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { makeQueryClient } from '@/core/query/client';
import { StoreProvider } from '@/core/store/provider';
import { I18nProvider, type Locale } from '@/core/i18n';

// CORE BOUNDARY IS CLOSED AS OF P3.4d: every import in this file resolves inside `core/`.
// `I18nProvider` used to come from `lib/i18n`, the last edge out of infrastructure; `src/lib/`
// no longer exists.
//
// THE TOASTER IS GONE AS OF P3.4c, and was NOT replaced. It rendered `sonner`, and after the
// legacy hooks were deleted the app had exactly zero `toast()` callers — every feature had
// already moved to inline error banners next to the control that failed, which is the better
// pattern anyway: a toast about a form field is feedback in the wrong place. The DS does ship a
// `Toast` spec, so building one is a solved problem the day something needs it; building it now
// would be the speculative primitive CLAUDE.md Phase 1.3 warns about, with no caller to shape it.

// `initialLocale` is threaded through rather than read here: this is a client component, and the
// cookie has to be read on the server for the first render to match. The root layout owns that
// read (P5.3).
export function Providers({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [queryClient] = useState(makeQueryClient);

  return (
    // `data-theme` rather than the class strategy: the design system's dark block is
    // keyed on [data-theme="dark"], so its token file transcribes verbatim instead of
    // needing a selector translation on every future sync.
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <I18nProvider initialLocale={initialLocale}>
        <StoreProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </StoreProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
