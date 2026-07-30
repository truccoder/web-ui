import { Badge } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import type { QnaDetails } from '../types/post';

/**
 * Read side of a `QNA` post — fills `PostCard`'s `body` slot.
 *
 * This block is one status pill, and that is the whole honest surface:
 *
 *  - `bountyPoints` is NOT rendered (ds-deviations #12). Nothing in the backend reads it —
 *    `acceptAnswer` awards a FIXED amount through `RepSourceType.ACCEPTED_ANSWER`, does not
 *    deduct from the asker, and does not scale by bounty. Showing "500 points offered"
 *    would advertise a payout the system never makes.
 *  - `acceptedAnswerId` is not rendered here either. It identifies a comment, so the place
 *    that can act on it is the thread (c-4, which also owns the accept control). Marking
 *    the answer here would need the comment list this card does not fetch.
 *
 * Note for c-4: a QNA post whose `qnaDetails` is null can NEVER accept an answer —
 * `acceptAnswer` throws when the block is missing — and the only repair path is
 * `updatePost`, which blanks every field it is not sent. `PostComposer` already always
 * sends `qnaDetails`, so this is about older rows.
 */
export interface QnaBodyProps {
  details: QnaDetails;
  className?: string;
}

export function QnaBody({ details, className }: QnaBodyProps) {
  const t = useT();

  // `isResolved` is the signal, on its own. It used to be read together with
  // `acceptedAnswerId != null`, because `PostService.acceptAnswer` set only the id and never
  // flipped the flag, so a question with an accepted answer still read "unanswered". The
  // backend maintains the flag now — measured at F-C by round-tripping post 91: accept gives
  // `{"isResolved":true,"acceptedAnswerId":21}` and the undo puts both back — so the second
  // clause could no longer change the outcome, and a redundant condition invites the next
  // reader to wonder which of the two is authoritative.
  const resolved = details.isResolved === true;

  return (
    <div className={cn('flex', className)}>
      <Badge dot variant={resolved ? 'success' : 'neutral'}>
        {resolved ? t('post.body.qnaResolved') : t('post.body.qnaUnresolved')}
      </Badge>
    </div>
  );
}
