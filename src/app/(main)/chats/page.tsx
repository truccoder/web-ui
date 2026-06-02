'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useCommunication } from '@/components/chat/communication-provider';
import { MessengerSidebar } from '@/components/chat/messenger-sidebar';
import { MessengerConversation, MessengerEmpty } from '@/components/chat/messenger-conversation';
import { useProfile } from '@/lib/hooks/use-user';
import { useFriends } from '@/lib/hooks/use-friendship';
import type { Profile } from '@/lib/types';

export default function ChatsPage() {
  return (
    <Suspense>
      <ChatsContent />
    </Suspense>
  );
}

function ChatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSid = searchParams.get('sid');

  const { conversationsClient, currentIdentity } = useCommunication();
  const { isConnected, connectionError } = conversationsClient;
  const { conversations } = conversationsClient;
  const { data: profile } = useProfile();
  const { data: friends } = useFriends();

  // Mobile: show sidebar or conversation
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const handleSelectConversation = useCallback(
    (sid: string) => {
      router.push(`/chats?sid=${sid}`);
      setMobileView('chat');
    },
    [router]
  );

  const handleNewConversation = useCallback(
    async (friend: Profile) => {
      // Build friendly name: "CurrentUser, Friend" — sorted alphabetically for both sides
      const myName = profile?.fullName ?? currentIdentity ?? 'Me';
      const names = [myName, friend.fullName].sort();
      const friendlyName = names.join(', ');

      try {
        const conv = await conversationsClient.createOrGetConversation(friend.id, friendlyName);
        router.push(`/chats?sid=${conv.sid}`);
        setMobileView('chat');
      } catch (err) {
        console.error('[ChatsPage] Conversation creation failed:', err);
        toast.error(
          err instanceof Error ? err.message : 'Failed to open conversation. See console.'
        );
        throw err; // re-throw so MessengerSidebar's loading state resets
      }
    },
    [conversationsClient, currentIdentity, profile, router]
  );

  // Resolve the active conversation's peer info from the conversation list or friends
  const activeConv = conversations.find((c) => c.sid === activeSid);
  const activePeerName = activeConv?.friendlyName ?? 'Chat';

  // Try to match peer identity from uniqueName (format: id1_id2)
  // We stored uniqueName as [identity, participantIdentity].sort().join('_')
  // Since we only have friendlyName in the summary, use friend list to find peer avatar
  const activeFriend = friends?.find((f) => {
    const possibleName = [profile?.fullName ?? '', f.fullName].sort().join(', ');
    return possibleName === activePeerName || f.fullName === activePeerName;
  });

  const MOBILE_HEADER_H = 'h-[calc(100vh-48px)]';
  const DESKTOP_H = 'h-screen';

  return (
    <div
      className={`flex ${MOBILE_HEADER_H} md:${DESKTOP_H} overflow-hidden bg-white dark:bg-[#1c1e21]`}
    >
      {/* ── Left panel: Conversation list ── */}
      <div
        className={`
          w-full md:w-[320px] md:flex md:flex-col shrink-0 border-r border-[#e4e6eb] dark:border-[#3a3b3c]
          ${mobileView === 'list' ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
        `}
      >
        <MessengerSidebar
          conversations={conversations}
          activeSid={activeSid}
          onSelect={handleSelectConversation}
          onNewConversation={handleNewConversation}
          isConnected={isConnected}
          connectionError={connectionError}
        />
      </div>

      {/* ── Right panel: Active conversation ── */}
      <div
        className={`
          flex-1 flex flex-col
          ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}
        `}
      >
        {/* Mobile back button */}
        {mobileView === 'chat' && (
          <button
            onClick={() => {
              setMobileView('list');
              router.push('/chats');
            }}
            className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-[#e4e6eb] dark:border-[#3a3b3c] text-[#0084ff] bg-white dark:bg-[#1c1e21] shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        {activeSid && activeConv ? (
          <div className="flex-1 overflow-hidden">
            <MessengerConversation
              key={activeSid}
              conversationSid={activeSid}
              peerName={activePeerName}
              peerAvatar={activeFriend?.profilePictureUrl}
              peerIdentity={activeFriend?.id ?? activeSid}
            />
          </div>
        ) : (
          <MessengerEmpty />
        )}
      </div>
    </div>
  );
}
