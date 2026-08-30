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
// THE TOASTER WAS GONE AS OF P3.4c (it rendered `sonner`, and after the legacy hooks were
// deleted the app had exactly zero `toast()` callers) and came BACK once real ones showed up:
// background actions with no field or form to attach an inline banner to (unblocking someone,
// marking a notification read). Still not for form-field errors — those stay as inline banners,
// which remains the better pattern for feedback tied to one control. Still hand-built rather than
// `sonner`, matching the DS token vocabulary `Dialog` already uses instead of pulling in a
// library for a component this small.
//
// `<Toaster />` ISN'T MOUNTED HERE, though — this file's imports all resolve inside `core/`, and
// `Toaster` lives in `shared/components`. It's rendered from `app/layout.tsx` instead, as a
// sibling of `{children}` inside this provider tree, so it gets `I18nProvider` without crossing
// the boundary the comment above describes.

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
