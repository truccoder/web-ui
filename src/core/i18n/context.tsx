'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { en, type Messages } from './translations/en';
import { vi } from './translations/vi';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from './locale';

export type { Locale };

const bundles: Record<Locale, Messages> = { en, vi };

// Recursively resolve a dot-path key from a nested object
function resolvePath(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return path;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : path;
}

// Replace ${key} placeholders with vars
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\$\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * `initialLocale` is REQUIRED, and is the whole point of P5.3: the provider no longer discovers
 * the locale for itself. The root layout reads the cookie during server render and hands the same
 * value down, so the server tree and the first client tree are identical by construction. A
 * provider that read the cookie here (via `document.cookie`) would be back to the old bug — that
 * read returns nothing on the server.
 */
export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // Not `httpOnly` on purpose — this is a display preference the client itself must write, and
    // there is no server route that would set it. `SameSite=Lax` keeps it off cross-site requests.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  const t: TranslateFn = useCallback(
    (key, vars) => {
      const bundle = bundles[locale] as unknown as Record<string, unknown>;
      const raw = resolvePath(bundle, key);
      return interpolate(raw, vars);
    },
    [locale]
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT(): TranslateFn {
  return useI18n().t;
}
