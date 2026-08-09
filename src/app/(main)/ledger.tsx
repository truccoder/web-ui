'use client';

import { useMemo } from 'react';
import { Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useRelativeTime } from '@/shared/lib/format';
import { ContributionGraph, useGithubStats, isNotLinked } from '@/features/github';
import { RepProgress, useReputation } from '@/features/reputation';
import { useRoadmapProgress } from '@/features/roadmap';
import { useMyProfile } from '@/features/security';
import { useTrending } from '@/features/trending';

/**
 * The shell's right flank — the ledger.
 *
 * IT IS THE ONE REGION WITH NO CARD IN IT, and that is a rule rather than an oversight
 * (`handoff/layout-r7.md` §5.1). A card is a raised object on the ground; the ledger is *ground*,
 * and putting cards in it would make the flank a column of floating boxes competing with the feed
 * beside it. Sections are separated by space and an overline, nothing else.
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
      className="sticky top-nx-topbar hidden h-[calc(100dvh-var(--spacing-nx-topbar))] w-[var(--spacing-nx-ledger-sm)] shrink-0 flex-col gap-[22px] overflow-y-auto pt-4 pr-6 pb-12 xl:flex xl:w-nx-ledger xl:pr-nx-region-gutter"
    >
      <EvidenceSection userId={profile?.id} />
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
      <section className="flex flex-col gap-2">
        <SectionHeading>{t('ledger.evidence')}</SectionHeading>
        <Skeleton lines={2} />
      </section>
    );
  }

  if (!reputation) return null;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>{t('ledger.evidence')}</SectionHeading>

      {/* `nextLevelName` is NOT PASSED, and cannot be: the backend returns `levelName` and
          `nextLevelMin` but no name for the next level, and CLAUDE.md forbids hardcoding the level
          ladder a third time (it already exists in the DS's `REP_LEVELS` and the backend's
          `RepLevel`). So the line reads `Architect · còn 34.098` and stops. Raised as a backend
          request; the day `nextLevelName` arrives, one prop closes it. */}
      <RepProgress reputation={reputation} />

      {calendar && (
        <div className="flex flex-col gap-1">
          {/* 18 weeks at an 11px cell: 18×11 + 17×3 = 249 inside the 300px ledger's 260 drawable,
              and 10px at the 272 step. Fixed count, derived cell — see `ContributionGraph`. */}
          <ContributionGraph calendar={calendar} weeks={18} legend={false} cellSize={11} />
          <p className="text-nx-caption text-nx-text-muted">{t('ledger.recentWeeks')}</p>
        </div>
      )}

      {verified.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {verified.map((row) => (
            <li
              key={row.nodeId}
              className="rounded-nx-full bg-nx-rep-soft px-2 py-0.5 text-nx-caption text-nx-rep-text"
            >
              {row.nodeName}
            </li>
          ))}
        </ul>
      )}
    </section>
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
    <section className="flex flex-col gap-2.5">
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
    </section>
  );
}
