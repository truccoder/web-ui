'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useConversations } from '../hooks/use-conversations';

/**
 * "Message this person" — for a surface that is about one person.
 *
 * IT COULD NOT EXIST UNTIL `POST /chat/participants/{userId}` HAD A CALLER. Stream refuses to
 * create a channel containing a user it has never seen, and `GET /token` only ever introduced the
 * caller and their friends — so a message button on a stranger's profile would have failed at
 * channel creation, with an error naming the member rather than the reason. `startConversation`
 * now introduces the pair first, which is what makes this button honest.
 *
 * IT NAVIGATES RATHER THAN OPENING A DOCK. The conversation has a URL (`/chats?c={id}`), and
 * sending someone to the real surface means the message they are about to write survives a reload
 * and can be returned to — a floating panel on a profile page would lose both.
 *
 * IT DOES NOT CHECK FRIENDSHIP, deliberately: nothing server-side gates who may be messaged
 * (`findings/chat.md` R6, option (a)), and `ensureParticipants` is idempotent for friends too. A
 * check here would be this component inventing a rule the product does not have.
 */
export interface MessageUserButtonProps {
  /** The other person. Numeric — Stream ids are the backend's user ids as strings. */
  userId: number;
  className?: string;
}

export function MessageUserButton({ userId, className }: MessageUserButtonProps) {
  const t = useT();
  const router = useRouter();
  const { startConversation } = useConversations();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const open = async () => {
    setPending(true);
    setError(null);
    try {
      const conversationId = await startConversation(String(userId));
      router.push(`/chats?c=${encodeURIComponent(conversationId)}`);
    } catch (cause) {
      // Chat has a real "not configured" failure (503 when Stream keys are unset), so this is
      // shown rather than swallowed — otherwise the button just does nothing, twice.
      setError(cause);
      setPending(false);
    }
  };

  return (
    <div className={className}>
      <Button
        size="sm"
        variant="secondary"
        icon={<MessageCircle />}
        loading={pending}
        onClick={open}
      >
        {t('chat.messageUser')}
      </Button>

      {error != null && (
        <p role="alert" className="mt-1 text-nx-caption text-nx-status-danger-fg">
          {getErrorMessage(error, t('chat.messageUserError'))}
        </p>
      )}
    </div>
  );
}
