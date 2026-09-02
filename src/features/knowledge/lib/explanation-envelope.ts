import type { Explanation, ExternalLink, LearningCategory } from '../types/knowledge';

/**
 * Salvage an explanation whose `explanationContent` is the model's UNPARSED JSON envelope.
 *
 * THE BACKEND BUG THIS PAPERED OVER IS FIXED (B40, closed): `ExplanationService` strips the
 * fence, trims to the outermost braces, runs one repair round-trip and otherwise answers 503, so
 * no NEW explanation arrives as an envelope. What it still salvages is HISTORY — every library
 * row saved while the bug was live kept the raw envelope in its `explanationContent`, and nothing
 * on the backend rewrites those. Delete this only once that data is gone.
 *
 * What the bug was: `ExplanationService.explainPost`
 * asks Gemini for a structured object — `{ "explanation": "...markdown...", "concepts": [...],
 * "prerequisites": [...], "complexityScore": n, "category": "...", "externalLinks": [...] }` — and
 * maps it into `ExplanationResponseDto`. When the model answers with the JSON wrapped in a
 * ```` ```json ```` fence, or with prose around it, or slightly malformed, the backend's
 * deserialize step throws and it FALLS BACK to dumping the whole raw string into
 * `explanationContent`. The card then renders that envelope verbatim: the reader sees
 * `{ "explanation": "Bài đăng này...\n\n* **...**" }` with the `\n` as literal characters,
 * because a `\n` inside an un-parsed JSON string literal is two characters, not a line break.
 *
 * A brand-new account hits this more often only indirectly: its professional profile is nearly
 * empty, so the prompt is thin and the model drifts from the requested schema more readily.
 *
 * WHAT THIS DOES: if `explanationContent` is detectably that envelope, parse it and lift the
 * inner fields out. The inner `explanation` string becomes `explanationContent` (now with real
 * newlines). The other fields are filled ONLY where the DTO's own field is still empty — the
 * backend sometimes parses `category`/`complexityScore` even when the body salvage fails (the
 * "Khác" / "Độ khó 3/10" badges on an otherwise-broken card), and a value it did resolve is more
 * trustworthy than re-reading the raw blob.
 *
 * WHAT THIS DOES NOT DO: touch a normal answer. Real explanation prose is never a parseable JSON
 * object with an `explanation` key, so a response that does not match every guard below is
 * returned untouched.
 */

const CATEGORIES: readonly LearningCategory[] = [
  'BACKEND',
  'FRONTEND',
  'MOBILE',
  'DEVOPS',
  'DATA_ML',
  'SECURITY',
  'QA',
  'CAREER',
  'OTHER',
];

/** Strip a single wrapping ```` ```json … ``` ```` (or bare ```` ``` ````) fence, if that is all there is. */
function unfence(text: string): string {
  const fenced = /^\s*```(?:json|jsonc|json5)?\s*\n([\s\S]*?)\n?```\s*$/i.exec(text);
  return fenced ? fenced[1].trim() : text.trim();
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return items.length > 0 ? items : null;
}

function asExternalLinks(value: unknown): ExternalLink[] | null {
  if (!Array.isArray(value)) return null;
  const links = value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      title: typeof v.title === 'string' ? v.title : null,
      url: typeof v.url === 'string' ? v.url : null,
      reason: typeof v.reason === 'string' ? v.reason : null,
    }))
    .filter((link) => link.url != null || link.title != null);
  return links.length > 0 ? links : null;
}

export function liftExplanationEnvelope(explanation: Explanation): Explanation {
  const body = explanation.explanationContent?.trim();
  if (!body) return explanation;

  const candidate = unfence(body);
  if (!candidate.startsWith('{') || !candidate.endsWith('}')) return explanation;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return explanation;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return explanation;

  const envelope = parsed as Record<string, unknown>;
  const innerRaw = envelope.explanation ?? envelope.explanationContent ?? envelope.content;
  if (typeof innerRaw !== 'string' || innerRaw.trim().length === 0) return explanation;

  const concepts = explanation.concepts?.length
    ? explanation.concepts
    : asStringArray(envelope.concepts);
  const prerequisites = explanation.prerequisites?.length
    ? explanation.prerequisites
    : asStringArray(envelope.prerequisites);
  const externalLinks = explanation.externalLinks?.length
    ? explanation.externalLinks
    : asExternalLinks(envelope.externalLinks ?? envelope.links);

  const rawScore = envelope.complexityScore ?? envelope.complexity;
  const complexityScore =
    explanation.complexityScore != null
      ? explanation.complexityScore
      : typeof rawScore === 'number' && Number.isFinite(rawScore)
        ? rawScore
        : explanation.complexityScore;

  const rawCategory =
    typeof envelope.category === 'string' ? envelope.category.toUpperCase() : null;
  const envelopeCategory = CATEGORIES.find((c) => c === rawCategory) ?? null;
  // Keep whatever the backend resolved unless it is the `OTHER` default and the envelope names
  // something real — see the DTO note on `category` defaulting to `OTHER`.
  const category =
    explanation.category != null && explanation.category !== 'OTHER'
      ? explanation.category
      : (envelopeCategory ?? explanation.category);

  return {
    ...explanation,
    explanationContent: innerRaw.trim(),
    concepts,
    prerequisites,
    externalLinks,
    complexityScore,
    category,
  };
}
