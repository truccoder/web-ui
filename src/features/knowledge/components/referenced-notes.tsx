'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { ReferencedVaultNote } from '../types/knowledge';

/**
 * "Dựa trên N ghi chú trong Vault của bạn" — the answer to "did the AI actually read my notes?"
 *
 * WAITS ON A BACKEND FIELD THAT DOES NOT EXIST YET. `Explanation.referencedNotes` is hand-written
 * (see the type's own comment) and every real response reads it as `null` until
 * `ExplanationResponseDto` grows the field. `ExplanationCard` already guards the render with
 * `referencedNotes.length > 0`, so this component only ever mounts once there is something real to
 * show — nothing here needs to handle the empty case itself.
 *
 * A LOCAL TOGGLE, NOT THE SHARED `Disclosure`. `Disclosure` opens with an `<h2>`, which is right for
 * a page section but wrong here: this sits among `<h4>` blocks (concepts, prerequisites, further
 * reading) inside a card that is itself one item in a list, and a stray `<h2>` at that depth would
 * be a heading level jump a screen reader has no way to make sense of. Collapsed by default for the
 * same reason as the others in this card: it is corroborating detail, not the content the reader is
 * here for.
 */
export interface ReferencedNotesProps {
  notes: ReferencedVaultNote[];
}

export function ReferencedNotes({ notes }: ReferencedNotesProps) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  return (
    <div>
      <h4 className="text-nx-caption text-nx-text-muted">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          {t('knowledge.explain.referencedNotes.title', { count: notes.length })}
          <ChevronDown
            className={cn('size-3 shrink-0 transition-transform', open && 'hidden')}
            aria-hidden
          />
          <ChevronUp className={cn('size-3 shrink-0', !open && 'hidden')} aria-hidden />
        </button>
      </h4>

      {open && (
        <div id={panelId} className="mt-1 space-y-1">
          <p className="text-nx-caption text-nx-text-muted">
            {t('knowledge.explain.referencedNotes.desc')}
          </p>
          <ul className="space-y-1">
            {notes.map((note, index) => (
              <li key={`${note.filename ?? ''}-${index}`} className="text-nx-caption">
                <span className="font-mono text-nx-text-primary">{note.filename}</span>
                {note.concept && (
                  <span className="ml-1 text-nx-text-muted">
                    — {t('knowledge.explain.referencedNotes.concept', { concept: note.concept })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
