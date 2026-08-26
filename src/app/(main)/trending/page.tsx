import { redirect } from 'next/navigation';

/**
 * `/trending` — kept only to forward. The content is a tab now: `/newsfeed?tab=tech`.
 *
 * WHY THE ROUTE SURVIVES AT ALL. It was in the rail, in the ⌘K palette and in `src/middleware.ts`'s
 * guest list for months, so it is in bookmarks and in links people have already sent each other.
 * Deleting the folder would turn every one of those into a 404 to save one file; a redirect turns
 * them into the tab, which is where the reader was trying to go.
 *
 * WHY IT MOVED. The old page answered "what has the crawler found" from a destination of its own,
 * and who got to see that destination depended on who was asking: R4 folded crawled items into the
 * feed's `Tất cả` tab, so a signed-in reader's rail dropped the row and the page survived only in
 * the palette — while a guest's rail PROMOTED it, because it was the only other thing they could
 * open. One surface, two contradictory answers. `/newsfeed`'s own header carries the rest.
 *
 * A SERVER REDIRECT, so the reader never renders a screen that immediately replaces itself. The
 * former page was a heading plus `TrendingList`; the tab renders the same component, filters and
 * all, so nothing was lost in the move. The sibling `layout.tsx` went with it — it existed only to
 * give a client page its browser-tab title, and a route that never renders has no title to set.
 */
export default function TrendingPage() {
  redirect('/newsfeed?tab=tech');
}
