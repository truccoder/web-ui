'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button, Card, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useIntlLocale, useRelativeTime } from '@/shared/lib/format';
import { ContributionGraph, useGithubStats, isNotLinked } from '@/features/github';
import { RepProgress, useReputation } from '@/features/reputation';
import { useRoadmapProgress } from '@/features/roadmap';
import { useAuthHref, useMyProfile } from '@/features/security';
import { useTrending } from '@/features/trending';

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
 * The measured kit agrees and it is not ambiguous: two `252 · rgb(255,255,255) · 16px 20px ·
 * radius 8` cards, gap 20, inside a 300 flank that paints nothing itself. Ours drew both sections
 * straight onto the ground, which is half of the owner's report that things are left with no
 * background — and it is what made the 4px level track effectively invisible, since a hairline
 * tint on recessed ground has nothing to sit against.
 *
 * THE FLANK ITSELF STILL PAINTS NOTHING. That part of round 4 is untouched: the region is recessed
 * by *being* the ground, and the cards are what rises off it. A fill on the flank would make it a
 * leg of the ∩ again.
 *
 * TWO SECTIONS, and the two that used to be here are gone. `Bằng chứng` answers "what does this
 * account amount to"; `Từ bên ngoài` answers "what is the world producing". Pending requests and
 * friend suggestions LEFT the ledger — they are about other people and about acting, which is what
 * `/friends` is for, and a flank that asks you to do things is no longer a summary.
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
       * pinned to `xl`. The DS's own table gives the ledger 272 at 1280, 300 at 1440, and folds it
       * below 1280 — so `xl:w-nx-ledger` was spending 300 in the step that budgets 272, and the
       * 28px came out of the canvas measure next door.
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
       * PADDING IS SYMMETRIC NOW — `px-5`, not a lone `pr` of one region gutter. The gutter
       * between the canvas and this flank is the shell's own flex `gap`; spending a second gutter
       * inside the column was double-counting it, and it left the cards flush against the left
       * edge of their own region while inset 40 from the right.
       *
       * The kit measures `padding: 20px 20px 48px` on the flank's scroller, which puts a 252 card
       * inside a 300 column at both steps. 48 is the runout at the end of every scroller.
       */
      className="sticky top-nx-topbar hidden h-[calc(100dvh-var(--spacing-nx-topbar))] w-[var(--spacing-nx-ledger-sm)] shrink-0 flex-col gap-[var(--nx-space-block)] overflow-y-auto px-5 pt-5 pb-12 xl:flex min-[1440px]:w-nx-ledger"
    >
      <EvidenceSection userId={profile?.id} />
      <ExternalSection />
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
 */
export function GuestLedger() {
  const t = useT();
  const loginHref = useAuthHref('/login');
  const registerHref = useAuthHref('/register');

  return (
    <aside
      aria-label={t('ledger.label')}
      className="sticky top-nx-topbar hidden h-[calc(100dvh-var(--spacing-nx-topbar))] w-[var(--spacing-nx-ledger-sm)] shrink-0 flex-col gap-[var(--nx-space-block)] overflow-y-auto px-5 pt-5 pb-12 xl:flex min-[1440px]:w-nx-ledger"
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
          {/* 18 weeks at an 11px cell: 18×11 + 17×3 = 249 inside the 300px ledger's 260 drawable,
              and 10px at the 272 step. Fixed count, derived cell — see `ContributionGraph`. */}
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
 * `Từ bên ngoài` — the crawled sources, as a pulse rather than as headlines.
 *
 * THE NAME IS THE PLAIN ONE, ON PURPOSE. It was renamed to `Nhịp nguồn` for a real reason — *nhịp*
 * is tempo, and a count plus a latest timestamp describe tempo, so the name promised no headlines
 * — and the project owner, having seen it in place, preferred the plain word back. The mismatch
 * between a plain name and statistical contents is a known cost, taken with the tradeoff in view.
 *
 * TWO LINES PER ROW, NOT THREE CELLS. The earlier layout gave the name a fixed 102px cell, which
 * survives at the 1400 step and leaves 74px at 1280 — where the source name was being clipped
 * mid-word. The name now takes the full width and wraps; the numbers sit under it.
 *
 * WHAT THE COUNT HONESTLY IS: items in the page this component already fetched, not a daily rate.
 * The backend exposes no per-source statistics endpoint, so a `42/ngày` here would be a number
 * invented at the point of display. It says `N bài` instead, which is what was actually counted.
 */
function ExternalSection() {
  const t = useT();
  const relativeTime = useRelativeTime();
  const { data } = useTrending({});

  const sources = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items ?? []) ?? [];
    const bySource = new Map<string, { count: number; latest?: string }>();

    for (const item of items) {
      if (!item.source) continue;
      const row = bySource.get(item.source) ?? { count: 0, latest: undefined };
      row.count += 1;
      // Latest wins: the pulse is "when did this source last say something".
      if (item.publishedAt && (!row.latest || item.publishedAt > row.latest)) {
        row.latest = item.publishedAt;
      }
      bySource.set(item.source, row);
    }

    return [...bySource.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [data]);

  if (sources.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <SectionHeading>{t('ledger.external')}</SectionHeading>

      <ul className="flex flex-col gap-2.5">
        {sources.map(([source, row]) => (
          <li key={source} className="flex flex-col gap-0.5">
            <span className="text-nx-body-sm text-nx-text-primary">
              {t(`trending.sources.${source}`)}
            </span>
            <span className="font-mono text-nx-caption">
              <span className="text-nx-text-secondary">
                {t('ledger.itemCount', { count: row.count })}
              </span>
              {row.latest && (
                <span className="text-nx-text-muted"> · {relativeTime(row.latest)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
