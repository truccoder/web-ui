'use client';

import { Select, Textarea } from '@/shared/components';
import { useT } from '@/lib/i18n';
import type { CodeSnippetDetails } from '../types/post';

/**
 * `CODE_SNIPPET` payload for `POST /v1/api/posts` — `codeSnippetDetails: { language, code }`.
 *
 * NO BACKEND VALIDATION EXISTS FOR THIS TYPE. `PostService.buildAndSavePost` validates only
 * `EVENT` (`validateEventDetails`) and an attached quiz (`validateQuizDetails`); every other
 * kind is copied straight onto the entity by `BeanUtils.copyProperties`. So an empty snippet
 * would be accepted and stored. The "code is required" gate lives in the composer and is a
 * frontend guard against junk posts, not a mirror of a server rule — do not describe it as one.
 *
 * `language` is a free-form `String` on the backend (no enum), so the option list here is a
 * frontend convenience only: slug values a syntax highlighter would recognise, so the reader
 * side of cycle 2 has something predictable to switch on. Nothing breaks if the backend later
 * receives a value that is not in this list.
 */
export interface CodeSnippetFieldsProps {
  value: CodeSnippetDetails;
  onChange: (value: CodeSnippetDetails) => void;
}

/** Slug values, not display names — highlighters key off these. `plaintext` is the default. */
const LANGUAGES = [
  'plaintext',
  'typescript',
  'javascript',
  'python',
  'java',
  'kotlin',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'swift',
  'sql',
  'html',
  'css',
  'shell',
  'json',
  'yaml',
] as const;

export function CodeSnippetFields({ value, onChange }: CodeSnippetFieldsProps) {
  const t = useT();

  return (
    <div className="flex flex-col gap-3">
      <Select
        size="sm"
        className="w-auto"
        label={t('createPost.code.language')}
        value={value.language ?? 'plaintext'}
        onChange={(event) => onChange({ ...value, language: event.target.value })}
        options={LANGUAGES.map((language) => ({
          value: language,
          label: t(`createPost.code.languages.${language}`),
        }))}
      />

      <Textarea
        mono
        rows={8}
        spellCheck={false}
        label={t('createPost.code.code')}
        value={value.code ?? ''}
        onChange={(event) => onChange({ ...value, code: event.target.value })}
        placeholder={t('createPost.code.codePlaceholder')}
      />
    </div>
  );
}
