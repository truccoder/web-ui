'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useRebuildFeed } from '../hooks/use-feed-admin';

/**
 * Admin control for `POST /v1/api/admin/newsfeed/rebuild` — recompute every user's fan-out feed.
 *
 * A TWO-PRESS ACTION: the button arms a confirm, because a rebuild touches every user and takes a
 * while. The result line reports `{ processed, skipped }` when it lands.
 */
export function NewsfeedRebuildPanel() {
  const t = useT();
  const rebuild = useRebuildFeed();
  const [armed, setArmed] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-nx-title-sm font-semibold text-nx-text-primary">
          {t('moderation.rebuild.title')}
        </h2>
        <p className="text-nx-body-sm text-nx-text-secondary">{t('moderation.rebuild.desc')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {armed ? (
          <>
            <Button
              size="sm"
              variant="danger"
              loading={rebuild.isPending}
              onClick={() => {
                setArmed(false);
                rebuild.mutate();
              }}
            >
              {t('moderation.rebuild.confirm')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setArmed(false)}>
              {t('moderation.rebuild.cancel')}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className="size-3.5" />}
            loading={rebuild.isPending}
            onClick={() => setArmed(true)}
          >
            {t('moderation.rebuild.button')}
          </Button>
        )}
      </div>

      {rebuild.isSuccess && (
        <p role="status" className="text-nx-body-sm text-nx-status-success-fg">
          {t('moderation.rebuild.result', {
            processed: rebuild.data.processed ?? 0,
            skipped: rebuild.data.skipped ?? 0,
          })}
        </p>
      )}

      {rebuild.isError && (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
          {getErrorMessage(rebuild.error, t('moderation.rebuild.error'))}
        </p>
      )}
    </Card>
  );
}
