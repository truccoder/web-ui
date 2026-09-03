'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { resolveApiError } from '@/shared/lib/resolve-api-error';
import { Button, ButtonLink } from './button';
import { EmptyState } from './empty-state';

/**
 * The atlas's F4 sheet rendered: one place a failed request turns into the right words and the
 * right — or absent — retry button. `resolveApiError` (`shared/lib`) does the status→decision
 * routing and is unit-tested there; this file is the thin renderer.
 *
 * WHY IT EXISTS. Before it, `newsfeed.tsx` hand-rolled a retry `EmptyState`, the moderation tabs
 * printed a bare `getErrorMessage`, `explain-post-action.tsx` split 428/429/503 by hand, and a
 * 404 on one screen looked nothing like a 404 on the next. A reader learns an app's failure
 * states the way they learn its success states — by seeing the same shape twice.
 *
 * TWO SHAPES, PICKED BY THE FAILURE not the caller: a centred `EmptyState` for "this panel could
 * not load" (the `block` default), and a compact inline strip for a ban reason or for a caller
 * that asks for `inline` because the failure sits next to a form still worth using.
 */
export interface ApiErrorNoticeProps {
  error: unknown;
  /** A retry affordance is shown only when the failure is one retrying can fix AND this is given. */
  onRetry?: () => void;
  /** `block` (default) → centred EmptyState; `inline` → a one-line danger strip. */
  variant?: 'block' | 'inline';
  className?: string;
}

export function ApiErrorNotice({
  error,
  onRetry,
  variant = 'block',
  className,
}: ApiErrorNoticeProps) {
  const t = useT();
  const view = resolveApiError(error);

  const title = t(view.titleKey);
  const body =
    view.details.length > 0
      ? view.details.join(' · ')
      : view.descriptionKey
        ? t(view.descriptionKey)
        : view.message;

  const retry =
    view.retryable && onRetry ? (
      <Button
        variant="secondary"
        size="sm"
        icon={<RefreshCw className="size-4" aria-hidden />}
        onClick={onRetry}
      >
        {t('apiError.retry')}
      </Button>
    ) : null;

  const link =
    view.href && view.hrefLabelKey ? (
      <ButtonLink href={view.href} variant="secondary" size="sm">
        {t(view.hrefLabelKey)}
      </ButtonLink>
    ) : null;

  if (variant === 'inline' || view.tone === 'banner') {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-nx-sm border border-l-4 border-nx-border-subtle border-l-nx-status-danger bg-nx-status-danger-bg px-3 py-2',
          className
        )}
      >
        <AlertTriangle className="size-4 shrink-0 text-nx-status-danger-fg" aria-hidden />
        <span className="text-nx-body-sm font-medium text-nx-text-primary">{title}</span>
        {body && <span className="text-nx-body-sm text-nx-text-secondary">{body}</span>}
        {(retry || link) && (
          <span className="ml-auto flex items-center gap-2">{retry ?? link}</span>
        )}
      </div>
    );
  }

  return (
    <EmptyState
      className={className}
      icon={<AlertTriangle />}
      title={title}
      description={body}
      action={retry ?? link ?? undefined}
    />
  );
}
