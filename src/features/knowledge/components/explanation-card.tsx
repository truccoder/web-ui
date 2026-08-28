'use client';

import * as React from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import { Badge, Card, IconButton } from '@/shared/components';
import Link from 'next/link';
import { useT } from '@/core/i18n';
import type { Explanation } from '../types/knowledge';
import { ExplanationMarkdown } from './explanation-markdown';

/**
 * One AI explanation, whether freshly generated or read back from the library.
 *
 * THE TWO SOURCES DO NOT CARRY THE SAME FIELDS, and the difference is not cosmetic:
 *
 *  - A freshly generated one has `externalLinks` but no `id`, `version` or `createdAt` — the
 *    builder in `explainPost` simply does not set them, because nothing has been persisted yet.
 *  - One read from the library has `id`, `version` and `createdAt` but **never** `externalLinks`,
 *    because `ExplanationEntity` has no column for them and `toResponseDto` cannot return what was
 *    never stored.
 *
 * So the links genuinely vanish on save. That is a backend gap, not something this component can
 * paper over — recorded as a request. Rendering each block only when present is therefore the
 * correct behaviour for both sources rather than defensive guarding.
 */
export interface ExplanationCardProps {
  explanation: Explanation;
  /** Slot for save / retry controls when the explanation is fresh. */
  actions?: React.ReactNode;
  /**
   * Show a link back to the post this explains.
   *
   * OFF BY DEFAULT because the fresh case renders inline UNDER the very post it explains,
   * where a link to the current page is noise. The library is the case that needs it: without
   * it the vault is a column of explanations with nothing to say what any of them is about,
   * and the one thing a knowledge vault must do is get you back to the source.
   *
   * `postId` has been on `ExplanationResponseDto` all along; nothing was reading it.
   */
  showSource?: boolean;
  /**
   * Adds a collapse toggle to the header.
   *
   * ON FOR A FRESHLY GENERATED EXPLANATION, OFF IN THE LIBRARY. The generated one appears under
   * the post it explains, in a column the reader is scrolling — twenty paragraphs dropped into
   * the middle of that is worth being able to fold away while keeping the answer. The library IS
   * a list of explanations; folding every card there would leave a page of headers.
   *
   * @default false
   */
  collapsible?: boolean;
  /**
   * Adds an `X`. Called when the reader dismisses the card entirely.
   *
   * SEPARATE FROM COLLAPSING, and the difference is what the two buttons mean: the chevron says
   * "not now, keep it", the `X` says "I am done with this". The caller decides what dismissing
   * costs — for a generated explanation it throws the result away and puts the generate button
   * back, which is honest, because the backend persisted nothing.
   */
  onDismiss?: () => void;
}

export function ExplanationCard({
  explanation,
  actions,
  showSource = false,
  collapsible = false,
  onDismiss,
}: ExplanationCardProps) {
  const t = useT();
  // Opens expanded: the reader just asked for this, so hiding it behind a second click would
  // undo the request. The toggle is for afterwards.
  const [open, setOpen] = React.useState(true);
  const collapsed = collapsible && !open;
  const concepts = explanation.concepts ?? [];
  const prerequisites = explanation.prerequisites ?? [];
  const links = explanation.externalLinks ?? [];

  return (
    /**
     * THE CARD IS MARKED AS MACHINE-WRITTEN, AND THAT IS THE POINT OF THE TREATMENT.
     *
     * It used to be a plain `Card` — the same surface a person's post uses — sitting directly
     * under a person's post. Two blocks of prose in identical frames, one written by the author
     * and one generated, with nothing between them saying which was which. On a product whose
     * whole claim is that ability is *proven*, letting a model's output wear the same clothes as
     * a human's is the wrong default.
     *
     * WHAT CARRIES IT: a tinted fill and edge (`surface-selected` / `accent`, the system's own
     * "this is a different kind of thing" pair), and a labelled header row with the same
     * `Sparkles` glyph the button that generates it uses. The label is words, not just colour —
     * §12 forbids colour carrying meaning alone, and "AI" is exactly the kind of meaning someone
     * must not miss because they cannot see a tint.
     *
     * NOT A DECORATIVE GRADIENT OR A GLOW. §1.5 rules those out, and the point here is
     * attribution rather than delight.
     */
    <Card className="border-nx-accent bg-nx-surface-selected">
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-nx-border-subtle pb-2">
          <Sparkles className="size-4 shrink-0 text-nx-text-accent" aria-hidden />
          <span className="text-nx-body-sm font-semibold text-nx-text-accent">
            {t('knowledge.explain.byAi')}
          </span>
          <span className="ml-auto truncate text-nx-caption text-nx-text-muted">
            {t('knowledge.explain.byAiNote')}
          </span>

          {collapsible && (
            <IconButton
              size="sm"
              label={collapsed ? t('knowledge.explain.expand') : t('knowledge.explain.collapse')}
              aria-expanded={!collapsed}
              onClick={() => setOpen((value) => !value)}
            >
              {collapsed ? <ChevronDown /> : <ChevronUp />}
            </IconButton>
          )}

          {onDismiss && (
            <IconButton size="sm" label={t('knowledge.explain.dismiss')} onClick={onDismiss}>
              <X />
            </IconButton>
          )}
        </div>

        {/* THE HEADER ALWAYS STAYS. A collapsed card keeps its label, its controls and its place
            in the column, so the reader can see the explanation still exists and get it back. */}
        {!collapsed && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {/* FIRST IN THE ROW, because it answers "what is this about" while complexity and
                  version answer "how hard" and "which one" — and it is the only one of the three
                  that a reader arriving in the Archive can act on, since it is what the filter
                  above the list sorts by. Shown on both sources: the model picks it while it
                  writes, so a freshly generated card carries it too. */}
              {explanation.category != null && (
                <Badge>{t(`learningCategory.${explanation.category}`)}</Badge>
              )}
              {explanation.complexityScore != null && (
                <Badge>
                  {t('knowledge.explain.complexity', { score: explanation.complexityScore })}
                </Badge>
              )}
              {/* Only saved explanations have a version, and saving the same post again creates a NEW
              version rather than replacing the old one (`findMaxVersion + 1`), so the number is
              genuinely informative rather than always 1. */}
              {explanation.version != null && (
                <span className="text-nx-caption text-nx-text-muted">
                  {t('knowledge.explain.version', { version: explanation.version })}
                </span>
              )}

              {showSource && explanation.postId != null && (
                <Link
                  href={`/posts/${explanation.postId}`}
                  className="ml-auto text-nx-caption text-nx-text-link hover:underline"
                >
                  {t('knowledge.explain.viewSource')}
                </Link>
              )}
            </div>

            {explanation.explanationContent && (
              <ExplanationMarkdown>{explanation.explanationContent}</ExplanationMarkdown>
            )}

            {concepts.length > 0 && (
              <div>
                <h4 className="text-nx-caption text-nx-text-muted">
                  {t('knowledge.explain.concepts')}
                </h4>
                <div className="mt-1 flex flex-wrap gap-1">
                  {concepts.map((concept) => (
                    <Badge key={concept}>{concept}</Badge>
                  ))}
                </div>
              </div>
            )}

            {prerequisites.length > 0 && (
              <div>
                <h4 className="text-nx-caption text-nx-text-muted">
                  {t('knowledge.explain.prerequisites')}
                </h4>
                <ul className="mt-1 list-inside list-disc text-nx-caption text-nx-text-secondary">
                  {prerequisites.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {links.length > 0 && (
              <div>
                <h4 className="text-nx-caption text-nx-text-muted">
                  {t('knowledge.explain.links')}
                </h4>
                <ul className="mt-1 space-y-1">
                  {links.map((link) => (
                    <li key={link.url ?? link.title}>
                      <a
                        href={link.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-nx-caption text-nx-text-link hover:underline"
                      >
                        <ExternalLinkIcon className="h-3 w-3" />
                        {link.title ?? link.url}
                      </a>
                      {link.reason && (
                        <span className="ml-1 text-nx-caption text-nx-text-muted">
                          — {link.reason}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {actions && <div className="flex items-center justify-end gap-2 pt-1">{actions}</div>}
          </>
        )}
      </div>
    </Card>
  );
}
