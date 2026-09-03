import type { TranslateFn } from '@/core/i18n';
import type { AppNotification, NotificationType } from '../types/notification';

/**
 * The notification line, in the reader's language — B41.
 *
 * TWO TIERS, AND THE ORDER IS THE WHOLE DESIGN.
 *
 * **1. `messageKey` + `messageArgs`, the contract.** `NotificationResponseDto` now carries the
 * localisable form of the sentence: a template key from the backend's `NotificationMessages`
 * (`POST_LIKED`, `BOOK_REVIEW`, …) and the variables it interpolates (`{ actor: "Ada" }`). The
 * row is rendered from this app's own bundle, so it follows the UI language. This is the path
 * every notification written from `V104` onward takes.
 *
 * **2. The English templates, for rows written before that.** `V104` added the columns and
 * deliberately did not backfill, so every notification already in the database has
 * `messageKey: null` and only the pre-built English `body` ("X reacted to your post"). Those
 * rows are matched against the exact strings the producers used to emit and re-rendered from the
 * same bundle keys. This tier is frozen history: it never needs a new entry, because a new
 * notification cannot be written without a `messageKey`.
 *
 * IT DEGRADES TO THE BACKEND STRING, NEVER TO ANYTHING WORSE. Any path that matches nothing —
 * an old Vietnamese seed row, a display name that itself ends with " reacted to your post", a
 * bundle key that somehow is not there — falls through to `body || title`, which is what the row
 * rendered before either tier existed.
 */

/**
 * A matcher for one template: given the backend `body`, either a `(key, vars)` pair to render
 * from the bundle, or `null` to let the caller fall back.
 */
type Match = (body: string) => { key: string; vars: Record<string, string> } | null;

/** `"<name> <tail>"` → the leading name. Used by the seven actor-only templates. */
function actorSuffix(tail: string, key: string): Match {
  return (body) => {
    if (!body.endsWith(tail)) return null;
    const actor = body.slice(0, -tail.length).trim();
    return actor ? { key, vars: { actor } } : null;
  };
}

/** A regex whose capture groups are bound, in order, to the given var names. */
function pattern(re: RegExp, key: string, names: readonly string[]): Match {
  return (body) => {
    const m = re.exec(body);
    if (!m) return null;
    const vars: Record<string, string> = {};
    names.forEach((name, i) => {
      vars[name] = m[i + 1] ?? '';
    });
    return { key, vars };
  };
}

/**
 * TIER 2 — the English templates the producers emitted BEFORE `messageKey` existed, keyed off
 * the exact strings they built (grepped from `com.socialapp.*` against backend `cab4f5c`). It
 * covers the rows `V104` left with `message_key = NULL` and nothing else, so it is a closed set:
 * a notification written today arrives with a key and never reaches here.
 *
 * `Record<NotificationType, …>` is exhaustive ON PURPOSE — a new enum member stops this file
 * compiling until someone decides what an old row of that type should say (usually: nothing,
 * because none exists).
 */
const MATCHERS: Record<NotificationType, readonly Match[]> = {
  POST_LIKED: [actorSuffix(' reacted to your post', 'notifications.line.POST_LIKED')],
  COMMENT_LIKED: [actorSuffix(' reacted to your comment', 'notifications.line.COMMENT_LIKED')],
  POST_COMMENTED: [actorSuffix(' commented on your post', 'notifications.line.POST_COMMENTED')],
  POST_TAGGED: [actorSuffix(' tagged you in a post', 'notifications.line.POST_TAGGED')],
  USER_MENTIONED: [actorSuffix(' mentioned you in a comment', 'notifications.line.USER_MENTIONED')],
  FRIEND_REQUEST: [actorSuffix(' sent you a friend request', 'notifications.line.FRIEND_REQUEST')],
  FRIEND_ACCEPTED: [
    actorSuffix(' accepted your friend request', 'notifications.line.FRIEND_ACCEPTED'),
  ],
  // `EventService.notifyHost`: `attendeeName + (going ? " is going to " : " is interested in ") + eventTitle`.
  EVENT_RSVP: [
    pattern(/^(.+?) is going to (.+)$/, 'notifications.line.EVENT_RSVP_GOING', ['actor', 'event']),
    pattern(/^(.+?) is interested in (.+)$/, 'notifications.line.EVENT_RSVP_INTERESTED', [
      'actor',
      'event',
    ]),
  ],
  EVENT_REMINDER: [
    pattern(/^(.+) starts within 24 hours$/, 'notifications.line.EVENT_REMINDER', ['event']),
  ],
  BOOK_REVIEW: [
    pattern(/^(.+?) reviewed "(.+)"$/, 'notifications.line.BOOK_REVIEW', ['actor', 'book']),
  ],
  BOOK_PURCHASED: [
    pattern(/^(.+?) purchased "(.+)"$/, 'notifications.line.BOOK_PURCHASED', ['actor', 'book']),
  ],
  SKILL_VERIFIED: [
    pattern(/^Your claim for "(.+)" was verified$/, 'notifications.line.SKILL_VERIFIED', ['skill']),
  ],
  SKILL_REJECTED: [
    pattern(/^Your claim for "(.+)" was not verified$/, 'notifications.line.SKILL_REJECTED', [
      'skill',
    ]),
  ],
  PROJECT_APPLICATION_ACCEPTED: [
    pattern(
      /^Your application to "(.+)" was accepted$/,
      'notifications.line.PROJECT_APPLICATION_ACCEPTED',
      ['project']
    ),
  ],
  PROJECT_APPLICATION_REJECTED: [
    pattern(
      /^Your application to "(.+)" was declined$/,
      'notifications.line.PROJECT_APPLICATION_REJECTED',
      ['project']
    ),
  ],
  PROJECT_MEMBER_REMOVED: [
    pattern(
      /^You were removed from the team on "(.+)"$/,
      'notifications.line.PROJECT_MEMBER_REMOVED',
      ['project']
    ),
  ],
};

/**
 * The name the backend substitutes when the actor has no `fullName` — `actorName(...)` and
 * `displayName(...)` both `.orElse("Someone")`. Left in the string it would be a stray English
 * word in a Vietnamese line, so it is swapped for the localised equivalent after extraction.
 */
const BACKEND_ANONYMOUS_ACTOR = 'Someone';

/**
 * TIER 1 — backend template key → this app's bundle key.
 *
 * SPELLED OUT RATHER THAN INTERPOLATED as `notifications.line.${messageKey}`, for two reasons:
 * a key built by string concatenation cannot be found by searching the bundle, so a later
 * cleanup reads all sixteen strings as unused and deletes them; and `messageKey` is a value the
 * server chose, so a typo or a key this build has no copy for should fall through to the English
 * body rather than print `notifications.line.WHATEVER` at a reader.
 */
const LINE_KEYS: Record<string, string> = {
  POST_LIKED: 'notifications.line.POST_LIKED',
  COMMENT_LIKED: 'notifications.line.COMMENT_LIKED',
  POST_COMMENTED: 'notifications.line.POST_COMMENTED',
  POST_TAGGED: 'notifications.line.POST_TAGGED',
  USER_MENTIONED: 'notifications.line.USER_MENTIONED',
  FRIEND_REQUEST: 'notifications.line.FRIEND_REQUEST',
  FRIEND_ACCEPTED: 'notifications.line.FRIEND_ACCEPTED',
  EVENT_RSVP_GOING: 'notifications.line.EVENT_RSVP_GOING',
  EVENT_RSVP_INTERESTED: 'notifications.line.EVENT_RSVP_INTERESTED',
  EVENT_REMINDER: 'notifications.line.EVENT_REMINDER',
  BOOK_REVIEW: 'notifications.line.BOOK_REVIEW',
  BOOK_PURCHASED: 'notifications.line.BOOK_PURCHASED',
  SKILL_VERIFIED: 'notifications.line.SKILL_VERIFIED',
  SKILL_REJECTED: 'notifications.line.SKILL_REJECTED',
  PROJECT_APPLICATION_ACCEPTED: 'notifications.line.PROJECT_APPLICATION_ACCEPTED',
  PROJECT_APPLICATION_REJECTED: 'notifications.line.PROJECT_APPLICATION_REJECTED',
  PROJECT_MEMBER_REMOVED: 'notifications.line.PROJECT_MEMBER_REMOVED',
};

/**
 * The row's text, localised where possible.
 *
 * `notification.body` is what every producer sets; `title` is the category header and is only
 * the fallback's fallback (the schema allows it absent — hence `||` catching the empty string
 * too). If a rendered bundle string comes back equal to its own key, the key is missing and we
 * fall back rather than print `notifications.line.POST_LIKED` at someone.
 */
export function localizeNotificationText(notification: AppNotification, t: TranslateFn): string {
  const fallback = notification.body || notification.title;

  // TIER 1 — the structured payload, when the row has one.
  const bundleKey = notification.messageKey ? LINE_KEYS[notification.messageKey] : undefined;
  if (bundleKey) {
    const rendered = t(bundleKey, localizeActor(notification.messageArgs ?? {}, t));
    if (rendered !== bundleKey) return rendered;
  }

  // TIER 2 — a row written before `messageKey` existed.
  const body = notification.body?.trim();
  if (!body) return fallback;

  for (const matcher of MATCHERS[notification.type] ?? []) {
    const hit = matcher(body);
    if (!hit) continue;

    const rendered = t(hit.key, localizeActor(hit.vars, t));
    if (rendered !== hit.key) return rendered;
  }

  return fallback;
}

/**
 * Swaps the backend's own placeholder name for the localised one.
 *
 * `actorName(...)`/`displayName(...)` both `.orElse("Someone")` when the user has no `fullName`,
 * and the backend sends that literal through in `messageArgs` exactly as it used to bake it into
 * `body`. Left alone it is a stray English word in the middle of a Vietnamese sentence.
 */
function localizeActor(vars: Record<string, string>, t: TranslateFn): Record<string, string> {
  return vars.actor === BACKEND_ANONYMOUS_ACTOR
    ? { ...vars, actor: t('notifications.someone') }
    : vars;
}
