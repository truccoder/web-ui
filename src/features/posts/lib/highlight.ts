/**
 * Syntax highlighting for `CODE_SNIPPET` bodies.
 *
 * WHY THIS FILE IS LOADED ON DEMAND AND NOT IMPORTED AT THE TOP OF THE BODY COMPONENT.
 * `highlight.js` core plus forty-one grammars is a few hundred kilobytes, and `PostCard`
 * is on the feed, the search results, a profile and every permalink — every one of those routes
 * would carry the whole highlighter whether or not a single code post appeared on it. Code
 * snippets are one of nine post types. So the caller `import()`s this module only once it is
 * actually holding a snippet, and renders plain mono until it resolves.
 *
 * THE GRAMMARS ARE REGISTERED BY NAME RATHER THAN TAKEN FROM `highlight.js/lib/common`. `common`
 * bundles ~35 languages chosen for the web at large; this product offers 41 and they are not the
 * same 35 — `common` is missing `kotlin`, `swift`, `elixir`, `dockerfile` and more that a
 * developer network posts constantly. Registering exactly the offered set is complete by
 * construction, and the whole module is behind an `import()` anyway.
 *
 * TWO SLUGS DO NOT MATCH THEIR GRAMMAR'S NAME, and that is the whole reason `GRAMMARS` is a map
 * rather than a list: `highlight.js` parses HTML with the `xml` grammar and shell with `bash`.
 * Keying the map on OUR slug keeps that translation in one place instead of at the call site —
 * and it is why `xml` is imported once and used twice, for `html` and for `xml` itself.
 */

import hljs from 'highlight.js/lib/core';

import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import dart from 'highlight.js/lib/languages/dart';
import scala from 'highlight.js/lib/languages/scala';
import groovy from 'highlight.js/lib/languages/groovy';
import objectivec from 'highlight.js/lib/languages/objectivec';
import lua from 'highlight.js/lib/languages/lua';
import perl from 'highlight.js/lib/languages/perl';
import r from 'highlight.js/lib/languages/r';
import haskell from 'highlight.js/lib/languages/haskell';
import elixir from 'highlight.js/lib/languages/elixir';
import erlang from 'highlight.js/lib/languages/erlang';
import clojure from 'highlight.js/lib/languages/clojure';
import powershell from 'highlight.js/lib/languages/powershell';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import makefile from 'highlight.js/lib/languages/makefile';
import nginx from 'highlight.js/lib/languages/nginx';
import graphql from 'highlight.js/lib/languages/graphql';
import markdown from 'highlight.js/lib/languages/markdown';
import ini from 'highlight.js/lib/languages/ini';
import scss from 'highlight.js/lib/languages/scss';
import less from 'highlight.js/lib/languages/less';
import diff from 'highlight.js/lib/languages/diff';

/** Our slug → the `highlight.js` grammar that parses it. `plaintext` is absent on purpose. */
const GRAMMARS: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  typescript,
  javascript,
  python,
  java,
  kotlin,
  go,
  rust,
  c,
  cpp,
  csharp,
  php,
  ruby,
  swift,
  sql,
  html: xml,
  css,
  shell: bash,
  json,
  yaml,
  dart,
  scala,
  groovy,
  objectivec,
  lua,
  perl,
  r,
  haskell,
  elixir,
  erlang,
  clojure,
  powershell,
  dockerfile,
  makefile,
  nginx,
  graphql,
  markdown,
  xml,
  ini,
  scss,
  less,
  diff,
};

let registered = false;

function ensureRegistered() {
  if (registered) return;
  for (const [name, grammar] of Object.entries(GRAMMARS)) hljs.registerLanguage(name, grammar);
  registered = true;
}

/**
 * Returns HTML with `hljs-*` spans, or `null` when the snippet should be rendered as plain text.
 *
 * NULL IS A REAL ANSWER, NOT A FAILURE. It is returned for `plaintext`, for an empty snippet, and
 * for any language the backend accepted that we have no grammar for — `language` is free text, so
 * that last case is normal rather than exceptional. The caller keeps its plain `<code>` in all
 * three, which is why this never throws and never guesses.
 *
 * NO `highlightAuto`. Language detection on a ten-line fragment is a coin flip, and a wrong guess
 * does not degrade to plain — it colours the code as if it were another language, which is worse
 * than no colour because it looks authoritative.
 *
 * THE OUTPUT IS SAFE TO INJECT. `hljs.highlight` HTML-escapes its input before wrapping tokens,
 * so the only markup in the result is the spans it added. That is the whole reason the caller may
 * use `dangerouslySetInnerHTML` here and nowhere else near user content.
 */
export function highlightCode(code: string, language?: string | null): string | null {
  const slug = language?.trim().toLowerCase();
  if (!code.trim() || !slug || slug === 'plaintext') return null;
  if (!(slug in GRAMMARS)) return null;

  ensureRegistered();

  try {
    return hljs.highlight(code, { language: slug, ignoreIllegals: true }).value;
  } catch {
    // A grammar can still throw on pathological input. Plain text is always a correct fallback.
    return null;
  }
}
