'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useIntlLocale, useRelativeTime } from '@/shared/lib/format';
import { ContributionGraph, useGithubStats, isNotLinked } from '@/features/github';
import { useProjects, useSuggestedProjects, type Project } from '@/features/matchmaking';
import { RepProgress, useReputation } from '@/features/reputation';
import { useRoadmapProgress } from '@/features/roadmap';
import { useAuthHref, useMyProfile } from '@/features/security';
import { useTrending } from '@/features/trending';

/**
 * Rows in `OpeningsSection`, either mode. Five since the rail↔ledger rebalance (`globals.css`
 * shell-budget note) — the wider column earns its keep by showing more of what it ranked, and
 * `Phù hợp với bạn` at three rows was a card too short to read as a list. The column scrolls, so
 * this is not bounded by a fold the way it was when the ledger was 300.
 */
const LEDGER_ROWS = 5;

/** Matched skills/domains shown per row before the count takes over. */
const LEDGER_REASONS = 3;

/**
 * The two limits are `/projects`' own, deliberately — see `OpeningsSection`. `matchmakingKeys`
 * puts the limit in the key, so asking for `LEDGER_ROWS` here would fork the cache rather than
 * share it, and this card would pay for a list the board next door already has.
 */
const SUGGESTED_LIMIT = 5;
const BROWSE_LIMIT = 10;

/**
 * The shell's right flank — the ledger.
 *
 * ITS SECTIONS ARE CARDS, AND THAT REVERSES WHAT THIS FILE USED TO SAY. Round 4 made "no card in
 * the ledger" a rule and this comment asserted it; P3 retired the rule (*a card is a unit of work,
 * not a unit of content*) and `handoff/density-r14.md` §5.2 states the ledger section's own
 * qualification in the form that survived the round that deleted its route:
 *
 * > *own name, own state* — *it had a route until r13 deleted that screen, and the card survived,
 * > which is the test: a route is one way to be addressable, never the reason.*
 *
 * The measured kit agrees and it is not ambiguous: two `rgb(255,255,255) · 16px 20px · radius 8`
 * cards, gap 20, inside a flank that paints nothing itself. Ours drew both sections
 * straight onto the ground, which is half of the owner's report that things are left with no
 * background — and it is what made the 4px level track effectively invisible, since a hairline
 * tint on recessed ground has nothing to sit against.
 *
 * THE FLANK ITSELF STILL PAINTS NOTHING. That part of round 4 is untouched: the region is recessed
 * by *being* the ground, and the cards are what rises off it. A fill on the flank would make it a
 * leg of the ∩ again.
 *
 * TWO SECTIONS, and the two that used to be here are gone. `Bằng chứng` answers "what does this
 * account amount to"; the second answers something about the world. Pending requests and friend
 * suggestions LEFT the ledger — they are about other people and about acting, which is what
 * `/friends` is for, and a flank that asks you to do things is no longer a summary.
 *
 * THE SECOND SECTION IS `Đang tuyển` FOR A SIGNED-IN READER AND `Từ bên ngoài` FOR A GUEST, which
 * is the one place the two columns diverge in kind rather than in content. `Từ bên ngoài` used to
 * stand in both, and on the signed-in column it was answering a question nobody asked: it counted
 * crawled items **per source, out of the page this component had already fetched** — 7 + 7 + 6 is
 * 20 because `PAGE_SIZE` is 20, so the numbers described the request, not the world — and it did
 * it beside a feed that already interleaves those very items (`Newsfeed`, scope `all`) and one tab
 * away from `Công nghệ`, which is the same stream with filters on it. A statistics block about the
 * column next to it, with nothing in it to open.
 *
 * `Đang tuyển` replaces it because matchmaking is the one thing in this product that the ledger
 * can surface and no other column does: `/projects` is a rail destination you have to decide to
 * visit, and the roles on it expire. It is the world *asking for something from the reader*, which
 * is the counterweight `Bằng chứng` wants — evidence on one side, demand on the other.
 *
 * AND IT IS RANKED AGAINST THE READER NOW, so the heading reads `Phù hợp với bạn` whenever the
 * backend has something to rank: `GET /projects/suggested` (B26) scores every open project against
 * the reader's own professional profile. That closes the two halves of the column into one
 * sentence — what this account is (`Năng lực`) and what wants exactly that (`Phù hợp với bạn`).
 * `Đang tuyển` stays as the honest name for the unranked fallback. See `OpeningsSection`.
 *
 * A GUEST KEEPS `Từ bên ngoài`, REWRITTEN. `GET /projects` answers 401 anonymously (measured), so
 * the hiring card has nothing to render for them, while the crawled column is public — the section
 * stays, but as one real headline per source instead of three counts. See `ExternalSection`.
 *
 * SECTION OVERLINES ARE `text-muted`, NOT `text-faint`. On recessed ground `text-faint` measured
 * below the contrast floor; muted clears it at 4.8:1. The same round retired tracked uppercase
 * from this column for the same reason.
 *
 * EVERY SECTION RENDERS NOTHING RATHER THAN AN EMPTY SHELL when it has no data. A ledger is read
 * at a glance and out of the corner of the eye; a heading over a blank space asks the reader to
 * work out whether something failed. Nothing is a clearer answer than an empty box.
 */
export function Ledger() {
  const t = useT();
  const { data: profile } = useMyProfile();

  return (
    <aside
      aria-label={t('ledger.label')}
      /**
       * `surface-page`, no fill and no left border — the gutter beside it is the boundary. The
       * right padding IS `--nx-region-gutter`, so the ledger is inset from the window edge by the
       * same measure that separates it from the canvas: the column sits in the middle of two
       * equal gaps rather than being pushed against the glass.
       */
      /**
       * WIDTH AND PADDING STEP AT 1440, VISIBILITY AT 1280. Three different numbers that were all
       * pinned to `xl`. The DS's own table gave the ledger 272 at 1280 and 300 at 1440 and folds
       * it below 1280 — so `xl:w-nx-ledger` was spending 300 in the step that budgets 272, and the
       * 28px came out of the canvas measure next door. The two width tokens now carry 310 / 338
       * after the rail↔ledger rebalance (`globals.css` shell-budget note); the STEP is unchanged,
       * only the values, and the canvas measure is still untouched.
       *
       * `pt-5` is the datum: all three regions start their first block at `56 + 20 = 76`. This
       * was `pt-4` (72, out of line with the others), then briefly `pt-7` — I took "datum 28" from
       * the kit's README, and the kit itself renders 20. Measured, then corrected.
       *
       * SECTION ↔ SECTION IS `block` (20), NOT A LITERAL 22. A census of every computed gap on
       * `/newsfeed` turned up exactly one 22px in the whole page and it was this one — a value on
       * neither the vertical course (8 · 12 · 16 · 20) nor the horizontal one. Two blocks in the
       * ledger are the same relationship as two cards in the canvas, so they take the same rung.
       */
      /**
       * PADDING IS SYMMETRIC — and it is `px-2.5` (10), down from `px-5` (20). Symmetry was the
       * fix in the round before this one: a lone `pr` of one region gutter double-counted the
       * shell's own flex `gap` and left the cards flush against the left edge of their own region
       * while inset 40 from the right.
       *
       * TEN, BECAUSE THE OTHER FLANK'S SCROLLER ALREADY SPENDS TEN. The rail's nav is `px-2.5`,
       * so 10 is what a flank in this shell insets its content by; the kit's `padding: 20px 20px
       * 48px` on the ledger scroller was the only 20 of its kind, and it was buying the widest
       * gutter in the layout twice — 40 of shell gap plus 20 of column padding put 60 between the
       * canvas's card edge and this column's, on a screen whose two flanks are otherwise 24 and
       * 34 from what they sit beside.
       *
       * WHAT IT BUYS IS CARD WIDTH: `px-2.5` (10 a side) leaves the card at the ledger token less
       * 20 — 290 at the 1280 step, 318 at 1440 after the rail↔ledger rebalance (see
       * `globals.css`'s shell-budget note; the token moved, the 1300 budget did not). The section
       * below carries chips of matched skills under each row and had the least room of anything in
       * the shell to carry them in. 48 (`pb-12`) is the runout at the end of every scroller and stays.
       */
      className="sticky top-nx-topbar hidden h-[calc(100dvh-var(--spacing-nx-topbar))] w-[var(--spacing-nx-ledger-sm)] shrink-0 flex-col gap-[var(--nx-space-block)] overflow-y-auto px-2.5 pt-5 pb-12 xl:flex min-[1440px]:w-nx-ledger"
    >
      <EvidenceSection userId={profile?.id} />
      {/* MOUNTED ONLY ONCE THERE IS A PROFILE, which is a request-shaping decision rather than a
          cosmetic one. Both endpoints behind this section are authenticated — `/projects` answers
          401 anonymously (measured) and `/projects/suggested` scores against `SecurityUtils
          .getCurrentUserId()`, so it cannot even be asked without a caller — and this column is in
          the shell, so an ungated section fires on every route, including the window where the
          session has not resolved or has expired. Measured against a stale session that was
          exactly what happened: `/projects` was the ONLY call the page made, and it 401'd on a
          retry loop under a heading that never stopped saying it was loading. The profile is the
          same gate `EvidenceSection` already takes its id from. */}
      {profile && <OpeningsSection />}
    </aside>
  );
}

/**
 * The ledger a signed-out reader gets: the pitch, and the two ways out of being a guest.
 *
 * SAME COLUMN, SAME GEOMETRY, DIFFERENT CONTENT. It reuses `Ledger`'s exact `aside` — width,
 * datum, the 1280/1440 steps — because the canvas next to it is measured against that column and
 * a narrower flank would move the feed. What changes is only what stands in it.
 *
 * IT REPLACES A SUMMARY OF YOU WITH THE REASON TO BE SOMEBODY. `Bằng chứng` reads reputation,
 * contributions and verified skills off an account; with no account those three cards would be
 * three empty boxes, and the file's own rule is that a section with no data renders nothing at
 * all. So the guest column keeps `Từ bên ngoài` — crawled sources are public and just as
 * interesting to a stranger — and puts the invitation where the evidence would have been.
 *
 * IT DOES NOT GET `Đang tuyển`, and that is settled by the backend rather than by taste: measured
 * against the running API, `GET /v1/api/projects` answers **401** to an anonymous caller, unlike
 * `/posts/public` and `/trending`. So the card could not be filled for a guest even if the column
 * wanted it — and it should not want it, since applying needs an account too and the invitation
 * card above already asks for one.
 */
export function GuestLedger() {
  const t = useT();
  const loginHref = useAuthHref('/login');
  const registerHref = useAuthHref('/register');

  return (
    <aside
      aria-label={t('ledger.label')}
      className="sticky top-nx-topbar hidden h-[calc(100dvh-var(--spacing-nx-topbar))] w-[var(--spacing-nx-ledger-sm)] shrink-0 flex-col gap-[var(--nx-space-block)] overflow-y-auto px-2.5 pt-5 pb-12 xl:flex min-[1440px]:w-nx-ledger"
    >
      <Card className="flex flex-col gap-3">
        <SectionHeading>{t('guest.ledger.overline')}</SectionHeading>
        <p className="text-nx-body-sm text-nx-text-secondary">{t('guest.ledger.body')}</p>
        <div className="flex flex-col gap-2">
          <Link href={registerHref}>
            <Button className="w-full">{t('guest.register')}</Button>
          </Link>
          <Link href={loginHref}>
            <Button variant="secondary" className="w-full">
              {t('guest.signIn')}
            </Button>
          </Link>
        </div>
      </Card>

      {/* Public either way — a crawled article has no reader-specific half to withhold. */}
      <ExternalSection />
    </aside>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-nx-overline font-medium text-nx-text-muted">{children}</h2>;
}

/**
 * `Bằng chứng` — the account as evidence: how far through its level it is, the shape of its recent
 * work, and the skills it has had verified.
 */
function EvidenceSection({ userId }: { userId?: number }) {
  const t = useT();
  const localeTag = useIntlLocale();
  const { data: reputation, isPending: repPending } = useReputation(userId);
  const stats = useGithubStats(userId);
  const { data: progress } = useRoadmapProgress(userId ?? Number.NaN, userId != null);

  // Only settled claims belong in a summary. The owner's pending and rejected rows are real and
  // are shown on `/profile`, but "evidence" is what has been accepted — a pending claim in this
  // column would be counting a cheque before it cleared.
  const verified = useMemo(
    () => (progress ?? []).filter((row) => row.status === 'VERIFIED').slice(0, 3),
    [progress]
  );

  const calendar = isNotLinked(stats.error) ? null : (stats.data?.contributionGraph ?? null);

  if (repPending && !reputation) {
    return (
      <Card className="flex flex-col gap-3">
        <SectionHeading>{t('ledger.evidence')}</SectionHeading>
        <Skeleton lines={2} />
      </Card>
    );
  }

  if (!reputation) return null;

  return (
    <Card className="flex flex-col gap-3">
      <SectionHeading>{t('ledger.evidence')}</SectionHeading>

      {/* `nextLevelName` is NOT PASSED, and cannot be: the backend returns `levelName` and
          `nextLevelMin` but no name for the next level, and CLAUDE.md forbids hardcoding the level
          ladder a third time (it already exists in the DS's `REP_LEVELS` and the backend's
          `RepLevel`). So the line reads `Architect · còn 34.098` and stops. Raised as a backend
          request; the day `nextLevelName` arrives, one prop closes it. */}
      <RepProgress reputation={reputation} />

      {calendar && (
        <div className="flex flex-col gap-1">
          {/**
           * THE TOTAL LEADS THE GRAPH, and it was missing until R5-3 — the block opened straight
           * onto the squares with only `18 tuần gần nhất` under them.
           *
           * The squares carry a shape and no magnitude: the same grid reads identically whether
           * the year holds 60 contributions or 600, because every cell is coloured against its
           * own scale. One number restores the size of what the shape is a picture of, and it is
           * `totalContributions` off the calendar itself — GitHub's own count, not a sum
           * recomputed here from the cells the 18-week window happens to show.
           *
           * IT IS THE WHOLE CALENDAR, NOT THE WINDOW, which is why the caption underneath still
           * says 18 weeks: the number names the year, the graph shows the recent part of it.
           */}
          <p className="text-nx-body-sm text-nx-text-primary">
            <span className="font-mono tabular-nums font-medium">
              {calendar.totalContributions.toLocaleString(localeTag)}
            </span>{' '}
            {t('ledger.contributions')}
          </p>
          {/* 18 weeks at an 11px cell: 18×11 + 17×3 = 249, comfortably inside the ledger's drawable
              at both steps (≈290 at 1280, ≈318 at 1440). Fixed count, derived cell — see
              `ContributionGraph`. */}
          <ContributionGraph calendar={calendar} weeks={18} legend={false} cellSize={11} />
          <p className="text-nx-caption text-nx-text-muted">{t('ledger.recentWeeks')}</p>
        </div>
      )}

      {verified.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {verified.map((row) => (
            /**
             * THE TICK IS THE WHOLE POINT OF THE CHIP — added R5-3, and the chips read wrong
             * without it. Amber-tinted pills next to a reputation bar look like skills the account
             * CLAIMS; these are the only ones a verifier accepted, and the section is called
             * `Bằng chứng`. The mark is what separates the two, and it is the reason only
             * `VERIFIED` rows reach this list in the first place.
             *
             * `aria-hidden` on the glyph: the accessible name comes from the list item's text, and
             * "verified" is said once in the section heading rather than three times down a column.
             */
            <li
              key={row.nodeId}
              className="flex items-center gap-1 rounded-nx-full bg-nx-rep-soft px-2 py-0.5 text-nx-caption text-nx-rep-text"
            >
              <Check className="size-2.75 shrink-0" strokeWidth={3} aria-hidden />
              {row.nodeName}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * `Đang tuyển` / `Phù hợp với bạn` — the roles a signed-in reader could take, `LEDGER_ROWS` at most, and
 * ranked against their own professional profile when the backend can rank them.
 *
 * THE PARAGRAPH THIS REPLACES WAS A CEILING THAT NO LONGER EXISTS, and it is quoted because it is
 * the reason this card spent a round labelled as something weaker than it is: "IT IS NOT `HỢP VỚI
 * BẠN`, AND THE NAME SAYS SO. There is no endpoint that ranks projects against a reader's skills:
 * `GET /positions/{id}/suggested-candidates` runs the other direction (position → people)."
 *
 * `GET /v1/api/projects/suggested` RUNS THIS DIRECTION (BE B26). `MatchmakingService.suggestProjects`
 * crosses the caller's own `knownTechStack` against the OPEN roles of every open project and their
 * `interestedDomains` against the project's `tags`, drops everything scoring 0, and sorts by score
 * — and it ships `matchedSkills` / `matchedDomains` with each row so the reason travels with the
 * recommendation instead of being guessed at here. Projects already applied to, and blocked
 * authors, are filtered out before scoring runs. So the heading can say `Phù hợp với bạn` and mean
 * it.
 *
 * TWO MODES, ONE CARD, AND THE HEADING IS WHICH MODE IT IS IN. `[]` from the ranking is ORDINARY,
 * not an error: a reader who has never filled in a professional profile gets it every time, and so
 * does one whose stack overlaps nothing currently open. The backend's own javadoc names the
 * remedy — *"clients fall back to `GET /v1/api/projects`, which is the honest answer"* — so the
 * card falls back to the newest projects still hiring, under the OLD heading. What it must not do
 * is show that unranked list under a heading that claims a fit, which is the failure the endpoint
 * exists to make avoidable.
 *
 * THE FALLBACK IS GATED ON THE RANKING HAVING ANSWERED, which is what `enabled` is for. Firing
 * both at once would spend a request on a list that is thrown away for every reader who has a
 * profile — the case this card is built for — and because the browse key is shared, the gate
 * usually resolves against pages already in hand rather than into a new request.
 *
 * LIMITS ARE CHOSEN TO SHARE KEYS, NOT TO MATCH THE ROWS RENDERED — even though `LEDGER_ROWS` (5)
 * now equals `SUGGESTED_LIMIT`, that is a coincidence and not a coupling. Both `matchmakingKeys`
 * entries put the limit in the key, so `useSuggestedProjects(LEDGER_ROWS)` with a different number
 * would be a second cached copy of a ranking `/projects` already holds at 5, and `useProjects` the
 * same for the browse list it holds at 10. Asking for what that screen asks for costs one request
 * across the session and warms the board this card links into.
 *
 * IT IS THE ONE BLOCK IN THIS COLUMN WITH SOMEWHERE TO GO, and that is deliberate rather than a
 * lapse from the summary rule. `Bằng chứng` is a state of affairs and correctly inert; a role is a
 * thing with a deadline attached, and a summary of it that could not be opened would be the same
 * dead end the section it replaced was. A link is navigation, not the "asking you to do things"
 * this file's header rules out — no accept, no reject, no apply lives here.
 *
 * OPEN ROLES ARE COUNTED, NOT ASSUMED, in both modes, and a project with none is dropped. `status`
 * is per position (`ProjectList` says the same), so an `OPEN` project whose every role is `FILLED`
 * is a closed door — under either heading it would be a lie the reader only finds out about after
 * the click. The ranking already scores against open roles alone, so counting only ever removes
 * rows from the fallback; running it over both keeps the two modes counting the same thing.
 *
 * NOTHING RENDERS WHILE EITHER QUERY IS IN FLIGHT — no skeleton, unlike `EvidenceSection`. A
 * skeleton would have to pick a heading before the data says which of the two it is, and swap it
 * under the reader a moment later. The card above carries the column's loading state.
 */
function OpeningsSection() {
  const t = useT();

  const { data: suggested, isPending: rankingPending } = useSuggestedProjects(SUGGESTED_LIMIT);

  const matches = useMemo(
    () =>
      (suggested ?? [])
        .flatMap((row) => (row.project ? [{ row, project: row.project }] : []))
        .map(({ row, project }) => ({
          project,
          openCount: countOpenRoles(project),
          // The reason, in the order the backend scores it: skills first (they carry the heavier
          // weight there), then domains — never re-sorted here, since the order IS the backend's
          // account of why this row is where it is. Deduplicated only because "Blockchain" can be
          // both a skill on a role and a domain on the project, and one word twice in a row of
          // chips reads as a rendering bug rather than as two matches.
          reasons: [...new Set([...(row.matchedSkills ?? []), ...(row.matchedDomains ?? [])])],
        }))
        .filter((row) => row.openCount > 0)
        .slice(0, LEDGER_ROWS),
    [suggested]
  );

  const ranked = matches.length > 0;
  const { data: browse, isPending: browsePending } = useProjects(
    BROWSE_LIMIT,
    !rankingPending && !ranked
  );

  const newest = useMemo(() => {
    const projects = browse?.pages.flatMap((page) => page.items ?? []) ?? [];

    return projects
      .map((project) => ({ project, openCount: countOpenRoles(project), reasons: [] as string[] }))
      .filter((row) => row.openCount > 0)
      .slice(0, LEDGER_ROWS);
  }, [browse]);

  if (rankingPending) return null;
  if (!ranked && browsePending) return null;

  const rows = ranked ? matches : newest;
  if (rows.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <SectionHeading>{ranked ? t('ledger.matched') : t('ledger.hiring')}</SectionHeading>

      <ul className="flex flex-col gap-2.5">
        {rows.map(({ project, openCount, reasons }) => (
          <li key={project.id} className="flex flex-col gap-0.5">
            {/* THE TITLE WRAPS TO TWO LINES AND THEN STOPS. The drawable takes roughly four to five
                words a line; one long project name allowed to run would push the rows below it
                down the column and past the contribution graph this card shares a fold with. */}
            <Link
              href={`/projects/${project.id}`}
              className="line-clamp-2 text-nx-body-sm text-nx-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
            >
              {project.title}
            </Link>
            {/* The same sentence `/projects` uses, from the same key — the card and the board must
                not disagree about how many roles a project has open. */}
            <span className="text-nx-caption text-nx-text-muted">
              {t('projects.openPositions', { count: openCount })}
            </span>

            {/* WHY THIS ROW IS HERE, IN THE READER'S OWN WORDS — their skills and their stated
                domains, as the backend matched them. A ranking whose order cannot be explained is
                one nobody trusts, and the other annotation available, `matchScore`, is a number
                with no scale printed anywhere: 12 means nothing without knowing a skill outweighs
                a domain. `/projects` has room for both; this column shows the half that reads as
                language.
                `Khớp:` IS A REAL TEXT NODE, not an `aria-label` on the wrapper. Three bare pills
                reading "React · Docker · Fintech" under a project title are ambiguous to everyone
                and not only to a screen reader — they could as easily be the roles being hired
                for. */}
            {reasons.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className="text-nx-caption text-nx-text-muted">{t('ledger.matchedOn')}</span>
                {reasons.slice(0, LEDGER_REASONS).map((reason) => (
                  <Badge key={reason} variant="neutral">
                    {reason}
                  </Badge>
                ))}
                {reasons.length > LEDGER_REASONS && (
                  <span className="text-nx-caption text-nx-text-faint">
                    +{reasons.length - LEDGER_REASONS}
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * How many positions of a project are still open.
 *
 * Shared by both modes of `OpeningsSection` so the two cannot drift: `positions` is on the list
 * read and on the ranked read alike, and `status` is per position rather than per project.
 */
function countOpenRoles(project: Project) {
  return (project.positions ?? []).filter((position) => position.status === 'OPEN').length;
}

/**
 * `Từ bên ngoài` — one headline per crawled source. Guest column only.
 *
 * IT USED TO BE THREE COUNTS AND THEY WERE NOT WHAT THEY LOOKED LIKE: `N bài` was items of that
 * source *within the page this component had already fetched*, so the three numbers summed to
 * `PAGE_SIZE` by construction and moved when the feed beside them paged. The backend has no
 * per-source statistics endpoint, so the honest options were to caption the number as what it was
 * or to stop showing a number. This does the second.
 *
 * ONE ITEM PER SOURCE, RANKED WITHIN THE SOURCE — never the global top three by `score`. Scores
 * are not comparable across crawlers: a GitHub star count runs to six figures where a Hacker News
 * score runs to three, and `TrendingParams.source` carries the backend's own note that sorting
 * them together put GitHub across the entire first page. A global sort here would fill all three
 * rows with GitHub and quietly retire the "three sources" claim this card exists to make.
 *
 * `useTrending({})` WITH NO FILTER, so the key matches the one `Newsfeed` already mounts on the
 * page underneath — the card is free on the screen where a guest sees it. A `timeRange: 'today'`
 * would read better and cost a second request for a window that DEV Community, two days behind in
 * the measured data, regularly fails to fill.
 *
 * THE FIRST PAGE ONLY, AND SHARING THE KEY IS EXACTLY WHY. `Newsfeed` calls `fetchNextPage` on
 * this same query as the reader scrolls, so a `flatMap` over every page would re-rank against a
 * growing pool — headlines in a sticky sidebar silently swapping themselves out while the reader
 * is halfway down the column beside them. Page one is fixed once loaded, and it is a claim that
 * can be stated: the hottest of the twenty most recent crawled items.
 */
function ExternalSection() {
  const t = useT();
  const relativeTime = useRelativeTime();
  const { data } = useTrending({});

  const headlines = useMemo(() => {
    const items = data?.pages[0]?.items ?? [];
    const bySource = new Map<string, (typeof items)[number]>();

    for (const item of items) {
      if (!item.source || !item.title) continue;
      const held = bySource.get(item.source);
      // `score` is nullable on every row, so an unscored item still competes — at zero.
      if (!held || (item.score ?? 0) > (held.score ?? 0)) bySource.set(item.source, item);
    }

    // Freshest source first. The alternative — ordering by score — would be comparing across
    // crawlers again at the level of rows instead of at the level of items.
    return [...bySource.values()].sort((a, b) =>
      (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
    );
  }, [data]);

  if (headlines.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <SectionHeading>{t('ledger.external')}</SectionHeading>

      <ul className="flex flex-col gap-2.5">
        {headlines.map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5">
            <span className="text-nx-caption text-nx-text-muted">
              {t(`trending.sources.${item.source}`)}
              {item.publishedAt && ` · ${relativeTime(item.publishedAt)}`}
            </span>

            {/* Every crawled item is a link off-site — that is the whole interaction model of
                `features/trending`, and `TrendingCard` states the affordance the same way. A row
                whose `url` is null keeps its title as plain text rather than a dead anchor. */}
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                // `noopener` closes `window.opener`; `noreferrer` keeps this app's URLs out of the
                // destination's logs.
                rel="noopener noreferrer"
                className="group flex items-start gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
              >
                <span className="line-clamp-2 text-nx-body-sm text-nx-text-primary group-hover:underline">
                  {item.title}
                </span>
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-nx-text-muted" aria-hidden />
              </a>
            ) : (
              <span className="line-clamp-2 text-nx-body-sm text-nx-text-primary">
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
