import { describe, expect, it } from 'vitest';
import { en } from '@/core/i18n/translations/en';
import { vi as viBundle } from '@/core/i18n/translations/vi';
import type { TranslateFn } from '@/core/i18n';
import type { AppNotification } from '../types/notification';
import { localizeNotificationText } from './notification-text';

/**
 * `localizeNotificationText` renders a notification line in the reader's language from either the
 * backend's structured `messageKey`/`messageArgs` (tier 1) or, for rows written before `V104`
 * added those columns, the English sentence it used to bake into `body` (tier 2). These tests pin
 * three things: the structured payload wins where it exists, the legacy parse still pulls the
 * right spans out of every pre-`V104` template, and — the load-bearing property — anything that
 * matches neither falls back to the raw backend string rather than to something worse.
 *
 * The `t` under test is the real interpolation against a chosen bundle, so a placeholder typo in
 * `notifications.line.*` (`${acter}`) fails here too, not just visually.
 */

function translator(locale: 'en' | 'vi'): TranslateFn {
  const bundle = (locale === 'en' ? en : viBundle) as unknown as Record<string, unknown>;
  return (key, vars) => {
    const raw = key.split('.').reduce<unknown>((cur, part) => {
      if (cur == null || typeof cur !== 'object') return undefined;
      return (cur as Record<string, unknown>)[part];
    }, bundle);
    if (typeof raw !== 'string') return key;
    return vars ? raw.replace(/\$\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : raw;
  };
}

function notification(over: Partial<AppNotification>): AppNotification {
  return {
    id: 1,
    type: 'POST_LIKED',
    title: 'New reaction on your post',
    channel: 'PUSH',
    isRead: false,
    createdAt: '2026-09-02T00:00:00Z',
    actorId: 7,
    body: null,
    messageKey: null,
    messageArgs: null,
    postId: null,
    referenceId: null,
    referenceType: null,
    ...over,
  } as AppNotification;
}

const enT = translator('en');
const viT = translator('vi');

describe('localizeNotificationText — structured payload (tier 1)', () => {
  it('renders from messageKey and messageArgs', () => {
    const n = notification({
      type: 'POST_LIKED',
      body: 'Bùi Gia Thắng reacted to your post',
      messageKey: 'POST_LIKED',
      messageArgs: { actor: 'Bùi Gia Thắng' },
    });
    expect(localizeNotificationText(n, viT)).toBe(
      'Bùi Gia Thắng đã bày tỏ cảm xúc về bài viết của bạn'
    );
    expect(localizeNotificationText(n, enT)).toBe('Bùi Gia Thắng reacted to your post');
  });

  it('renders the two RSVP variants the backend sends as separate keys', () => {
    expect(
      localizeNotificationText(
        notification({
          type: 'EVENT_RSVP',
          messageKey: 'EVENT_RSVP_INTERESTED',
          messageArgs: { actor: 'Lan', event: 'Hà Nội Meetup' },
        }),
        viT
      )
    ).toBe('Lan quan tâm tới Hà Nội Meetup');
  });

  it('localises the backend’s "Someone" placeholder in messageArgs too', () => {
    const n = notification({
      type: 'POST_LIKED',
      messageKey: 'POST_LIKED',
      messageArgs: { actor: 'Someone' },
    });
    expect(localizeNotificationText(n, viT)).toBe('Ai đó đã bày tỏ cảm xúc về bài viết của bạn');
  });

  it('prefers the structured payload over a body it could also have parsed', () => {
    // The backend still writes the English `body` for push and email; when both are present the
    // key is the one that speaks the reader's language, so it must win.
    const n = notification({
      type: 'BOOK_REVIEW',
      body: 'Lan reviewed "Clean Code"',
      messageKey: 'BOOK_REVIEW',
      messageArgs: { actor: 'Lan', book: 'Refactoring' },
    });
    expect(localizeNotificationText(n, viT)).toBe('Lan đã đánh giá “Refactoring”');
  });

  it('falls through to the legacy parse when the key is one this build does not know', () => {
    const n = notification({
      type: 'POST_LIKED',
      body: 'Mai reacted to your post',
      messageKey: 'POST_SHRUGGED_AT',
      messageArgs: { actor: 'Mai' },
    });
    expect(localizeNotificationText(n, viT)).toBe('Mai đã bày tỏ cảm xúc về bài viết của bạn');
  });
});

describe('localizeNotificationText — legacy English templates (tier 2)', () => {
  it('lifts the actor name out of a POST_LIKED body', () => {
    const n = notification({ type: 'POST_LIKED', body: 'Bùi Gia Thắng reacted to your post' });
    expect(localizeNotificationText(n, enT)).toBe('Bùi Gia Thắng reacted to your post');
    expect(localizeNotificationText(n, viT)).toBe(
      'Bùi Gia Thắng đã bày tỏ cảm xúc về bài viết của bạn'
    );
  });

  it('handles every actor-only type', () => {
    const cases: Array<[AppNotification['type'], string, string]> = [
      [
        'COMMENT_LIKED',
        'Mai reacted to your comment',
        'Mai đã bày tỏ cảm xúc về bình luận của bạn',
      ],
      ['POST_COMMENTED', 'Mai commented on your post', 'Mai đã bình luận bài viết của bạn'],
      ['POST_TAGGED', 'Mai tagged you in a post', 'Mai đã gắn thẻ bạn trong một bài viết'],
      [
        'USER_MENTIONED',
        'Mai mentioned you in a comment',
        'Mai đã nhắc tới bạn trong một bình luận',
      ],
      ['FRIEND_REQUEST', 'Mai sent you a friend request', 'Mai đã gửi cho bạn lời mời kết bạn'],
      [
        'FRIEND_ACCEPTED',
        'Mai accepted your friend request',
        'Mai đã chấp nhận lời mời kết bạn của bạn',
      ],
    ];
    for (const [type, body, viText] of cases) {
      expect(localizeNotificationText(notification({ type, body }), viT)).toBe(viText);
    }
  });

  it('swaps the backend’s "Someone" placeholder for the localised word', () => {
    const n = notification({ type: 'POST_LIKED', body: 'Someone reacted to your post' });
    expect(localizeNotificationText(n, viT)).toBe('Ai đó đã bày tỏ cảm xúc về bài viết của bạn');
  });
});

describe('localizeNotificationText — quoted-subject templates', () => {
  it('splits actor and book title', () => {
    const n = notification({ type: 'BOOK_REVIEW', body: 'Lan reviewed "Clean Code"' });
    expect(localizeNotificationText(n, viT)).toBe('Lan đã đánh giá “Clean Code”');
  });

  it('reads the RSVP verb and event title', () => {
    expect(
      localizeNotificationText(
        notification({ type: 'EVENT_RSVP', body: 'Lan is going to Hà Nội Meetup' }),
        viT
      )
    ).toBe('Lan sẽ tham gia Hà Nội Meetup');
    expect(
      localizeNotificationText(
        notification({ type: 'EVENT_RSVP', body: 'Lan is interested in Hà Nội Meetup' }),
        viT
      )
    ).toBe('Lan quan tâm tới Hà Nội Meetup');
  });

  it('handles the actor-less decision templates', () => {
    expect(
      localizeNotificationText(
        notification({ type: 'SKILL_VERIFIED', body: 'Your claim for "Kubernetes" was verified' }),
        viT
      )
    ).toBe('Yêu cầu xác minh “Kubernetes” của bạn đã được duyệt');
    expect(
      localizeNotificationText(
        notification({
          type: 'PROJECT_MEMBER_REMOVED',
          body: 'You were removed from the team on "Nexus"',
        }),
        viT
      )
    ).toBe('Bạn đã bị loại khỏi nhóm của “Nexus”');
  });
});

describe('localizeNotificationText — fallback', () => {
  it('returns a legacy Vietnamese seed body untouched', () => {
    const legacy = 'Bùi Gia Thắng đã bày tỏ cảm xúc về bài viết của bạn.';
    const n = notification({ type: 'POST_LIKED', body: legacy });
    expect(localizeNotificationText(n, enT)).toBe(legacy);
  });

  it('falls back to the title when there is no body', () => {
    const n = notification({ type: 'POST_LIKED', body: null, title: 'New reaction on your post' });
    expect(localizeNotificationText(n, viT)).toBe('New reaction on your post');
  });

  it('does not misfire when the backend wording changes', () => {
    const n = notification({ type: 'POST_LIKED', body: 'Mai loved your post' });
    expect(localizeNotificationText(n, viT)).toBe('Mai loved your post');
  });
});
