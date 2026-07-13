'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { useExplainPost, useSaveExplanation } from '@/lib/hooks/use-knowledge';
import type { ExplanationResponse } from '@/lib/types';

interface ExplainDialogProps {
  postId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExplainDialog({ postId, open, onOpenChange }: ExplainDialogProps) {
  const t = useT();
  const {
    mutate: explainPost,
    data: explanation,
    isPending: isExplaining,
    isError,
    reset,
  } = useExplainPost();
  const { mutate: saveExplanation, isPending: isSaving } = useSaveExplanation();

  const [feedbackNote, setFeedbackNote] = useState('');
  const [saved, setSaved] = useState(false);

  // The dialog is opened by the parent setting `open` directly (onOpenChange only fires for
  // user-driven changes like Escape/backdrop), so kick off the first explanation here.
  // isError guards against auto-retrying a failed call; reset() on close re-arms it.
  useEffect(() => {
    if (open && !explanation && !isExplaining && !isError) {
      explainPost({ postId });
    }
  }, [open, explanation, isExplaining, isError, explainPost, postId]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      reset();
      setFeedbackNote('');
      setSaved(false);
    }
  };

  const handleRegenerate = () => {
    setSaved(false);
    explainPost({ postId, feedbackNote: feedbackNote.trim() || undefined });
    setFeedbackNote('');
  };

  const handleSave = (exp: ExplanationResponse) => {
    saveExplanation(
      {
        postId: exp.postId,
        originalContent: exp.originalContent,
        explanationContent: exp.explanationContent,
        concepts: exp.concepts ?? undefined,
        prerequisites: exp.prerequisites ?? undefined,
        complexityScore: exp.complexityScore ?? undefined,
      },
      { onSuccess: () => setSaved(true) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('knowledge.explain.dialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {isExplaining && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('knowledge.explain.loading')}</p>
            </div>
          )}

          {isError && !isExplaining && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t('knowledge.explain.error')}
            </p>
          )}

          {explanation && !isExplaining && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {explanation.concepts?.map((concept) => (
                  <Badge key={concept} variant="secondary">
                    {concept}
                  </Badge>
                ))}
                {explanation.complexityScore != null && (
                  <Badge variant="outline">
                    {t('knowledge.library.complexity', { score: explanation.complexityScore })}
                  </Badge>
                )}
                <Badge variant="outline">
                  {t('knowledge.explain.version', { version: explanation.version })}
                </Badge>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {explanation.explanationContent}
              </p>

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
            </>
          )}
        </div>

        {explanation && !isExplaining && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder={t('knowledge.explain.feedbackPlaceholder')}
                className="h-8 text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
                {t('knowledge.explain.regenerate')}
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={isSaving || saved}
              onClick={() => handleSave(explanation)}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saved
                ? t('knowledge.explain.savedButton')
                : isSaving
                  ? t('knowledge.explain.saving')
                  : t('knowledge.explain.save')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
