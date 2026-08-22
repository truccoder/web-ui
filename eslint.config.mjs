import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Design-system adherence, ported from the Elite Nexus Design System's own
 * `_adherence.oxlintrc.json`. Round 15's `handoff/routing-r15.md` §3.4 closed that item with
 * "it is adopted as step 0 of the audit on the receiving side" — the config ships with the
 * design system, the CI step belongs here. This is that step.
 *
 * The upstream config is oxlint; these are the same rules expressed for eslint, which is what
 * this repo already runs on every commit through lint-staged.
 *
 * NOTE ON SHAPE: every selector lives in ONE `no-restricted-syntax` entry per file group.
 * Flat config REPLACES a rule's options when a later block names the same rule, so splitting
 * "spacing" and "colour" into two blocks over the same files silently drops the first one.
 */

// The proximity ladder is 2 · 4 · 8 · 12 · 16 · 20 · 40, plus exactly two named non-rungs:
// 10 (the inset split) and 48 (the runout). Tailwind's numeric scale is n × 4px, so the only
// legal suffixes are 0, 0.5, 1, 2, 2.5, 3, 4, 5, 10 and 12. Everything else is off-ladder —
// including 6 and 7, which round 5.1 removed from both kits by name.
const SPACING_PROPS =
  "gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|space-x|space-y|m|mt|mb|ml|mr|mx|my";
const OFF_LADDER = "1\\.5|3\\.5|6|7|8|9|11|13|14|16|20|24|28|32|36";

const LADDER_MESSAGE =
  "Off-ladder spacing. The ladder is 2·4·8·12·16·20·40 (plus 10 for the inset split and 48 " +
  "for the runout) — pick the rung that names the RELATIONSHIP (tight 8, element 12, pad " +
  "20/16, block 20, region 40), not the nearest number. If the value is a control's footprint " +
  "rather than a relationship, say so in a comment and disable this rule on the line.";

const spacingSelectors = [
  {
    selector: `Literal[value=/(^|\\s)(${SPACING_PROPS})-(${OFF_LADDER})(\\s|$)/]`,
    message: LADDER_MESSAGE,
  },
  {
    selector: `TemplateElement[value.raw=/(^|\\s)(${SPACING_PROPS})-(${OFF_LADDER})(\\s|$)/]`,
    message: "Off-ladder spacing inside a template literal — same ladder, same rungs.",
  },
];

const hexSelector = {
  selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
  message:
    "Raw hex colour — use a design-system token (--nx-*). Amber is reputation only; the " +
    "accent is Elite Blue and there is no second accent.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["warn", ...spacingSelectors, hexSelector],
    },
  },
  {
    // Third-party brand marks. Their colours are fixed by their owners and must not be
    // tokenised, so this file keeps the ladder rules and drops the colour rule.
    files: ["src/features/security/components/provider-icons.tsx"],
    rules: {
      "no-restricted-syntax": ["warn", ...spacingSelectors],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "server.js",
  ]),
]);

export default eslintConfig;
