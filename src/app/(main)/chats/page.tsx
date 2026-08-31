'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatMessenger } from '@/features/chat';

/**
 * `/chats` — the full-screen messenger.
 *
 * The page owns exactly one thing: which conversation the URL names. Everything else lives in
 * `features/chat`, reached through its barrel. The Twilio version this replaces resolved peer
 * names against the friend list here, in the page, because its conversation objects only carried
 * a "friendly name" string — the Stream client carries channel members, so that guesswork is gone
 * rather than ported.
 */
export default function ChatsPage() {
  // `useSearchParams` opts the tree into client-side rendering; the boundary keeps that from
  // deopting the whole route.
  return (
    <Suspense>
      <ChatsContent />
    </Suspense>
  );
}

/**
 * The conversation id lives in `?c=`, not the Twilio-era `?sid=`.
 *
 * Renaming rather than reusing: Stream channel ids are not Twilio SIDs, so every old link is dead
 * either way, and keeping the name would leave the address bar claiming a provider the app no
 * longer talks to.
 */
const CONVERSATION_PARAM = 'c';

function ChatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get(CONVERSATION_PARAM);

  const select = useCallback(
    (conversationId: string) => {
      router.push(`/chats?${CONVERSATION_PARAM}=${encodeURIComponent(conversationId)}`);
    },
    [router]
  );

  // Back clears the parameter instead of calling `router.back()`: history may not have `/chats`
  // behind it at all when a conversation was deep-linked into.
  const clear = useCallback(() => router.push('/chats'), [router]);

  return (
    <ChatMessenger activeConversationId={activeConversationId} onSelect={select} onBack={clear} />
  );
}
