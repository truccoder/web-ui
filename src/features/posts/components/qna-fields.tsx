'use client';

import { HelpCircle } from 'lucide-react';
import { useT } from '@/core/i18n';

/**
 * `QNA` — and the one kind in this checkpoint with **nothing for the author to fill in**.
 *
 * WHY THIS COMPONENT HAS NO INPUTS. `QnaDetails` is `{ isResolved, bountyPoints,
 * acceptedAnswerId }`. Two of the three are reader-side state written by
 * `PostService.acceptAnswer`, not by the composer. The question itself is the post's
 * `content`. The third, `bountyPoints`, is CUT — see below.
 *
 * WHY THE COMPOSER STILL SENDS AN EMPTY `qnaDetails` OBJECT. `acceptAnswer` opens with
 * `if (post.getPostType() != PostType.QNA || post.getQnaDetails() == null) throw`. A QNA post
 * created without a `qnaDetails` object therefore **cannot** accept an answer until something
 * back-fills the object, and the only thing that can is `updatePost` — which copies the whole
 * request over the entity with `BeanUtils.copyProperties`, nulling every field the request
 * omits. Repairing it that way would blank the post's content and location. So sending
 * `{ isResolved: false }` up front is not decoration: it is what keeps the accept-answer flow
 * (cycle 2) reachable without a destructive edit.
 *
 * WHY `bountyPoints` IS CUT. Nothing in the backend reads it: it is declared in the entity and
 * echoed in the feed/search payloads, and that is the whole of it. `acceptAnswer` awards a
 * **fixed** `RepSourceType.ACCEPTED_ANSWER` amount through `ReputationEventPublisher` — the
 * bounty is never deducted from the asker and never added to the answerer. A field labelled
 * "offer N points" that transfers nothing is the same defect as the ignore-suggestion button
 * with no handler (ledger DS deviation #9). Reinstate it when the backend actually pays it.
 *
 * The panel is not filler: it tells the author what a Q&A post does differently, which is
 * otherwise invisible until someone answers.
 */
export function QnaFields() {
  const t = useT();

  return (
    <div className="flex gap-2 rounded-nx-sm bg-nx-status-info-bg px-3 py-2.5 text-nx-status-info-fg">
      {/* eslint-disable-next-line no-restricted-syntax --
          R10 §3.2 exception: optical correction on an inline icon, level with the first line of
          the hint beside it. */}
      <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="text-nx-body-sm font-medium">{t('createPost.qna.noticeTitle')}</p>
        <p className="text-nx-caption">{t('createPost.qna.noticeDesc')}</p>
      </div>
    </div>
  );
}
