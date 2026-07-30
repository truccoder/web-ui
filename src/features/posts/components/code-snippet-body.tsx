import { Badge } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import type { CodeSnippetDetails } from '../types/post';

/**
 * Read side of a `CODE_SNIPPET` post — fills `PostCard`'s `body` slot.
 *
 * NO SYNTAX HIGHLIGHTING, deliberately. `CodeSnippetDetails.language` is a free-text String
 * with no enum behind it (the composer's language list is a frontend convenience, not a
 * contract), so a highlighter would have to guess a grammar from an arbitrary label. It
 * would also mean a new runtime dependency and a colour set the design system does not
 * specify — the type scale has `--text-nx-code` and the mono family, and nothing about
 * token colours for syntax. Plain mono in a sunken well is the honest rendering; revisit
 * only with a DS spec to match.
 */
export interface CodeSnippetBodyProps {
  details: CodeSnippetDetails;
  className?: string;
}

export function CodeSnippetBody({ details, className }: CodeSnippetBodyProps) {
  const t = useT();
  const { language, code } = details;

  // A snippet post with no code is possible: `buildAndSavePost` copies the block through
  // `BeanUtils` with no validation for CODE_SNIPPET (only EVENT and quiz are checked), so
  // an empty block reaches the feed. Render nothing rather than an empty well.
  if (!code?.trim()) return null;

  return (
    <figure
      className={cn('overflow-hidden rounded-nx-sm border border-nx-border-default', className)}
    >
      <figcaption className="flex items-center gap-2 border-b border-nx-border-subtle bg-nx-surface-sunken px-3 py-2">
        <Badge mono variant="neutral">
          {language?.trim() || t('post.body.code')}
        </Badge>
      </figcaption>

      {/* The horizontal scroll lives on the <pre>, not on the card: a long line must not
          widen the whole feed column. Wrapping is wrong for code — it silently changes what
          the author's indentation looks like. */}
      <pre className="overflow-x-auto bg-nx-surface-card p-3">
        <code className="font-mono text-nx-code text-nx-text-primary">{code}</code>
      </pre>
    </figure>
  );
}
