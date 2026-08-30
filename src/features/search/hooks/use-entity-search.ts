'use client';

import { useEffect } from 'react';
import { useProjects, type Project } from '@/features/matchmaking';
import { useRoadmaps, type Roadmap } from '@/features/roadmap';
import { foldQuery, matchesQuery } from '../lib/query-match';

/**
 * The Projects and Roadmaps result tabs, filtered on this side.
 *
 * `/v1/api/search` returns people, posts and books and nothing else (`docs/backend-plan.md`
 * B33), so these two tabs run the query against the domains' own list endpoints. That is the
 * same client-side filtering `RoadmapList` already does for its topic control — safe there
 * because `GET /roadmaps` is unpaginated, and the reason the two hooks below are not
 * symmetrical.
 *
 * `enabled` is threaded through so a search for a person does not also walk the whole project
 * board; the roadmap list is a single cached, unpaginated call shared with `/roadmap`, so that
 * one is left to load whenever and only its *filtering* waits on the tab.
 */

/** How many pages of the project board the client filter will pull before it stops looking. */
const MAX_PROJECT_PAGES = 4;
/** `MAX_PAGINATION_PAGE_SIZE` server-side — 4 pages ≈ the 200 newest projects. */
const PROJECT_PAGE_SIZE = 50;

export interface EntitySearchResult<T> {
  items: T[];
  isLoading: boolean;
  isError: boolean;
  /** The list endpoint had more rows than the client filter looked at (Projects only). */
  truncated: boolean;
}

/**
 * Projects whose title, description or a tag contains the query.
 *
 * BOUNDED, AND HONEST ABOUT IT. `GET /projects` is cursor-paged with no server-side search, so
 * this walks the newest few pages and filters what it got. `truncated` is true when the board
 * ran past that window — the tab shows a note so a missing project reads as "not in the recent
 * slice" rather than "does not exist". The real fix is a `q` param on the endpoint (B33).
 */
export function useProjectSearch(query: string, enabled: boolean): EntitySearchResult<Project> {
  const projects = useProjects(PROJECT_PAGE_SIZE, enabled);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, data } = projects;
  const pagesLoaded = data?.pages.length ?? 0;

  useEffect(() => {
    if (!enabled) return;
    if (hasNextPage && !isFetchingNextPage && pagesLoaded < MAX_PROJECT_PAGES) {
      fetchNextPage();
    }
  }, [enabled, hasNextPage, isFetchingNextPage, pagesLoaded, fetchNextPage]);

  const folded = foldQuery(query.trim());
  const all = data?.pages.flatMap((page) => page.items ?? []) ?? [];
  const items = all.filter((project) =>
    matchesQuery(folded, project.title, project.description, ...(project.tags ?? []))
  );

  return {
    items,
    // Still walking the board — the count on the tab would jump as later pages land.
    isLoading: projects.isLoading || (isFetchingNextPage && pagesLoaded < MAX_PROJECT_PAGES),
    isError: projects.isError,
    truncated: Boolean(hasNextPage) && pagesLoaded >= MAX_PROJECT_PAGES,
  };
}

/**
 * Roadmaps whose name or description contains the query.
 *
 * COMPLETE, unlike `useProjectSearch`: `GET /roadmaps` returns every track in one unpaginated
 * response (the seed ships 12), so the filtered list is the whole list and nothing hides behind
 * a page boundary. Node names are not searched — that would be one request per track.
 */
export function useRoadmapSearch(query: string, enabled: boolean): EntitySearchResult<Roadmap> {
  const roadmaps = useRoadmaps();

  const folded = foldQuery(query.trim());
  const items = (enabled ? (roadmaps.data ?? []) : []).filter((roadmap) =>
    matchesQuery(folded, roadmap.name, roadmap.description)
  );

  return {
    items,
    isLoading: enabled && roadmaps.isLoading,
    isError: enabled && roadmaps.isError,
    truncated: false,
  };
}
