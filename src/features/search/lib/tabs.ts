/**
 * The result tabs, in strip order. `all` is the default and keeps the stacked
 * people/posts/books sections; the rest narrow to one kind.
 *
 * A plain module so `SearchResults` (which owns the tab state) and `SearchFilters` (which
 * switches on it) can share the type without importing each other.
 */
export const SEARCH_TABS = ['all', 'people', 'posts', 'books', 'projects', 'roadmaps'] as const;

export type SearchTab = (typeof SEARCH_TABS)[number];
