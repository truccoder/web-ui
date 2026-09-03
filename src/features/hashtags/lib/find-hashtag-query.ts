/**
 * Finds the `#`-hashtag being typed right before `caret`, if any.
 *
 * Mirrors the trigger `features/search`'s `findMentionQuery` uses for `@`: the `#` must sit at the
 * start of the text or right after whitespace, so a `#` inside a URL fragment (`example.com/#top`)
 * or an `id#name` never opens the dropdown. The body is `\w` only — `[A-Za-z0-9_]`, the class the
 * backend's `PostService` extracts hashtags with (`#(\w+)`), so a tag this box completes is a tag
 * the server will actually pick out of the posted content. It matches a PARTIAL body (zero or more
 * characters) because the dropdown has to open on the keystroke that types `#` itself.
 *
 * `start` is the index of the `#`; `query` is the raw body typed so far, before `normalizeHashtag`
 * folds it for the request.
 */
export function findHashtagQuery(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const upToCaret = text.slice(0, caret);
  const match = /(?:^|\s)#(\w{0,100})$/.exec(upToCaret);
  if (!match) return null;
  return { start: caret - match[1].length - 1, query: match[1] };
}
