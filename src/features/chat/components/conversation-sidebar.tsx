'use client';

import { useState } from 'react';
import { ArrowLeft, Check, PenSquare, Search, Users } from 'lucide-react';
import { Avatar, Button, EmptyState, Input, Skeleton, Tabs } from '@/shared/components';
import { useFriends } from '@/features/friendships';
import { useT } from '@/core/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import type { ChatConnectionStatus, ChatConversation } from '../types/chat';
import { ConversationRow } from './conversation-row';

/**
 * The conversation list, with search, an unread filter, and the "new message" panel.
 *
 * WHY THIS FEATURE READS `features/friendships` DIRECTLY (via its barrel, never its internals —
 * CLAUDE.md §4): starting a conversation means picking a friend, so chat genuinely depends on the
 * social graph. The backend draws the same line — `com.socialapp.chat` now calls
 * `FriendshipService.getFriendIds` to push friends to Stream — so mirroring it here keeps the two
 * boundary graphs identical. The alternative, threading a friend list down as a prop, would have
 * to be wired twice (this screen and the app shell's floating window) and would hide a real
 * coupling behind a prop, which §4 warns against more strongly than it warns against the import.
 */
export interface ConversationSidebarProps {
  conversations: ChatConversation[];
  isLoading: boolean;
  status: ChatConnectionStatus;
  activeConversationId?: string | null;
  onSelect: (conversationId: string) => void;
  /** Resolves to the conversation id, which the caller then opens. */
  onStartConversation: (friendUserId: string) => Promise<string>;
  /**
   * Creates a named group and resolves to its conversation id.
   *
   * `memberIds` IS EVERYONE BUT THE CALLER and must hold at least two — the panel enforces that
   * before it calls, because the backend's floor is a product rule (caller + one other is a direct
   * message wearing a name) and a reader should meet it as a disabled button, not as a 400.
   */
  onStartGroupConversation: (name: string, memberIds: string[]) => Promise<string>;
  className?: string;
}

type Filter = 'all' | 'unread';

/** Which half of the new-message panel is showing. */
type NewChatMode = 'direct' | 'group';

/**
 * The backend's own floor, restated here because this panel is where a reader meets it.
 *
 * Two OTHER people, not two people: the caller is added from the authenticated principal and is
 * never in `memberIds`. Below it, `POST /chat/groups` answers 400 rather than creating a second
 * channel between two people who already have a direct message.
 */
const MIN_GROUP_MEMBERS = 2;

/**
 * Friend picker for starting a new conversation — one person, or a named group.
 *
 * A LOCAL COMPONENT RATHER THAN AN EXPORTED ONE: it is a panel of this sidebar, has no other
 * caller, and exporting it would invite one before its props are shaped by a second real use.
 *
 * TWO MODES ON ONE LIST RATHER THAN TWO PANELS. Both are "pick from your friends" over the same
 * search box and the same rows; what differs is whether a tap opens a conversation immediately or
 * adds to a selection. Splitting them would duplicate the list, the search and its three empty
 * states to change one line of behaviour.
 *
 * A `Tabs` STRIP IS THE RIGHT CONTROL HERE BY THE COMPONENT'S OWN RULE — three or fewer, and the
 * choice is the panel's subject. It is two.
 */
function NewChatPanel({
  onBack,
  onStart,
  onStartGroup,
}: {
  onBack: () => void;
  onStart: (friendUserId: string) => Promise<void>;
  onStartGroup: (name: string, memberIds: string[]) => Promise<void>;
}) {
  const t = useT();
  const [mode, setMode] = useState<NewChatMode>('direct');
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const { data, isLoading } = useFriends();
  const friends = data?.friends ?? [];

  const matches = friends.filter((friend) =>
    (friend.fullName ?? '').toLowerCase().includes(search.trim().toLowerCase())
  );

  const start = async (friendUserId: string) => {
    setPendingId(friendUserId);
    setError(null);
    try {
      await onStart(friendUserId);
    } catch (err) {
      /**
       * TRANSLATED, NOT SHOWN RAW. The failure that actually happens here is Stream refusing to
       * create a channel with a user it has never seen ("...users ... don't exist"), which is
       * meaningless to a reader. The backend now pushes friends to Stream when it issues a token,
       * so this should be rare — but it is still reachable for someone befriended after the
       * current token was minted, and for anyone who is not a friend at all. See
       * `findings/chat.md` R8.
       */
      const message = err instanceof Error ? err.message : String(err);
      setError(message.includes("don't exist") ? t('chat.peerNotReady') : t('chat.startFailed'));
    } finally {
      setPendingId(null);
    }
  };

  const toggle = (friendUserId: string) =>
    setSelected((current) =>
      current.includes(friendUserId)
        ? current.filter((id) => id !== friendUserId)
        : [...current, friendUserId]
    );

  const canCreateGroup = groupName.trim().length > 0 && selected.length >= MIN_GROUP_MEMBERS;

  const createGroup = async () => {
    if (!canCreateGroup) return;
    setIsCreatingGroup(true);
    setError(null);
    try {
      await onStartGroup(groupName.trim(), selected);
    } catch (err) {
      /**
       * THE BACKEND'S OWN WORDS, UNLIKE THE DIRECT PATH ABOVE, and the asymmetry is the point.
       * There the only real failure is Stream complaining about a user id, which means nothing to
       * a reader. Here the failures are things the reader can act on and that only the server
       * knows: a block standing between two people they invited, an account that no longer exists,
       * a name over 100 characters. Replacing those with one generic sentence would leave someone
       * removing people at random to find out which pair the server objected to.
       */
      setError(getErrorMessage(err, t('chat.groupFailed')));
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const busy = pendingId !== null || isCreatingGroup;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-nx-border-subtle px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('chat.back')}
          className={cn(
            'grid size-8 place-items-center rounded-nx-md text-nx-text-secondary',
            'hover:bg-nx-surface-sunken',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          <ArrowLeft className="size-4" />
        </button>
        <h2 className="text-nx-ui font-semibold text-nx-text-primary">{t('chat.newChat')}</h2>
      </div>

      <div className="flex flex-col gap-2 px-3 py-2">
        <Tabs
          size="sm"
          aria-label={t('chat.newChatModeLabel')}
          active={mode}
          // The error belongs to the mode that produced it: carrying "a group needs at least two
          // people" into the direct list would be an alert about a control no longer on screen.
          onChange={(id) => {
            setMode(id as NewChatMode);
            setError(null);
          }}
          tabs={[
            { id: 'direct', label: t('chat.modeDirect') },
            { id: 'group', label: t('chat.modeGroup') },
          ]}
        />

        {mode === 'group' && (
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder={t('chat.groupNamePlaceholder')}
            // The backend's `@Size(max = 100)`, enforced where it can be met without a round trip.
            maxLength={100}
            prefix={<Users className="size-4" />}
          />
        )}

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('chat.searchFriends')}
          prefix={<Search className="size-4" />}
        />
      </div>

      {error && (
        <p role="alert" className="px-3 pb-2 text-nx-body-sm text-nx-status-danger">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton circle height={40} />
                <Skeleton width={140} height={12} />
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            compact
            title={friends.length === 0 ? t('chat.noFriendsToMessage') : t('chat.noResults')}
            description={friends.length === 0 ? t('chat.addFriendsFirst') : undefined}
          />
        ) : (
          matches.map((friend) => {
            const friendId = String(friend.userId);
            const isSelected = mode === 'group' && selected.includes(friendId);
            return (
              <button
                key={friendId}
                type="button"
                disabled={busy}
                onClick={() => (mode === 'group' ? toggle(friendId) : start(friendId))}
                // `aria-pressed` ONLY IN GROUP MODE. In the direct list the same row is a one-shot
                // action with no on/off state, and a control that reports `aria-pressed="false"`
                // tells a screen reader it is a toggle that is currently off — which is a lie
                // about what tapping it does.
                aria-pressed={mode === 'group' ? isSelected : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-nx-md px-3 py-2.5 text-left',
                  'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
                  'hover:bg-nx-surface-sunken disabled:opacity-60',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
                  isSelected && 'bg-nx-accent-soft'
                )}
              >
                <Avatar src={friend.profilePictureUrl} name={friend.fullName} size="lg" />
                <span className="min-w-0 flex-1 truncate text-nx-ui text-nx-text-primary">
                  {friend.fullName}
                </span>

                {/* The tick is what makes the selection legible without a checkbox column: the
                    tinted row alone reads as hover on a list where hover already tints. */}
                {isSelected && (
                  <Check className="size-4 shrink-0 text-nx-text-accent" aria-hidden />
                )}

                {pendingId === friendId && (
                  <span className="shrink-0 text-nx-caption text-nx-text-muted">
                    {t('chat.creating')}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* THE FOOTER IS THE ONLY PART THAT IS NOT SHARED, and it is pinned rather than living at the
          end of the scroller: the list is long enough to scroll on any real friend list, and a
          create button that scrolls away with it is one a reader has to go looking for after they
          have finished choosing. */}
      {mode === 'group' && (
        <div className="flex items-center gap-2 border-t border-nx-border-subtle px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-nx-caption text-nx-text-muted">
            {/* SAYS WHAT IS STILL MISSING, NOT JUST WHAT IS DONE. "1 đã chọn" next to a dead
                button leaves the reader to work out why it is dead; the floor is the reason, so
                the count states it until it is met. */}
            {selected.length < MIN_GROUP_MEMBERS
              ? t('chat.groupNeedsMore', { count: MIN_GROUP_MEMBERS - selected.length })
              : t('chat.groupSelected', { count: selected.length })}
          </span>
          <Button
            size="sm"
            loading={isCreatingGroup}
            disabled={!canCreateGroup}
            onClick={createGroup}
          >
            {t('chat.createGroup')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * A one-line note about the connection, shown above the list.
 *
 * `unconfigured` GETS ITS OWN SENTENCE. It means the backend has no Stream credentials — nothing
 * the reader can do and nothing a retry fixes — so it must not read like a transient network
 * blip. See `types/chat.ts` for why the status is modelled separately in the first place.
 */
function ConnectionNote({ status }: { status: ChatConnectionStatus }) {
  const t = useT();

  if (status === 'connected') return null;

  const message =
    status === 'unconfigured'
      ? t('chat.unconfigured')
      : status === 'error'
        ? t('chat.connectionError')
        : t('chat.connecting');

  return (
    <p
      className={cn(
        'px-3 pb-2 text-nx-body-sm',
        status === 'connecting' ? 'text-nx-text-muted' : 'text-nx-status-danger'
      )}
      role={status === 'connecting' ? undefined : 'alert'}
    >
      {message}
    </p>
  );
}

export function ConversationSidebar({
  conversations,
  isLoading,
  status,
  activeConversationId,
  onSelect,
  onStartConversation,
  onStartGroupConversation,
  className,
}: ConversationSidebarProps) {
  const t = useT();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showNewChat, setShowNewChat] = useState(false);

  const query = search.trim().toLowerCase();
  const visible = conversations.filter((conversation) => {
    const title = conversation.otherMemberName ?? conversation.name ?? '';
    const matchesSearch = title.toLowerCase().includes(query);
    const matchesFilter = filter === 'all' || conversation.unreadCount > 0;
    return matchesSearch && matchesFilter;
  });

  if (showNewChat) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <NewChatPanel
          onBack={() => setShowNewChat(false)}
          onStart={async (friendUserId) => {
            const conversationId = await onStartConversation(friendUserId);
            setShowNewChat(false);
            onSelect(conversationId);
          }}
          // Same shape as `onStart`: the panel awaits, and a rejection stays inside it as an
          // alert. Closing the panel is deliberately AFTER the await — closing first would drop
          // the error message on a screen that no longer exists.
          onStartGroup={async (name, memberIds) => {
            const conversationId = await onStartGroupConversation(name, memberIds);
            setShowNewChat(false);
            onSelect(conversationId);
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <h1 className="text-nx-title-sm font-semibold text-nx-text-primary">{t('chat.chats')}</h1>
        <Button
          variant="ghost"
          size="sm"
          icon={<PenSquare className="size-4" />}
          onClick={() => setShowNewChat(true)}
          // Connecting or failed means `startConversation` would throw; better to not offer it.
          disabled={status !== 'connected'}
        >
          {t('chat.newChat')}
        </Button>
      </div>

      <ConnectionNote status={status} />

      <div className="flex flex-col gap-2 px-3 pb-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('chat.search')}
          prefix={<Search className="size-4" />}
        />

        <Tabs
          size="sm"
          aria-label={t('chat.filterLabel')}
          active={filter}
          onChange={(id) => setFilter(id as Filter)}
          tabs={[
            { id: 'all', label: t('chat.all') },
            { id: 'unread', label: t('chat.unread') },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton circle height={40} />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton width={120} height={12} />
                  <Skeleton width={180} height={10} />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            compact
            title={conversations.length === 0 ? t('chat.noConversations') : t('chat.noResults')}
            action={
              conversations.length === 0 && status === 'connected' ? (
                <Button variant="secondary" size="sm" onClick={() => setShowNewChat(true)}>
                  {t('chat.startNewChat')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          visible.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
