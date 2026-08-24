'use client';

import * as React from 'react';
import { Badge } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { CodeSnippetDetails } from '../types/post';
import { ExpandableBlock } from './expandable-block';

/**
 * Read side of a `CODE_SNIPPET` post — fills `PostCard`'s `body` slot.
 *
 * IT IS HIGHLIGHTED NOW, AND THE NOTE THIS FILE USED TO CARRY ARGUED AGAINST IT. That note said
 * three things: `language` is free text so a highlighter would be guessing, a highlighter is a
 * new runtime dependency, and the design system specifies no syntax colours. The owner asked for
 * colour, and each objection has an answer rather than being waved past:
 *
 *  - IT NEVER GUESSES. `highlightCode` colours only the slugs the composer offers and returns
 *    `null` for everything else, including `plaintext` and anything a client wrote by hand. No
 *    `highlightAuto` — a wrong language guess produces confident, wrong colour, which is worse
 *    than none.
 *  - THE DEPENDENCY IS NOT ON THE FEED'S CRITICAL PATH. `highlight.js` is `import()`ed from an
 *    effect, only by a card that actually holds a snippet, so the eight other post types and
 *    every route without code pay nothing. Until it resolves the plain text below is what shows,
 *    which is also what a reader with JavaScript off keeps.
 *  - THE COLOURS ARE THE DS's OWN RAMPS. Seven roles built from ink/blue/amber/green/red, defined
 *    as `--nx-syntax-*` in `globals.css` and stepped for both themes. No vendor theme is imported;
 *    every one of them ships its own background and would paint a second plane inside the card.
 *
 * THE BLOCK IS CAPPED AT 320 AND "XEM THÊM" GOES TO THE POST. A sixty-line paste is a fine post
 * and a bad feed card — see `ExpandableBlock` for why the rest lives at `/posts/{id}` rather than
 * in a modal or in a card that grows. The cap is skipped entirely when no `href` is supplied.
 *
 * HORIZONTAL SCROLL SURVIVES INSIDE THE CAP, deliberately, and this is the one place the owner's
 * "wrap it" would have cost something real: wrapping a long line re-indents it, so the code on
 * screen is no longer the code the author wrote. The cap solves the height problem — which is the
 * one that breaks the column — and the line that is too wide still scrolls on its own axis.
 */
export interface CodeSnippetBodyProps {
  details: CodeSnippetDetails;
  /**
   * The post's permalink, for "Xem thêm" on a snippet too long for its card.
   *
   * OPTIONAL, AND THE CAP TURNS OFF WITHOUT IT. A caller that cannot name a destination — a
   * preview with no post behind it — gets the snippet whole rather than a cut one with no way to
   * finish reading it, which would be strictly worse than no cap at all.
   */
  href?: string;
  className?: string;
}

/** Collapsed height. ~14 lines of `--text-nx-code` at 1.6, which is a readable excerpt. */
const COLLAPSED_HEIGHT = 320;

export function CodeSnippetBody({ details, href, className }: CodeSnippetBodyProps) {
  const t = useT();
  const { language, code } = details;
  const [html, setHtml] = React.useState<string | null>(null);

  /**
   * THE HIGHLIGHTER ARRIVES AFTER THE FIRST PAINT, ON PURPOSE — see the module note. `cancelled`
   * guards the case that matters on a feed: a card scrolled past and unmounted before the chunk
   * resolved would otherwise set state on a dead component.
   */
  React.useEffect(() => {
    if (!code?.trim()) return;
    let cancelled = false;

    import('../lib/highlight')
      .then(({ highlightCode }) => {
        if (!cancelled) setHtml(highlightCode(code, language));
      })
      .catch(() => {
        // A failed chunk load is not worth surfacing: the plain rendering below is already correct
        // and complete, and an error toast about colour would be noise about nothing missing.
      });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  // A snippet post with no code is possible: `buildAndSavePost` copies the block through
  // `BeanUtils` with no validation for CODE_SNIPPET (only EVENT and quiz are checked), so
  // an empty block reaches the feed. Render nothing rather than an empty well.
  if (!code?.trim()) return null;

  const label = language?.trim() || t('post.body.code');

  /**
   * `dangerouslySetInnerHTML` IS SAFE HERE AND NOWHERE ELSE NEARBY. `hljs.highlight` escapes its
   * input before it wraps tokens, so the only markup in `html` is the `<span>`s it added — the
   * author's code cannot introduce any. The plain branch is a text node and needs no such
   * argument, which is why it stays the fallback rather than being dropped once colour works.
   */
  const codeElement = html ? (
    <code
      className="font-mono text-nx-code text-nx-text-primary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <code className="font-mono text-nx-code text-nx-text-primary">{code}</code>
  );

  const pre = <pre className="overflow-x-auto bg-nx-surface-card p-3">{codeElement}</pre>;

  return (
    <figure
      className={cn('overflow-hidden rounded-nx-sm border border-nx-border-default', className)}
    >
      <figcaption className="flex items-center gap-2 border-b border-nx-border-subtle bg-nx-surface-sunken px-3 py-2">
        <Badge mono variant="neutral">
          {label}
        </Badge>
      </figcaption>

      {href ? (
        <ExpandableBlock
          maxHeight={COLLAPSED_HEIGHT}
          href={href}
          // The figure has no padding of its own — the `<pre>` carries it — so the link needs its
          // own inset or it would sit flush against the figure's border.
          buttonClassName="mx-3 mb-3"
        >
          {pre}
        </ExpandableBlock>
      ) : (
        pre
      )}
    </figure>
  );
}
