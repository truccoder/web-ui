'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { en, type Messages } from './translations/en';
import { vi } from './translations/vi';

export type Locale = 'en' | 'vi';

const STORAGE_KEY = 'app_locale';
const DEFAULT_LOCALE: Locale = 'vi';

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

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in bundles) return saved;
  } catch {
    // ignore SSR / private browsing
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
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
