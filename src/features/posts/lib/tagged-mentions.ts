/**
 * Turning composer `@username` tokens into what `POST /v1/api/posts` wants.
 *
 * THE BACKEND CONTRACT (`PostService.validateTags`): a tagged post carries `taggedUserIds:
 * number[]`, and its `content` must contain the placeholder `@[0]`, `@[1]`, … once each, in the
 * same order as that array. The composer lets the author type readable `@username` mentions
 * (picked from `GET /search/mentions`); this converts them at submit time.
 *
 * ONLY MENTIONS THE AUTHOR ACTUALLY PICKED AND LEFT IN THE TEXT COUNT. A picked friend whose
 * `@username` token was later deleted from the content is dropped; a `@word` that was never picked
 * from the dropdown is left as plain text. Order follows first appearance in the content, which is
 * the order the placeholders must be in.
 */

export interface TaggedMention {
  username: string;
  userId: number;
}

export interface AppliedTags {
  /** `content` with every picked `@username` replaced by its `@[i]` placeholder. */
  content: string;
  /** User ids in placeholder order — `taggedUserIds` for the request. */
  taggedUserIds: number[];
}

/** Matches `@handle` at start-of-string or after whitespace — mirrors the backend's mention scan. */
const mentionToken = (username: string) =>
  new RegExp(`(^|\\s)@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

export function applyTaggedMentions(content: string, picked: TaggedMention[]): AppliedTags {
  // De-dupe by userId, keep first pick.
  const unique: TaggedMention[] = [];
  for (const m of picked) {
    if (!unique.some((u) => u.userId === m.userId)) unique.push(m);
  }

  // Keep only those whose token is still present, ordered by where they first appear.
  const present = unique
    .map((m) => ({ mention: m, at: content.search(mentionToken(m.username)) }))
    .filter((entry) => entry.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.mention);

  let result = content;
  const taggedUserIds: number[] = [];
  present.forEach((m, index) => {
    // Replace every occurrence, preserving the leading space/BOL that the token match captured.
    result = result.replace(mentionToken(m.username), `$1@[${index}]`);
    taggedUserIds.push(m.userId);
  });

  return { content: result, taggedUserIds };
}

/**
 * The inverse, for the preview card: `@[0]` → `@Ada Lovelace`. Used only to render — the request
 * always carries the placeholder form.
 */
export function renderTaggedPlaceholders(content: string, names: string[]): string {
  return content.replace(/@\[(\d+)\]/g, (whole, n: string) => {
    const name = names[Number(n)];
    return name ? `@${name}` : whole;
  });
}
