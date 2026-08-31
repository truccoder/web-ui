/**
 * The model indents a nested bullet by a SINGLE space — `\n * Tưởng tượng: …` sitting under a
 * `* …` point. CommonMark needs a child marker indented to at least the parent marker's width
 * (two, for `* `), so `remark-gfm` reads every one of those as a sibling and the answer renders
 * as one flat list with the hierarchy the model built gone (observed 31/08/2026). Bumping an
 * exactly-one-space indent to two restores the nesting; touching only the 1→2 case leaves deeper
 * levels, prose and code alone, and fenced blocks are skipped so a snippet whose line starts
 * " *" is not rewritten. It is a nudge for one specific model habit, not a Markdown fixer.
 */
export function fixSingleSpaceNesting(md: string): string {
  const fence = /^\s*(```|~~~)/;
  let inFence = false;

  return md
    .split('\n')
    .map((line) => {
      if (fence.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(/^ ([*+-] |\d{1,9}[.)] )/, '  $1');
    })
    .join('\n');
}
