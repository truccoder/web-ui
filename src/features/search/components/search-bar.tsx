'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { MIN_QUERY_LENGTH } from '../hooks';

/**
 * The app shell's search field.
 *
 * SUBMIT-ON-ENTER, NOT SEARCH-AS-YOU-TYPE. Every keystroke would be a database query — the
 * backend runs `unaccent(...) LIKE` over three tables with no index behind it — and the result
 * would still need somewhere to be shown. This stays the behaviour it replaces (Guardrail C).
 *
 * THE COMMAND PALETTE SHIPPED AT P3.4 AND DID NOT CHANGE THAT. It filters a static list of routes
 * with no request at all, and its one non-navigation action submits into `/search` exactly as this
 * field does. So the app still issues one search per deliberate submit, not one per keystroke.
 *
 * That is also why the debounce helpers the legacy module carried are gone rather than migrated:
 * `useDebouncedValue` and `useDebouncedSearch` had **zero** callers, and dead code is deleted
 * outright rather than moved (CLAUDE.md Constraint #2). Search-as-you-type will need debouncing
 * on the day it exists, written against that caller.
 */
export interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    // Same floor the query hook enforces, so the bar never navigates to a page that will refuse
    // to search. Silent by design: a validation message under the shell's search field would be
    // shouting about a term the user is still in the middle of typing.
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // `isComposing` guards the IME the same way `MessageComposer` does: typing Vietnamese with
      // telex/VNI sends an Enter to accept a candidate, and without this that Enter would search
      // for a half-finished word.
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const clear = () => {
    setValue('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
        size="lg"
        prefix={<Search className="size-4" />}
        /**
         * The clear button is NOT passed as `suffix`.
         *
         * `Input` renders its adornments inside an `aria-hidden` span — right for the decorative
         * icons the DS models there, wrong for a control, which would become invisible to screen
         * readers while still taking a tab stop. So it is positioned over the field instead, and
         * `pr-9` reserves the space so the text never runs underneath it.
         */
        className={cn(value && 'pr-9')}
      />

      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label={t('search.clear')}
          className={cn(
            'absolute top-1/2 right-2.5 grid size-5 -translate-y-1/2 place-items-center',
            'rounded-nx-xs text-nx-text-muted hover:text-nx-text-primary',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring'
          )}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
