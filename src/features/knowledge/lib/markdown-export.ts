import type { Explanation } from '../types/knowledge';

/**
 * Turning a saved explanation into a `.md` file the reader can keep.
 *
 * WHY THE TEMPLATE IS APPLIED IN THE BROWSER. A server-side template would only matter if the
 * Obsidian plugin read it, and `/knowledge/sync/pull` returns `ExplanationResponseDto` as JSON —
 * the plugin is what assembles a markdown file, and the plugin lives in another repository. So a
 * stored template would be a setting that changed nothing until work happened somewhere this
 * codebase cannot reach. Applying it here works today, for the readers who never install the
 * plugin at all.
 *
 * PLACEHOLDERS ARE `{{name}}`, NOT `${name}`. The i18n layer interpolates `${...}` in every string
 * it renders, so a `${title}` sitting in a hint or a default template would be eaten before anyone
 * saw it.
 */

export const EXPORT_PLACEHOLDERS = [
  'title',
  'url',
  'category',
  'complexity',
  'version',
  'date',
  'body',
] as const;

export type ExportPlaceholder = (typeof EXPORT_PLACEHOLDERS)[number];

/**
 * Frontmatter plus the explanation, which is the shape a Dataview user expects.
 *
 * Deliberately small: someone who does not care about frontmatter should be able to ignore this
 * setting entirely and still get a sensible file.
 */
export const DEFAULT_EXPORT_TEMPLATE = `---
title: "{{title}}"
source_url: "{{url}}"
category: "{{category}}"
complexity: {{complexity}}
synced_date: "{{date}}"
---

# {{title}}

{{body}}
`;

/**
 * An explanation has no title field — `ExplanationResponseDto` never had one. The first concept is
 * the closest thing the model produces to a name for what it just wrote, and it is what the card
 * leads with, so a file named after it matches what the reader clicked.
 */
function exportTitle(explanation: Explanation): string {
  const concept = explanation.concepts?.[0]?.trim();
  if (concept) return concept;
  return explanation.postId != null ? `explanation-${explanation.postId}` : 'explanation';
}

/**
 * `postId` is the only handle an explanation has on where it came from, and the library row
 * already links to `/posts/{id}` — so the exported file points at the same place rather than at an
 * API route the reader cannot open.
 */
function sourceUrl(explanation: Explanation, origin: string): string {
  return explanation.postId != null ? `${origin}/posts/${explanation.postId}` : '';
}

/**
 * A filename that survives every filesystem the file might land on.
 *
 * Windows rejects the reserved set outright and Obsidian vaults sync between platforms, so a title
 * like `Redis: cache stampede` would produce a file nobody on Windows could save. Vietnamese
 * diacritics are LEFT ALONE — they are valid in every modern filesystem, and stripping them would
 * mangle the titles of a product whose users mostly write in Vietnamese.
 */
export function exportFilename(explanation: Explanation): string {
  const safe = exportTitle(explanation)
    .replace(/[\\/:*?"<>|]/g, '-')
    // Control characters break a download on Windows as surely as the reserved set above.
    // Filtered by code point rather than matched with a character class: a literal control
    // character inside `/[...]/` is invisible in the source and in every diff of it.
    .split('')
    .filter((char) => char.charCodeAt(0) > 31)
    .join('')
    // A name ending in a dot or a space is rejected there even when every character is legal.
    .replace(/[.\s]+$/, '')
    .slice(0, 80)
    .trim();
  return `${safe || 'explanation'}.md`;
}

export interface RenderExportOptions {
  template: string;
  localeTag: string;
  /** `window.location.origin`, passed in so this stays pure and testable. */
  origin: string;
}

export function renderExport(
  explanation: Explanation,
  { template, localeTag, origin }: RenderExportOptions
): string {
  const values: Record<ExportPlaceholder, string> = {
    title: exportTitle(explanation),
    url: sourceUrl(explanation, origin),
    category: explanation.category ?? '',
    complexity: explanation.complexityScore != null ? String(explanation.complexityScore) : '',
    version: explanation.version != null ? String(explanation.version) : '',
    date: explanation.createdAt
      ? new Date(explanation.createdAt).toLocaleDateString(localeTag)
      : new Date().toLocaleDateString(localeTag),
    body: buildBody(explanation),
  };

  // An unknown placeholder is left verbatim rather than blanked: the template is user-written, and
  // silently deleting a typo tells them nothing about why their frontmatter came out wrong.
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in values ? values[key as ExportPlaceholder] : match
  );
}

/**
 * The explanation plus the blocks that surround it on screen.
 *
 * Concepts, prerequisites and further reading are part of what the model produced, and a file that
 * dropped them would be a worse copy of the card the reader is looking at. Each block appears only
 * when it has content — a saved explanation has no `externalLinks` (there is no column for them),
 * so that section is genuinely absent rather than empty.
 */
function buildBody(explanation: Explanation): string {
  const parts: string[] = [];

  if (explanation.explanationContent) parts.push(explanation.explanationContent.trim());

  const concepts = explanation.concepts ?? [];
  if (concepts.length > 0) {
    parts.push(`## Concepts\n\n${concepts.map((c) => `- ${c}`).join('\n')}`);
  }

  const prerequisites = explanation.prerequisites ?? [];
  if (prerequisites.length > 0) {
    parts.push(`## Prerequisites\n\n${prerequisites.map((p) => `- ${p}`).join('\n')}`);
  }

  const links = explanation.externalLinks ?? [];
  if (links.length > 0) {
    parts.push(
      `## Further reading\n\n${links
        .map((link) => {
          const label = link.title ?? link.url ?? '';
          const href = link.url ?? '';
          const reason = link.reason ? ` — ${link.reason}` : '';
          return `- [${label}](${href})${reason}`;
        })
        .join('\n')}`
    );
  }

  return parts.join('\n\n');
}
