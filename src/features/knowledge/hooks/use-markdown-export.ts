'use client';

import * as React from 'react';
import { useIntlLocale } from '@/shared/lib/format';
import { DEFAULT_EXPORT_TEMPLATE, exportFilename, renderExport } from '../lib/markdown-export';
import type { Explanation } from '../types/knowledge';

const TEMPLATE_STORAGE_KEY = 'knowledge_export_template';

/**
 * `localStorage` AS AN EXTERNAL STORE, not as something copied into state by an effect.
 *
 * The obvious shape — `useState(DEFAULT)` plus a `useEffect` that reads storage and calls
 * `setState` — is the cascading-render pattern `react-hooks/set-state-in-effect` exists to stop,
 * and it renders the default for one frame before correcting itself. `useSyncExternalStore`
 * DERIVES the value instead: the server snapshot is the default, the client snapshot is whatever
 * storage holds, and React reconciles the two without a second render pass. Same reasoning as the
 * `isClient` derivation in `shared/components/dialog.tsx`.
 *
 * The listener set is module-level because the store is: two components reading this template must
 * see the same string, and an edit in one has to reach the other.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  // Also picks up edits made in another tab, which is the one case `emit` cannot see.
  window.addEventListener('storage', onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

/**
 * Every access is wrapped: a private window, cleared site data, or a browser set to block storage
 * make these throw rather than return null, and a settings box is not worth a blank screen.
 *
 * Returns a string, so React's `Object.is` check compares by value — no cached-snapshot dance is
 * needed to avoid an infinite loop.
 */
function getSnapshot(): string {
  try {
    return window.localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? DEFAULT_EXPORT_TEMPLATE;
  } catch {
    return DEFAULT_EXPORT_TEMPLATE;
  }
}

function getServerSnapshot(): string {
  return DEFAULT_EXPORT_TEMPLATE;
}

export function useExportTemplate() {
  const template = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTemplate = React.useCallback((next: string) => {
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, next);
    } catch {
      // Persistence is lost, but the notify below still has nothing to show — the snapshot will
      // read back the previous value, which is the honest outcome of a write that failed.
    }
    emit();
  }, []);

  const reset = React.useCallback(() => {
    try {
      window.localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage was never writable.
    }
    emit();
  }, []);

  return { template, setTemplate, reset };
}

/**
 * Download one explanation as a `.md` file.
 *
 * The object URL is revoked on the next tick rather than immediately: revoking it in the same tick
 * as the synthetic click cancels the download in WebKit. Nothing else holds a reference, so the
 * blob is collected right after.
 */
export function useDownloadExplanation() {
  const localeTag = useIntlLocale();
  const { template } = useExportTemplate();

  return React.useCallback(
    (explanation: Explanation) => {
      const markdown = renderExport(explanation, {
        template,
        localeTag,
        origin: window.location.origin,
      });

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = exportFilename(explanation);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    [template, localeTag]
  );
}
