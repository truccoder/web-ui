'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fixSingleSpaceNesting } from '../lib/markdown-nesting';

/**
 * The model's answer, rendered as the Markdown it actually is.
 *
 * IT WAS PRINTED RAW UNTIL NOW, and the owner reported the symptom rather than the cause: the
 * explanation was full of `**` and stray `*`. Those are not noise the model adds — they are
 * Markdown emphasis and Markdown bullets, and the card was rendering them into a `<p>` with
 * `whitespace-pre-wrap`, which shows the syntax instead of applying it.
 *
 * `remark-gfm` ON TOP OF THE CORE PARSER, because Gemini writes GitHub-flavoured Markdown: tables,
 * strikethrough and `- [ ]` lists all appear in real answers and all pass through the base
 * CommonMark parser as literal text.
 *
 * NO `rehype-raw`, DELIBERATELY. `react-markdown` ignores embedded HTML by default, and that
 * default is the security boundary here: the string is written by a language model from a post
 * anyone can author, so it is untrusted input twice over. Turning raw HTML on would make a prompt
 * injection into stored XSS. Markdown-only means the worst a hostile post can do is produce ugly
 * formatting.
 *
 * THE ELEMENT MAP EXISTS BECAUSE THE DEFAULTS ARE UNSTYLED. `react-markdown` emits bare `<h2>`,
 * `<ul>`, `<code>` and so on, and this product's reset gives them nothing — an unmapped answer
 * renders as one undifferentiated block. Every entry below is a design-system token, so the answer
 * sits in the same type scale as the post above it rather than importing a prose stylesheet.
 */
export function ExplanationMarkdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 text-nx-body-sm text-nx-text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children: c }) => <p className="leading-relaxed">{c}</p>,

          // The model reaches for `##`/`###` for its own section headings ("Why store in UTC?").
          // Both land on the same size: a nested heading inside a card that is itself a section of
          // a post does not need a second level of hierarchy, it needs to be legible as a break.
          h1: ({ children: c }) => <h4 className="text-nx-subhead text-nx-text-primary">{c}</h4>,
          h2: ({ children: c }) => <h4 className="text-nx-subhead text-nx-text-primary">{c}</h4>,
          h3: ({ children: c }) => <h4 className="text-nx-subhead text-nx-text-primary">{c}</h4>,
          h4: ({ children: c }) => <h4 className="text-nx-subhead text-nx-text-primary">{c}</h4>,

          ul: ({ children: c }) => (
            <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-nx-text-faint">{c}</ul>
          ),
          ol: ({ children: c }) => (
            <ol className="flex list-decimal flex-col gap-1 pl-5 marker:text-nx-text-faint">{c}</ol>
          ),
          li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,

          strong: ({ children: c }) => (
            <strong className="font-semibold text-nx-text-primary">{c}</strong>
          ),
          em: ({ children: c }) => <em className="italic">{c}</em>,

          // Inline code only. A fenced block arrives as `<pre><code>`, and `pre` below owns that
          // case — mapping `code` alone would put an inline chip around a whole block.
          code: ({ children: c }) => (
            <code className="rounded-nx-xs bg-nx-surface-sunken px-1 py-0.5 font-mono text-nx-code">
              {c}
            </code>
          ),
          pre: ({ children: c }) => (
            <pre className="overflow-x-auto rounded-nx-sm border border-nx-border-subtle bg-nx-surface-sunken p-3 font-mono text-nx-code [&_code]:bg-transparent [&_code]:p-0">
              {c}
            </pre>
          ),

          blockquote: ({ children: c }) => (
            <blockquote className="border-l-2 border-nx-border-default pl-3 text-nx-text-secondary">
              {c}
            </blockquote>
          ),

          // `target="_blank"` with `rel="noreferrer"`: these are links the MODEL chose, to sites
          // nobody here vetted, and they must not be able to reach back through `window.opener`.
          a: ({ href, children: c }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-nx-text-link underline hover:text-nx-text-link-hover"
            >
              {c}
            </a>
          ),

          hr: () => <hr className="border-nx-border-subtle" />,

          table: ({ children: c }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-nx-body-sm">{c}</table>
            </div>
          ),
          th: ({ children: c }) => (
            <th className="border border-nx-border-subtle px-2 py-1 text-left font-semibold">
              {c}
            </th>
          ),
          td: ({ children: c }) => (
            <td className="border border-nx-border-subtle px-2 py-1 align-top">{c}</td>
          ),
        }}
      >
        {fixSingleSpaceNesting(children)}
      </ReactMarkdown>
    </div>
  );
}
