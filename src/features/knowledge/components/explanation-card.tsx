'use client';

import * as React from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { Badge, Card } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { Explanation } from '../types/knowledge';

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
}

export function ExplanationCard({ explanation, actions }: ExplanationCardProps) {
  const t = useT();
  const concepts = explanation.concepts ?? [];
  const prerequisites = explanation.prerequisites ?? [];
  const links = explanation.externalLinks ?? [];

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
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
        </div>

        <p className="whitespace-pre-wrap break-words text-nx-body-sm text-nx-text-primary">
          {explanation.explanationContent}
        </p>

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
            <h4 className="text-nx-caption text-nx-text-muted">{t('knowledge.explain.links')}</h4>
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
                    <span className="ml-1 text-nx-caption text-nx-text-muted">— {link.reason}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {actions && <div className="flex items-center justify-end gap-2 pt-1">{actions}</div>}
      </div>
    </Card>
  );
}
