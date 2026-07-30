'use client';

import { useState } from 'react';
import { Button, Card, EmptyState, Skeleton, Tabs } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useI18n } from '@/lib/i18n';
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  usePendingRequests,
  useRejectFriendRequest,
  useSentRequests,
} from '../hooks/use-friendship';
import { FriendListItem } from './friend-list-item';

/**
 * The `/friends/requests` surface: incoming requests (accept / reject) and outgoing ones
 * (cancel), split by underline tabs. Mutations are keyed by request id — `variables` on
 * the mutation tells us which row is in flight, so one pending accept never freezes the
 * buttons on every other row.
 */

type RequestTab = 'received' | 'sent';

function RequestRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton circle height={40} />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton width={160} height={14} />
        <Skeleton width={90} height={12} />
      </div>
      <Skeleton width={72} height={34} radius="var(--radius-nx-sm)" />
    </div>
  );
}

function RequestListSkeleton({ rows }: { rows: number }) {
  return (
    <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <RequestRowSkeleton key={i} />
      ))}
    </Card>
  );
}

function ErrorBanner({ error }: { error: unknown }) {
  return (
    <p
      role="alert"
      className="rounded-nx-sm bg-nx-status-danger-bg px-3 py-2 text-nx-body-sm text-nx-status-danger-fg"
    >
      {getErrorMessage(error)}
    </p>
  );
}

export function FriendRequests() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<RequestTab>('received');

  const { data: pending, isLoading: loadingPending } = usePendingRequests();
  const { data: sent, isLoading: loadingSent } = useSentRequests();

  const accept = useAcceptFriendRequest();
  const reject = useRejectFriendRequest();
  const cancel = useCancelFriendRequest();

  const pendingCount = pending?.length ?? 0;
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      <Tabs
        aria-label={t('friends.requests.title')}
        active={tab}
        onChange={(id) => setTab(id as RequestTab)}
        tabs={[
          {
            id: 'received',
            label: t('friends.requests.tabReceived'),
            // Only worth a count pill when there is something waiting.
            count: pendingCount > 0 ? pendingCount : undefined,
          },
          { id: 'sent', label: t('friends.requests.tabSent') },
        ]}
      />

      {tab === 'received' &&
        (loadingPending ? (
          <RequestListSkeleton rows={4} />
        ) : pendingCount === 0 ? (
          <EmptyState
            title={t('friends.requests.receivedEmpty.title')}
            description={t('friends.requests.receivedEmpty.desc')}
          />
        ) : (
          <>
            {accept.isError && <ErrorBanner error={accept.error} />}
            {reject.isError && <ErrorBanner error={reject.error} />}
            <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
              {pending?.map((req) => (
                <div key={req.id} className="p-3">
                  <FriendListItem
                    name={req.requesterFullName}
                    avatarUrl={req.requesterProfilePictureUrl}
                    subtitle={formatDate(req.createdAt)}
                    actions={
                      <>
                        <Button
                          size="sm"
                          loading={accept.isPending && accept.variables === req.id}
                          disabled={reject.isPending && reject.variables === req.id}
                          onClick={() => accept.mutate(req.id)}
                        >
                          {t('friends.requests.confirm')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={reject.isPending && reject.variables === req.id}
                          disabled={accept.isPending && accept.variables === req.id}
                          onClick={() => reject.mutate(req.id)}
                        >
                          {t('friends.requests.delete')}
                        </Button>
                      </>
                    }
                  />
                </div>
              ))}
            </Card>
          </>
        ))}

      {tab === 'sent' &&
        (loadingSent ? (
          <RequestListSkeleton rows={3} />
        ) : !sent || sent.length === 0 ? (
          <EmptyState
            title={t('friends.requests.sentEmpty.title')}
            description={t('friends.requests.sentEmpty.desc')}
          />
        ) : (
          <>
            {cancel.isError && <ErrorBanner error={cancel.error} />}
            <Card padding={0} className="divide-y divide-nx-border-subtle overflow-hidden">
              {sent.map((req) => (
                <div key={req.id} className="p-3">
                  <FriendListItem
                    name={req.addresseeFullName}
                    avatarUrl={req.addresseeProfilePictureUrl}
                    subtitle={t('friends.requests.awaiting')}
                    actions={
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={cancel.isPending && cancel.variables === req.id}
                        onClick={() => cancel.mutate(req.id)}
                      >
                        {t('friends.requests.cancelRequest')}
                      </Button>
                    }
                  />
                </div>
              ))}
            </Card>
          </>
        ))}
    </div>
  );
}
