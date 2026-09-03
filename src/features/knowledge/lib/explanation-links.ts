import type { ExternalLink } from '../types/knowledge';

/**
 * Whether a further-reading link the model produced is one a reader can actually follow.
 *
 * THE LINKS ARE MODEL-INVENTED and nothing on either side fetches them (see the note at the top of
 * `explanation-card.tsx`), so syntax is the only check available — but it catches the failure that
 * actually happens. A URL a model emits to be clicked is ASCII: an internationalised host arrives
 * punycoded, an internationalised path percent-encoded. Raw non-ASCII in the string means the
 * model corrupted it mid-generation — observed 31/08/2026, a Datadog blog URL with Tamil script
 * spliced into the path — and `new URL()` will not reject it (it just percent-encodes the mess),
 * so the check has to be explicit. A dead link under a card whose whole banner says "verify this"
 * is worse than one link fewer.
 *
 * WHAT THIS DOES NOT CATCH: a well-formed URL that is simply wrong — a real host, a real-looking
 * path, a 404 anyway, or a title that does not match the page it points at. That needs a request,
 * and `knowledge.explain.byAiNote` already tells the reader the whole card is model-generated.
 */
export function isFollowableLink(link: Pick<ExternalLink, 'url'>): boolean {
  const raw = link.url?.trim();
  if (!raw) return false;

  // Anything outside printable ASCII is the hallucination tell — see above. One check covers the
  // spliced-in non-Latin script and any stray control character.
  if (/[^ -~]/.test(raw)) return false;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  // A host with no dot ("localhost", "intranet") is not a public further-reading target.
  return parsed.hostname.includes('.');
}

/** The model's links, minus the ones that will not resolve. Order preserved. */
export function followableLinks(links: readonly ExternalLink[] | null | undefined): ExternalLink[] {
  return (links ?? []).filter(isFollowableLink);
}
