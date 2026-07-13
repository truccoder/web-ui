'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n';
import { useKnowledgeLibrary } from '@/lib/hooks/use-knowledge';
import { cn } from '@/lib/utils';
import type { ExplanationResponse } from '@/lib/types';

function ExplanationCard({ explanation }: { explanation: ExplanationResponse }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {explanation.concepts?.map((concept) => (
              <Badge key={concept} variant="secondary">
                {concept}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {explanation.complexityScore != null && (
              <Badge variant="outline">
                {t('knowledge.library.complexity', { score: explanation.complexityScore })}
              </Badge>
            )}
            <Badge variant="outline">
              {t('knowledge.explain.version', { version: explanation.version })}
            </Badge>
          </div>
        </div>

        <p
          className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap break-words',
            !expanded && 'line-clamp-4'
          )}
        >
          {explanation.explanationContent}
        </p>

        {expanded && (
          <>
            {explanation.prerequisites && explanation.prerequisites.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {t('knowledge.library.prerequisites')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.prerequisites.map((p) => (
                    <Badge key={p} variant="outline">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {explanation.externalLinks && explanation.externalLinks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {t('knowledge.library.links')}
                </p>
                <ul className="space-y-1">
                  {explanation.externalLinks.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {explanation.originalContent && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {t('knowledge.library.viewOriginal')}
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {explanation.originalContent}
                </p>
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
          />
          {expanded ? t('knowledge.library.showLess') : t('knowledge.library.showMore')}
        </button>
      </CardContent>
    </Card>
  );
}

export function LibraryTab() {
  const t = useT();
  const { data, isLoading, isError } = useKnowledgeLibrary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t('knowledge.library.error')}
      </p>
    );
  }

  const explanations = data?.explanations ?? [];

  if (explanations.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="font-medium">{t('knowledge.library.empty.title')}</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {t('knowledge.library.empty.desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('knowledge.library.count', { count: data?.totalCount ?? explanations.length })}
      </p>
      {explanations.map((explanation) => (
        <ExplanationCard key={explanation.id} explanation={explanation} />
      ))}
    </div>
  );
}
