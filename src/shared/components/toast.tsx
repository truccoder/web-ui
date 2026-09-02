'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { IconButton } from './icon-button';

/**
 * NO DESIGN-SYSTEM SPECIMEN EXISTS FOR THIS, unlike `Dialog` and `IconButton` which were each
 * measured off a rendered `overlays`/`actions` specimen. `command-palette.tsx` and `drawer.tsx`
 * both note that `components/overlays/` ships a Toast contract, but nothing under it was ever
 * rendered locally to read. This file is assembled from tokens those two components already use
 * (`bg-nx-surface-card`, `border-nx-border-default`, `shadow-nx-3`, `rounded-nx-lg`) plus the
 * status triad (`nx-status-{danger,success,info}{,-fg,-bg}`) every inline error banner already
 * uses, rather than guessed colors. Treat the layout as a reasonable default, not a DS transcript.
 *
 * WHY A MODULE-LEVEL STORE AND NOT A CONTEXT. `toast.error(...)` has to be callable from a
 * `.mutate()`'s `onError`, which is a plain callback with no hook access — the same reason
 * `core/api/axios.ts` keeps `authRequiredListeners` as a bare `Set` instead of routing sign-in
 * prompts through context.
 */

export type ToastVariant = 'info' | 'success' | 'danger';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

const AUTO_DISMISS_MS = 5000;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

/** A stable reference — a fresh `[]` literal on every call is what triggered React's
    "getServerSnapshot should be cached" warning (and the infinite-loop check behind it). */
const EMPTY: ToastItem[] = [];
function getServerSnapshot(): ToastItem[] {
  return EMPTY;
}

function dismiss(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function push(message: string, variant: ToastVariant) {
  const id = nextId++;
  items = [...items, { id, message, variant }];
  emit();
  setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
}

/** Fire-and-forget notification, for feedback with no field or form to sit next to. */
export const toast = {
  info: (message: string) => push(message, 'info'),
  success: (message: string) => push(message, 'success'),
  error: (message: string) => push(message, 'danger'),
};

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
  info: <Info className="size-5 text-nx-status-info" />,
  success: <CheckCircle2 className="size-5 text-nx-status-success" />,
  danger: <XCircle className="size-5 text-nx-status-danger" />,
};

const VARIANT_BORDER: Record<ToastVariant, string> = {
  info: 'border-l-nx-status-info',
  success: 'border-l-nx-status-success',
  danger: 'border-l-nx-status-danger',
};

/**
 * Mounted once, in `core/providers`. Renders nothing until the store holds a toast — which can
 * only happen after a client-side event, so the first render always matches the empty server
 * snapshot and needs none of `Dialog`'s `isClient`/portal-timing guard.
 */
export function Toaster() {
  const t = useT();
  const stack = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (stack.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {stack.map((item) => (
        <div
          key={item.id}
          role="status"
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 rounded-nx-lg border border-l-4 border-nx-border-default bg-nx-surface-card',
            'p-3 shadow-nx-3 animate-[nx-enter_var(--nx-duration-fast)_var(--ease-nx-out)]',
            VARIANT_BORDER[item.variant]
          )}
        >
          {VARIANT_ICON[item.variant]}
          <p className="min-w-0 flex-1 text-nx-body-sm text-nx-text-primary">{item.message}</p>
          <IconButton label={t('toast.dismiss')} size="sm" onClick={() => dismiss(item.id)}>
            <X />
          </IconButton>
        </div>
      ))}
    </div>,
    document.body
  );
}
