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

/**
 * THE AXIS-COLLAPSE RULE — the one DS rule this port was missing, and the reason it matters is
 * that the ladder above cannot catch it. `p-3` is a legal rung (12), so every selector in
 * `spacingSelectors` passes it; what is wrong is that ONE number is being paid on BOTH axes.
 *
 * The upstream config states it directly (`adherence-r10.oxlintrc.json`, R8 §2.1): "`padding:
 * var(--nx-space-pad)` sets the HORIZONTAL rung on both axes, which is the fork the split exists
 * to prevent, and the two courses are 20 vs 16 apart." Since R8 the ladder is read per axis —
 * horizontal padding is paid once, vertical padding is paid again at every block boundary down a
 * feed — so a card's inset is `16px 20px`, which is what `<Card>` already defaults to and what
 * every white rounded surface in the rendered kit measures.
 *
 * SCOPED TO CARD-RADIUS SURFACES, DELIBERATELY, and the scope was tightened once — see the note
 * on `CARD_RADIUS` below for what the kit said and why `sm` is no longer in it. `rounded-nx-full`
 * was never in it either: a pill or an avatar is a footprint, not a container inset.
 *
 * ── NARROWED AT P2, AND THE NARROWING IS THE POINT — `sm` came out ──────────────────────────
 *
 * The rule shipped at P0 matching `sm|md|lg`, on the reasoning that any rounded surface with a
 * square inset was a hand-rolled card. P2 measured the kit before rewriting the twenty sites that
 * matched, and the kit disagrees: a block NESTED INSIDE a feed card renders at
 * `padding: 12px · radius: 6px · surface-sunken · no border` — a **square 12** — and one of the
 * specimens is the book body, which is one of the very sites this rule had flagged.
 *
 * So `p-3` on those is not axis collapse; it is the nested-block inset, correct as written. The
 * radius is what separates the two cases and it separates them cleanly, because the kit uses the
 * scale to mean something: **6 (`sm`) is a block inside a card, 8 (`md`) is a card**. Seventeen
 * of the twenty were `sm`.
 *
 * A rule that flags correct code is not a strict rule, it is a broken one: it trains people to
 * add exemptions, and the exemption list then hides the real defects. Hence `md|lg` only.
 *
 * WHAT THE MEASUREMENT DID FIND, kept out of this rule because it is a different class: those
 * nested blocks carry `border` + no fill where the kit gives them `surface-sunken` + no border.
 * That is a surface-model question, not a spacing one — report §3.1.
 *
 * THERE IS NO BASELINE LIST UNDER THIS RULE ANY MORE, and that is the whole arc of the audit in
 * one line. It shipped at P0 with 20 sites across 17 files, described in its own note as "none of
 * them is a false positive". P2 measured the kit and found seventeen of the twenty were correct
 * as written — the rule was too wide, not the code wrong — so the radius was narrowed and they
 * stopped matching without a single source edit. P3 fixed the four that were real. The list is
 * gone because it is empty, which is the only good reason for an exemption list to disappear.
 */
const CARD_RADIUS = "rounded-nx-(md|lg)";
// 12 · 16 · 20 — the three values a card inset is actually written with. `p-1`/`p-2`/`p-2.5` are
// chips and icon buttons, where a square inset is the correct answer, so they are left alone.
const CARD_PADDING = "p-[345]";

/**
 * THE SECOND SPELLING, and it was found by the audit rather than by design — P1 on archetype A hit
 * `notification-item.tsx`'s row, `px-3 py-3`, which is the same 12/12 square inset as `p-3` and
 * which the selector above walks straight past. A rule that catches one spelling of a mistake and
 * not the other is worse than no rule: it certifies the file it cannot read.
 *
 * The backreference is the whole point — `px-5 py-3` is the CORRECT two-axis inset and must not
 * fire. Only px and py carrying the SAME rung is the collapse. Two selectors because the pair can
 * be written in either order, and Tailwind class strings are not sorted.
 */
const CARD_PADDING_XY = [
  "(^|\\s)px-([345])(\\s.*)?\\spy-\\2(\\s|$)",
  "(^|\\s)py-([345])(\\s.*)?\\spx-\\2(\\s|$)",
];

const AXIS_MESSAGE =
  "Axis-collapsed padding on a rounded surface. Since R8 the ladder is read PER AXIS — pad 20 " +
  "horizontal, pad-y 16 vertical — so one number on all four sides erases the distinction the " +
  "split exists to keep. If this is a card, use <Card> (it already defaults to `16px 20px`, " +
  "measured off the kit). If it is some other surface, say so with both tokens: " +
  "`py-[var(--nx-space-pad-y)] px-[var(--nx-space-pad)]`.";

const axisSelectors = [
  {
    selector: `Literal[value=/(^|\\s)${CARD_RADIUS}(\\s|$)/][value=/(^|\\s)${CARD_PADDING}(\\s|$)/]`,
    message: AXIS_MESSAGE,
  },
  {
    selector: `TemplateElement[value.raw=/(^|\\s)${CARD_RADIUS}(\\s|$)/][value.raw=/(^|\\s)${CARD_PADDING}(\\s|$)/]`,
    message: `${AXIS_MESSAGE} (Inside a template literal — same rule.)`,
  },
  ...CARD_PADDING_XY.flatMap((xy) => [
    {
      selector: `Literal[value=/(^|\\s)${CARD_RADIUS}(\\s|$)/][value=/${xy}/]`,
      message: `${AXIS_MESSAGE} (Written as px-N py-N, which is the same square inset as p-N.)`,
    },
    {
      selector: `TemplateElement[value.raw=/(^|\\s)${CARD_RADIUS}(\\s|$)/][value.raw=/${xy}/]`,
      message: `${AXIS_MESSAGE} (px-N py-N inside a template literal — same rule.)`,
    },
  ]),
];


/**
 * THE SUB-SCALE-AS-MARGIN RULE — R10 §3.2, the third and last DS rule this port was missing.
 *
 * The ladder's bottom two rungs, `hit` 2 and `pair` 4, describe distance INSIDE one component,
 * and R10 is explicit about what follows: *"a component sets that with `gap`, not by nudging a
 * sibling. A margin is a distance between two things read separately, and R5.1 forbids anything
 * below 8 there."* In Tailwind that is `mt-0.5` · `mt-1` · `mt-1.5` and their `mb`/`my` twins.
 *
 * The upstream selector matches inline style objects (`marginTop: 2`), because the kit writes
 * plain CSS. This one matches the class strings, which is the same rule in this repo's dialect.
 *
 * ── TWO EXCLUSIONS, BOTH STRUCTURAL RATHER THAN POLITE ──────────────────────────────────────
 *
 * `absolute` — an absolutely positioned element's `mt-1` is an OFFSET FROM ITS ANCHOR, not a gap
 * between siblings: a dropdown sitting 4px under the field that owns it, a tray 4px above the
 * button it belongs to. R10's rule is about the distance between two things in flow; there is no
 * flow here and no sibling to nudge. Five sites, all popovers.
 *
 * NEGATIVE MARGINS never match, and that is deliberate rather than an oversight of the regex:
 * `-mt-1.5` is an overlap, which is geometry, not a rung. `(^|\s)` before the property name is
 * what excludes them — the character before `mt` is `-`, not a space.
 */
const SUBSCALE_MARGIN_MESSAGE =
  "Sub-scale value used as a MARGIN. The bottom rungs (hit 2 · pair 4) describe distance INSIDE " +
  "one component, and a component sets that with `gap` on its container — not by pushing a " +
  "sibling down. A margin is a distance between two things read SEPARATELY, and nothing below 8 " +
  "belongs there. If a small gap looks necessary, what is usually missing is a separation device " +
  "(a hairline) rather than four pixels. An optical correction on an inline icon is the one " +
  "exception and belongs ON THE ICON — disable this rule on that line and say so.";

const SUBSCALE_MARGIN = "(mt|mb|my)-(0\\.5|1|1\\.5)";

const subscaleSelectors = [
  {
    selector:
      `Literal[value=/(^|\\s)${SUBSCALE_MARGIN}(\\s|$)/]` +
      `:not([value=/(^|\\s)absolute(\\s|$)/])`,
    message: SUBSCALE_MARGIN_MESSAGE,
  },
  {
    selector:
      `TemplateElement[value.raw=/(^|\\s)${SUBSCALE_MARGIN}(\\s|$)/]` +
      `:not([value.raw=/(^|\\s)absolute(\\s|$)/])`,
    message: SUBSCALE_MARGIN_MESSAGE + " (Inside a template literal — same rule.)",
  },
];

/**
 * THE SUB-SCALE BASELINE — 23 sites in 18 files, and unlike the axis one this list is real debt
 * rather than a rule that was too wide.
 *
 * Every entry is the same shape: a bare wrapper holding a heading and the block under it, where
 * the block carries `mt-1` or `mt-0.5` instead of the wrapper carrying a rung. The rung they
 * want is `tight` 8 — two readings inside one component, which is the same ruling R14 §3 made
 * for a conversation row's name and preview.
 *
 * ── WHY THEY ARE NOT FIXED IN THE SAME COMMIT THAT INSTALLS THE RULE ────────────────────────
 *
 * Not caution, and not scope. Converting a parent to `flex flex-col gap-…` moves EVERY distance
 * in that parent, and most of these parents hold three or more children with only one carrying
 * the nudge. `book-rating-summary.tsx` is the clearest specimen:
 *
 *     <div className="shrink-0 text-center">
 *       <div>4.0</div>
 *       <StarRating />
 *       <div className="mt-1">23 đánh giá</div>   ← the only flagged distance
 *     </div>
 *
 * Giving that parent a gap also changes the number ↔ stars distance, which the rule never
 * flagged and which nobody looked at. A mechanical sweep would therefore change more than it
 * fixes, silently, across eighteen files — with visual regression covering six screens.
 *
 * So each one needs its own answer: gap on the parent where the parent has two children, an
 * inner wrapper where it has more. That is a reading pass, and it wants the screenshot set
 * widened first (`docs/ui-audit-plan.md` §6 makes exactly this argument about spacing sweeps
 * without a net).
 *
 * The rule is live everywhere else, so **no new sub-scale margin can be written anywhere in the
 * app**, including in these files on any other line. Delete a line as its file is cleared;
 * delete the block when the list is empty. See `docs/ui-audit-report.md` §9.
 */
const SUBSCALE_LEGACY = [
  // `[id]` would be read as a glob character class, so the segment is a wildcard instead.
  "src/app/**/books/*/page.tsx",
  "src/features/bookstore/components/book-rating-summary.tsx",
  "src/features/bookstore/components/book-review-list.tsx",
  "src/features/chat/components/message-user-button.tsx",
  "src/features/friendships/components/friend-action-button.tsx",
  "src/features/knowledge/components/create-token-dialog.tsx",
  "src/features/knowledge/components/explanation-card.tsx",
  "src/features/knowledge/components/professional-profile-wizard.tsx",
  "src/features/knowledge/components/referenced-notes.tsx",
  "src/features/matchmaking/components/project-detail.tsx",
  "src/features/notifications/components/notification-item.tsx",
  "src/features/notifications/components/notification-preferences.tsx",
  "src/features/posts/components/comment-preview.tsx",
  "src/features/security/components/profile-identity-card.tsx",
  "src/shared/components/developer-identity.tsx",
  "src/shared/components/dialog.tsx",
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
      "no-restricted-syntax": ["warn", ...spacingSelectors, ...axisSelectors, ...subscaleSelectors, hexSelector],
    },
  },
  {
    // The shrinking sub-scale baseline — see `SUBSCALE_LEGACY` above. Only `subscaleSelectors`
    // is dropped, and only until the reading pass reaches the file; every other rule still runs.
    files: SUBSCALE_LEGACY,
    rules: {
      "no-restricted-syntax": ["warn", ...spacingSelectors, ...axisSelectors, hexSelector],
    },
  },
  {
    // Third-party brand marks. Their colours are fixed by their owners and must not be
    // tokenised, so this file keeps the ladder rules and drops the colour rule.
    files: ["src/features/security/components/provider-icons.tsx"],
    rules: {
      "no-restricted-syntax": ["warn", ...spacingSelectors, ...axisSelectors, ...subscaleSelectors],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
