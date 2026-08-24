/**
 * The language slugs a `CODE_SNIPPET` post can carry, in one place.
 *
 * IT USED TO LIVE IN THE COMPOSER, where the list was described as "a frontend convenience only"
 * because nothing read it back. The reader side reads it now — `highlightCode` keys its grammar
 * registry off exactly these — so the two would silently drift the moment either changed alone: a
 * slug added to the picker and not to the registry produces a post that is stored fine and never
 * coloured, with no error anywhere.
 *
 * THE LIST GREW TO 42 AT THE OWNER'S REQUEST. Everything added has a grammar shipped with
 * `highlight.js` — a slug with no grammar would show in the picker, store fine and never colour,
 * which is the exact drift the paragraph below exists to prevent.
 *
 * `language` IS STILL FREE TEXT ON THE BACKEND (`CodeSnippetDetails.language` is a plain String
 * with no enum), so this list is not a contract and nothing may assume a stored post's language
 * is in it. It is the set we offer and the set we can colour; anything else renders plain.
 */
export const CODE_LANGUAGES = [
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
  'dart',
  'scala',
  'groovy',
  'objectivec',
  'lua',
  'perl',
  'r',
  'haskell',
  'elixir',
  'erlang',
  'clojure',
  'powershell',
  'dockerfile',
  'makefile',
  'nginx',
  'graphql',
  'markdown',
  'xml',
  'ini',
  'scss',
  'less',
  'diff',
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];
