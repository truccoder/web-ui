'use client';

import { useState } from 'react';
import { Button, EmptyState, Skeleton, Tabs } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useIntlLocale } from '@/shared/lib/format';
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

export interface FriendRequestsProps {
  /**
   * Size of this component's own received/sent strip. Added at P5.1, when `/friends` gained a
   * page-level tab strip above it: two same-sized strips stacked read as one confused row. The
   * page passes `sm` so the hierarchy is visible — outer strip picks the surface, inner strip
   * picks a direction within it.
   */
  tabSize?: 'sm' | 'md';
}

function RequestRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-nx-md bg-nx-surface-card px-5 py-3">
      <Skeleton circle height={40} />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton width={160} height={14} />
        <Skeleton width={90} height={12} />
      </div>
      <Skeleton width={72} height={34} radius="var(--radius-nx-sm)" />
    </div>
  );
}

function RequestListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <RequestRowSkeleton key={i} />
      ))}
    </div>
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

export function FriendRequests({ tabSize = 'md' }: FriendRequestsProps = {}) {
  const t = useT();
  // `useIntlLocale` rather than a local `locale === 'vi' ? …` ternary: the app-locale → BCP-47 map
  // belongs in one place, so adding a third language does not leave this row silently on English.
  const dateLocale = useIntlLocale();
  const [tab, setTab] = useState<RequestTab>('received');

  const { data: pending, isLoading: loadingPending } = usePendingRequests();
  const { data: sent, isLoading: loadingSent } = useSentRequests();

  const accept = useAcceptFriendRequest();
  const reject = useRejectFriendRequest();
  const cancel = useCancelFriendRequest();

  const pendingCount = pending?.length ?? 0;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      <Tabs
        size={tabSize}
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
            <div className="flex flex-col gap-4">
              {pending?.map((req) => (
                <div key={req.id}>
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
            </div>
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
            <div className="flex flex-col gap-4">
              {sent.map((req) => (
                <div key={req.id}>
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
            </div>
          </>
        ))}
    </div>
  );
}
